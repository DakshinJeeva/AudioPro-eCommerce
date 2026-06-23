#!/bin/bash

NAMESPACE="audiopro"

echo "🔍 Fetching logs for all pods in namespace: $NAMESPACE"
echo "====================================================="

# Get all pods
pods=$(kubectl get pods -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}')

for pod in $pods; do
  echo ""
  echo "═══════════════════════════════════════════════"
  echo "📦 POD: $pod"
  echo "═══════════════════════════════════════════════"
  
  # Get container names (handles multi-container pods too)
  containers=$(kubectl get pod $pod -n $NAMESPACE -o jsonpath='{.spec.containers[*].name}')
  
  for container in $containers; do
    echo ""
    echo "🔹 Container: $container"
    echo "-----------------------------------------------"
    
    kubectl logs -n $NAMESPACE $pod -c $container --tail=100
  done
done