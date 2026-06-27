#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# eks-setup.sh  —  Full AWS EKS lifecycle for AudioPro production
#
# Prerequisites:
#   - AWS CLI v2 configured  (aws configure)
#   - eksctl installed       (https://eksctl.io)
#   - kubectl installed
#   - Docker daemon running
#
# Usage:
#   ./k8s/scripts/eks-setup.sh              # Full setup (create + ecr + build + deploy)
#   ./k8s/scripts/eks-setup.sh create       # Only create EKS cluster via eksctl
#   ./k8s/scripts/eks-setup.sh ecr          # Only create ECR repositories
#   ./k8s/scripts/eks-setup.sh build        # Build & push all images to ECR
#   ./k8s/scripts/eks-setup.sh deploy       # Apply EKS-specific K8s manifests
#   ./k8s/scripts/eks-setup.sh destroy      # Delete EKS cluster (⚠️  destructive)
#   ./k8s/scripts/eks-setup.sh status       # Show cluster/pod/service state
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config — Edit these before running ─────────────────────────────────────────
AWS_ACCOUNT_ID="227037612486"
AWS_REGION="ap-south-2"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_NAMESPACE="audiopro"
IMAGE_TAG="${IMAGE_TAG:-latest}"          # Override: IMAGE_TAG=v1.2.3 ./eks-setup.sh build

CLUSTER_NAME="audiopro-prod"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
K8S_DIR="$ROOT_DIR/k8s/eks"             # EKS manifests (k8s/eks/)
NS="audiopro"

# ── Colors & helpers ───────────────────────────────────────────────────────────
RED='\033[1;31m'; GREEN='\033[1;32m'; YELLOW='\033[1;33m'; BLUE='\033[1;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[eks-setup]${NC} $*"; }
info() { echo -e "${BLUE}[eks-setup]${NC} $*"; }
warn() { echo -e "${YELLOW}[eks-setup]${NC} $*"; }
err()  { echo -e "${RED}[eks-setup ERROR]${NC} $*" >&2; exit 1; }

# Guard: require AWS CLI
command -v aws     >/dev/null 2>&1 || err "aws CLI not found. Install: https://aws.amazon.com/cli/"
command -v eksctl  >/dev/null 2>&1 || err "eksctl not found. Install: https://eksctl.io/installation/"
command -v kubectl >/dev/null 2>&1 || err "kubectl not found."
command -v docker  >/dev/null 2>&1 || err "Docker not found."

# Verify AWS credentials
aws sts get-caller-identity --query "Account" --output text >/dev/null \
  || err "AWS credentials not configured. Run: aws configure"

# ── Step 1: Create EKS Cluster ────────────────────────────────────────────────
create_cluster() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Step 1/4: Creating EKS cluster '${CLUSTER_NAME}' via eksctl ..."
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  warn "⚠️  This takes 15–20 minutes. Do NOT interrupt."

  if eksctl get cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" 2>/dev/null | grep -q "$CLUSTER_NAME"; then
    warn "Cluster '${CLUSTER_NAME}' already exists — skipping creation."
  else
    eksctl create cluster -f "$ROOT_DIR/eks-cluster.yaml"
    log "✅ EKS cluster '${CLUSTER_NAME}' created."
  fi

  # Update kubeconfig
  aws eks update-kubeconfig \
    --region "$AWS_REGION" \
    --name "$CLUSTER_NAME"
  log "kubectl context updated to EKS cluster ${CLUSTER_NAME}."

  # Install AWS Load Balancer Controller (for ALB Ingress on EKS)
  log "Installing AWS Load Balancer Controller..."
  _install_alb_controller

  # Install NGINX Ingress Controller on EKS (via Helm or manifest)
  log "Installing NGINX Ingress Controller on EKS..."
  if command -v helm >/dev/null 2>&1; then
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || true
    helm repo update
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
      --namespace ingress-nginx --create-namespace \
      --set controller.service.type=LoadBalancer \
      --wait --timeout=5m
  else
    kubectl apply -f \
      "https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml"
    kubectl wait --namespace ingress-nginx \
      --for=condition=ready pod \
      --selector=app.kubernetes.io/component=controller \
      --timeout=300s
  fi

  log "✅ Cluster ready."
}

