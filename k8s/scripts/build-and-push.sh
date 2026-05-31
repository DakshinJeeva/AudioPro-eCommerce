#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# build-and-push.sh
# Builds all Docker images and pushes them to a registry.
#
# Usage:
#   REGISTRY=docker.io/your-dockerhub-username ./k8s/scripts/build-and-push.sh
#   REGISTRY=gcr.io/your-gcp-project          ./k8s/scripts/build-and-push.sh
#   REGISTRY=your-account.dkr.ecr.us-east-1.amazonaws.com ./k8s/scripts/build-and-push.sh
#
# For minikube (no registry needed):
#   eval $(minikube docker-env)
#   ./k8s/scripts/build-and-push.sh --minikube
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REGISTRY="${REGISTRY:-audiopro}"
TAG="${TAG:-latest}"
MINIKUBE="${1:-}"
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

log() { echo -e "\033[1;36m[build-and-push]\033[0m $*"; }

declare -A SERVICES=(
  ["user-service"]="backend user-service/Dockerfile"
  ["product-service"]="backend product-service/Dockerfile"
  ["order-service"]="backend order-service/Dockerfile"
  ["mcp-service"]="backend mcp-service/Dockerfile"
  ["frontend"]="frontend Dockerfile"
)

for name in "${!SERVICES[@]}"; do
  read -r ctx_dir dockerfile <<< "${SERVICES[$name]}"
  image="${REGISTRY}/${name}:${TAG}"
  log "Building  → $image  (context: $ctx_dir, dockerfile: $dockerfile)"
  docker build \
    -t "$image" \
    -f "${PROJECT_ROOT}/${ctx_dir}/${dockerfile}" \
    "${PROJECT_ROOT}/${ctx_dir}"

  if [[ "$MINIKUBE" != "--minikube" ]]; then
    log "Pushing   → $image"
    docker push "$image"
  fi
done

log "✅ All images built${MINIKUBE:+ (minikube local mode, skipped push)}."

# ── Patch image names in manifests ───────────────────────────────────────────
log "Patching image references in k8s manifests..."
for name in user-service product-service order-service mcp-service frontend; do
  manifest_image="${REGISTRY}/${name}:${TAG}"
  # Use kubectl set image or sed — sed is simpler here
  find "${PROJECT_ROOT}/k8s" -name "*.yaml" -exec \
    sed -i "s|audiopro/${name}:latest|${manifest_image}|g" {} \;
done

log "Done! Run: kubectl apply -f ${PROJECT_ROOT}/k8s/"
