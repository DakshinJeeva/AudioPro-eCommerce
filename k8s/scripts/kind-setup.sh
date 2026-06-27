#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# kind-setup.sh  —  Full local development lifecycle for AudioPro on Kind
#
# Usage:
#   ./k8s/scripts/kind-setup.sh            # Full setup (create + build + deploy)
#   ./k8s/scripts/kind-setup.sh create     # Only create the Kind cluster
#   ./k8s/scripts/kind-setup.sh build      # Only build & load images into Kind
#   ./k8s/scripts/kind-setup.sh deploy     # Only apply K8s manifests
#   ./k8s/scripts/kind-setup.sh destroy    # Delete the entire Kind cluster
#   ./k8s/scripts/kind-setup.sh status     # Show cluster status
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ─────────────────────────────────────────────────────────────────────
CLUSTER_NAME="kind"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
K8S_DIR="$ROOT_DIR/k8s/kind"
NS="audiopro"

# NGINX Ingress controller manifest for Kind (with hostPort support)
INGRESS_NGINX_URL="https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/kind/deploy.yaml"

# ── Colors & helpers ───────────────────────────────────────────────────────────
RED='\033[1;31m'; GREEN='\033[1;32m'; YELLOW='\033[1;33m'; BLUE='\033[1;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[kind-setup]${NC} $*"; }
info() { echo -e "${BLUE}[kind-setup]${NC} $*"; }
warn() { echo -e "${YELLOW}[kind-setup]${NC} $*"; }
err()  { echo -e "${RED}[kind-setup ERROR]${NC} $*" >&2; exit 1; }

# ── Step 1: Create Kind Cluster ────────────────────────────────────────────────
create_cluster() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Step 1/4: Creating Kind cluster '${CLUSTER_NAME}' ..."
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
    warn "Cluster '${CLUSTER_NAME}' already exists — skipping creation."
  else
    kind create cluster \
      --name "$CLUSTER_NAME" \
      --config "$ROOT_DIR/kind-cluster.yaml" \
      --wait 60s
    log "✅ Kind cluster '${CLUSTER_NAME}' created."
  fi

  # Set kubectl context
  kubectl cluster-info --context "kind-${CLUSTER_NAME}"
  log "kubectl context set to kind-${CLUSTER_NAME}"

  # Install NGINX Ingress controller
  log "Installing NGINX Ingress controller..."
  kubectl apply -f "$INGRESS_NGINX_URL"

  log "Waiting for NGINX Ingress controller to be ready (up to 3 min)..."
  kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=180s || warn "⚠️  Ingress controller not ready yet — continuing anyway."

  # Pre-pull and load Kafka image (required since imagePullPolicy=Never)
  log "Pre-loading Kafka image into Kind (needed for imagePullPolicy: Never)..."
  docker pull apache/kafka:3.9.0 || warn "⚠️  Could not pull apache/kafka:3.9.0"
  kind load docker-image apache/kafka:3.9.0 --name "$CLUSTER_NAME" || warn "⚠️  Kafka image load failed"

  log "✅ Cluster setup complete."
}

# ── Step 2: Build & Load Images ────────────────────────────────────────────────
build_and_load() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Step 2/4: Building Docker images & loading into Kind ..."
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  build_load_service() {
    local svc=$1
    local dockerfile=$2
    local context=$3
    info "  📦 Building ${svc}..."
    docker build -t "audiopro-local/${svc}:local" -f "$dockerfile" "$context"
    info "  📤 Loading audiopro-local/${svc}:local into kind/${CLUSTER_NAME}..."
    kind load docker-image "audiopro-local/${svc}:local" --name "$CLUSTER_NAME"
    log "  ✅ ${svc} ready in cluster."
  }

  build_load_service "user-service"    "$ROOT_DIR/backend/user-service/Dockerfile"    "$ROOT_DIR/backend"
  build_load_service "product-service" "$ROOT_DIR/backend/product-service/Dockerfile" "$ROOT_DIR/backend"
  build_load_service "order-service"   "$ROOT_DIR/backend/order-service/Dockerfile"   "$ROOT_DIR/backend"
  build_load_service "cart-service"    "$ROOT_DIR/backend/cart-service/Dockerfile"    "$ROOT_DIR/backend"
  build_load_service "payment-service" "$ROOT_DIR/backend/payment-service/Dockerfile" "$ROOT_DIR/backend"
  build_load_service "mcp-service"     "$ROOT_DIR/backend/mcp-service/Dockerfile"     "$ROOT_DIR/backend"
  build_load_service "frontend"        "$ROOT_DIR/frontend/Dockerfile"                "$ROOT_DIR/frontend"

  log "✅ All images built and loaded into Kind."
}

# ── Step 3: Deploy Manifests ───────────────────────────────────────────────────
deploy() {
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Step 3/4: Applying Kubernetes manifests ..."
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  for f in "$K8S_DIR"/[0-9]*.yaml; do
    info "  → applying $(basename "$f")"
    kubectl apply -f "$f"
  done

  log ""
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "Step 4/4: Waiting for all rollouts ..."
  log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

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
  log "✅ All services deployed and healthy!"
  log ""
  log "  🌐 Frontend:  http://localhost"
  log "  📋 Status:    kubectl get pods -n ${NS}"
  log "  📜 Logs:      ./k8s/scripts/kind-setup.sh logs <service-name>"
}

# ── Destroy Cluster ────────────────────────────────────────────────────────────
destroy_cluster() {
  warn "⚠️  Deleting Kind cluster '${CLUSTER_NAME}' — all data will be lost!"
  read -r -p "Are you sure? (yes/no): " confirm
  [[ "$confirm" == "yes" ]] || { warn "Aborted."; exit 0; }
  kind delete cluster --name "$CLUSTER_NAME"
  log "✅ Cluster '${CLUSTER_NAME}' deleted."
}

# ── Status ─────────────────────────────────────────────────────────────────────
show_status() {
  echo ""
  echo "═══ Kind Clusters ══════════════════════════════════════════"
  kind get clusters 2>/dev/null || echo "No Kind clusters found."
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
    build_and_load
    deploy
    ;;
  create)
    create_cluster
    ;;
  build)
    build_and_load
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
    echo "Usage: $0 [all|create|build|deploy|destroy|status|logs <service>]"
    echo ""
    echo "  all      — Full setup: create cluster + build images + deploy (default)"
    echo "  create   — Create Kind cluster & install NGINX ingress"
    echo "  build    — Build all Docker images & load into Kind"
    echo "  deploy   — Apply all K8s manifests & wait for rollouts"
    echo "  destroy  — Delete the Kind cluster entirely"
    echo "  status   — Show cluster/pod/service/ingress state"
    echo "  logs     — Tail logs for a specific service"
    echo ""
    exit 1
    ;;
esac