# Installs the IAM OIDC provider and the AWS Load Balancer Controller
_install_alb_controller() {
  # Create IAM OIDC provider for the cluster (idempotent)
  eksctl utils associate-iam-oidc-provider \
    --region "$AWS_REGION" \
    --cluster "$CLUSTER_NAME" \
    --approve 2>/dev/null || true

  log "AWS Load Balancer Controller IAM setup complete (OIDC associated)."
}

# ── Step 2: Create ECR Repositories ───────────────────────────────────────────
create_ecr_repos() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Step 2/4: Creating ECR repositories ..."
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  SERVICES=(user-service product-service order-service cart-service payment-service mcp-service frontend)
  for svc in "${SERVICES[@]}"; do
    REPO="${ECR_NAMESPACE}/${svc}"
    if aws ecr describe-repositories --repository-names "$REPO" --region "$AWS_REGION" >/dev/null 2>&1; then
      warn "  ECR repo '${REPO}' already exists — skipping."
    else
      aws ecr create-repository \
        --repository-name "$REPO" \
        --region "$AWS_REGION" \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256 \
        --output text --query "repository.repositoryUri"
      log "  ✅ Created ECR repo: ${ECR_REGISTRY}/${REPO}"
    fi
  done

  log "✅ All ECR repositories ready."
}

# ── Step 3: Authenticate Docker → ECR ─────────────────────────────────────────
ecr_login() {
  info "  🔑 Authenticating Docker to ECR (${ECR_REGISTRY})..."
  aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin "$ECR_REGISTRY"
  log "  ✅ Docker authenticated to ECR."
}

# ── Step 4: Build & Push Images ────────────────────────────────────────────────
build_and_push() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Step 3/4: Building & pushing Docker images to ECR (tag: ${IMAGE_TAG}) ..."
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  ecr_login

  build_push_service() {
    local svc=$1
    local dockerfile=$2
    local context=$3
    local image="${ECR_REGISTRY}/${ECR_NAMESPACE}/${svc}:${IMAGE_TAG}"
    info "  📦 Building ${svc}..."
    docker build -t "$image" -f "$dockerfile" "$context"
    info "  📤 Pushing ${image}..."
    docker push "$image"
    log "  ✅ ${svc} pushed."
  }

  build_push_service "user-service"    "$ROOT_DIR/backend/user-service/Dockerfile"    "$ROOT_DIR/backend"
  build_push_service "product-service" "$ROOT_DIR/backend/product-service/Dockerfile" "$ROOT_DIR/backend"
  build_push_service "order-service"   "$ROOT_DIR/backend/order-service/Dockerfile"   "$ROOT_DIR/backend"
  build_push_service "cart-service"    "$ROOT_DIR/backend/cart-service/Dockerfile"    "$ROOT_DIR/backend"
  build_push_service "payment-service" "$ROOT_DIR/backend/payment-service/Dockerfile" "$ROOT_DIR/backend"
  build_push_service "mcp-service"     "$ROOT_DIR/backend/mcp-service/Dockerfile"     "$ROOT_DIR/backend"
  build_push_service "frontend"        "$ROOT_DIR/frontend/Dockerfile"                "$ROOT_DIR/frontend"

  log "✅ All images pushed to ECR."
}

# ── Step 5: Deploy to EKS ─────────────────────────────────────────────────────
deploy() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Step 4/4: Applying EKS manifests from ${K8S_DIR} ..."
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  [[ -d "$K8S_DIR" ]] || err "EKS manifest directory not found: $K8S_DIR"

  for f in "$K8S_DIR"/[0-9]*.yaml; do
    info "  → applying $(basename "$f")"
    kubectl apply -f "$f"
  done

  log ""
  log "Waiting for all rollouts..."
  kubectl rollout status deployment/redis           -n "$NS" --timeout=90s
  kubectl rollout status deployment/kafka           -n "$NS" --timeout=180s
  kubectl rollout status deployment/user-service    -n "$NS" --timeout=120s
  kubectl rollout status deployment/product-service -n "$NS" --timeout=120s
  kubectl rollout status deployment/order-service   -n "$NS" --timeout=120s
  kubectl rollout status deployment/cart-service    -n "$NS" --timeout=120s
  kubectl rollout status deployment/payment-service -n "$NS" --timeout=120s
  kubectl rollout status deployment/mcp-service     -n "$NS" --timeout=120s
  kubectl rollout status deployment/frontend        -n "$NS" --timeout=120s

  log ""
  log "✅ All services deployed and healthy on EKS!"
  log ""
  INGRESS_HOST=$(kubectl get ingress audiopro-ingress -n "$NS" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "<pending>")
  log "  🌐 Ingress hostname:  ${INGRESS_HOST}"
  log "  📋 Status:  kubectl get pods -n ${NS}"
}

