#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# deploy.sh  —  one-shot deploy / teardown helper
#
# Usage:
#   ./k8s/scripts/deploy.sh up       # Apply all manifests in order
#   ./k8s/scripts/deploy.sh down     # Delete all resources (keeps PVC by default)
#   ./k8s/scripts/deploy.sh status   # Show pod / service / ingress state
#   ./k8s/scripts/deploy.sh logs <service-name>   # Tail logs for a service
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

K8S_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NS="audiopro"

log()  { echo -e "\033[1;32m[deploy]\033[0m $*"; }
err()  { echo -e "\033[1;31m[deploy ERROR]\033[0m $*" >&2; exit 1; }

case "${1:-help}" in
  up)
    log "Applying manifests in $K8S_DIR ..."
    # Apply in numeric order so dependencies come first
    for f in "$K8S_DIR"/[0-9]*.yaml; do
      log "  → kubectl apply -f $(basename "$f")"
      kubectl apply -f "$f"
    done
    log ""
    log "✅ Deployed! Waiting for rollout..."
    kubectl rollout status deployment/redis          -n "$NS" --timeout=90s
    kubectl rollout status deployment/user-service    -n "$NS" --timeout=120s
    kubectl rollout status deployment/product-service -n "$NS" --timeout=120s
    kubectl rollout status deployment/order-service   -n "$NS" --timeout=120s
    kubectl rollout status deployment/mcp-service     -n "$NS" --timeout=120s
    kubectl rollout status deployment/frontend        -n "$NS" --timeout=120s
    log ""
    log "All rollouts complete. Run:  ./k8s/scripts/deploy.sh status"
    ;;

  down)
    log "Tearing down AudioPro from namespace $NS ..."
    kubectl delete -f "$K8S_DIR/" --ignore-not-found \
      --grace-period=10 2>/dev/null || true
    log "⚠️  PVCs 'uploads-pvc' and 'redis-pvc' preserved. To delete them too:"
    log "    kubectl delete pvc uploads-pvc redis-pvc -n $NS"
    ;;

  status)
    echo ""
    echo "═══ Pods ═══════════════════════════════════════════════"
    kubectl get pods -n "$NS" -o wide
    echo ""
    echo "═══ Services ═══════════════════════════════════════════"
    kubectl get svc -n "$NS"
    echo ""
    echo "═══ Ingress ════════════════════════════════════════════"
    kubectl get ingress -n "$NS"
    echo ""
    echo "═══ PVC ════════════════════════════════════════════════"
    kubectl get pvc -n "$NS"
    ;;

  logs)
    SVC="${2:-frontend}"
    log "Tailing logs for $SVC ..."
    kubectl logs -n "$NS" -l "app=$SVC" --all-containers --follow --tail=50
    ;;

  *)
    echo "Usage: $0 {up|down|status|logs <service>}"
    exit 1
    ;;
esac