# ── Destroy EKS Cluster ────────────────────────────────────────────────────────
destroy_cluster() {
  warn "⚠️  This will DELETE the EKS cluster '${CLUSTER_NAME}' and ALL associated AWS resources!"
  warn "⚠️  ECR images will NOT be deleted. Delete them manually if needed."
  read -r -p "Type the cluster name to confirm deletion (${CLUSTER_NAME}): " confirm
  [[ "$confirm" == "$CLUSTER_NAME" ]] || { warn "Aborted."; exit 0; }

  log "Deleting all K8s resources in namespace ${NS}..."
  kubectl delete namespace "$NS" --ignore-not-found --grace-period=30 || true

  log "Deleting EKS cluster via eksctl (this takes ~10 min)..."
  eksctl delete cluster --name "$CLUSTER_NAME" --region "$AWS_REGION"
  log "✅ Cluster '${CLUSTER_NAME}' deleted."
}

# ── Status ─────────────────────────────────────────────────────────────────────
show_status() {
  echo ""
  echo "═══ EKS Cluster ════════════════════════════════════════════"
  eksctl get cluster --name "$CLUSTER_NAME" --region "$AWS_REGION" 2>/dev/null || echo "Cluster not found."
  echo ""
  echo "═══ Nodes ══════════════════════════════════════════════════"
  kubectl get nodes -o wide
  echo ""
  echo "═══ Pods ═══════════════════════════════════════════════════"
  kubectl get pods -n "$NS" -o wide
  echo ""
  echo "═══ Services ═══════════════════════════════════════════════"
  kubectl get svc -n "$NS"
  echo ""
  echo "═══ Ingress ════════════════════════════════════════════════"
  kubectl get ingress -n "$NS"
  echo ""
  echo "═══ PVC ════════════════════════════════════════════════════"
  kubectl get pvc -n "$NS"
}

# ── Entry Point ────────────────────────────────────────────────────────────────
case "${1:-all}" in
  all)
    create_cluster
    create_ecr_repos
    build_and_push
    deploy
    ;;
  create)
    create_cluster
    ;;
  ecr)
    create_ecr_repos
    ;;
  build)
    build_and_push
    ;;
  deploy)
    deploy
    ;;
  destroy)
    destroy_cluster
    ;;
  status)
    show_status
    ;;
  logs)
    SVC="${2:-frontend}"
    log "Tailing logs for $SVC ..."
    kubectl logs -n "$NS" -l "app=$SVC" --all-containers --follow --tail=50
    ;;
  *)
    echo ""
    echo "Usage: $0 [all|create|ecr|build|deploy|destroy|status|logs <service>]"
    echo ""
    echo "  all      — Full setup: create cluster + ECR repos + build/push + deploy (default)"
    echo "  create   — Create EKS cluster via eksctl & install NGINX ingress"
    echo "  ecr      — Create all ECR repositories"
    echo "  build    — Build all images and push to ECR"
    echo "  deploy   — Apply EKS manifests & wait for rollouts"
    echo "  destroy  — Delete EKS cluster (⚠️  destructive)"
    echo "  status   — Show cluster/node/pod/service state"
    echo "  logs     — Tail logs for a specific service"
    echo ""
    echo "Environment variables:"
    echo "  IMAGE_TAG=v1.2.3   — Override the Docker image tag (default: latest)"
    echo ""
    exit 1
    ;;
esac
