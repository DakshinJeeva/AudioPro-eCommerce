#!/bin/bash

# Stop script if any command fails
set -e

# Define a local cluster name if yours is not the default 'kind'
CLUSTER_NAME="kind"

echo "🚀 Starting Docker build & Kind loading..."

# 1. User Service
echo "📦 Building user-service..."
docker build -t audiopro-local/user-service:local -f ../../backend/user-service/Dockerfile ../../backend
kind load docker-image audiopro-local/user-service:local --name $CLUSTER_NAME

# 2. Product Service
echo "📦 Building product-service..."
docker build -t audiopro-local/product-service:local -f ../../backend/product-service/Dockerfile ../../backend
kind load docker-image audiopro-local/product-service:local --name $CLUSTER_NAME

# 3. Order Service
echo "📦 Building order-service..."
docker build -t audiopro-local/order-service:local -f ../../backend/order-service/Dockerfile ../../backend
kind load docker-image audiopro-local/order-service:local --name $CLUSTER_NAME

# 4. Cart Service
echo "📦 Building cart-service..."
docker build -t audiopro-local/cart-service:local -f ../../backend/cart-service/Dockerfile ../../backend
kind load docker-image audiopro-local/cart-service:local --name $CLUSTER_NAME

# 5. Payment Service
echo "📦 Building payment-service..."
docker build -t audiopro-local/payment-service:local -f ../../backend/payment-service/Dockerfile ../../backend
kind load docker-image audiopro-local/payment-service:local --name $CLUSTER_NAME

# 6. MCP Service
echo "📦 Building mcp-service..."
docker build -t audiopro-local/mcp-service:local -f ../../backend/mcp-service/Dockerfile ../../backend
kind load docker-image audiopro-local/mcp-service:local --name $CLUSTER_NAME

# 7. Frontend
echo "📦 Building frontend..."
docker build -t audiopro-local/frontend:local -f ../../frontend/Dockerfile ../../frontend
kind load docker-image audiopro-local/frontend:local --name $CLUSTER_NAME

echo "🔄 Restarting deployments to use the updated local images..."
# This forces Kubernetes to recreate the pods instantly with your newly loaded images
kubectl rollout restart deployment/user-service deployment/product-service deployment/order-service deployment/cart-service deployment/payment-service deployment/mcp-service deployment/frontend -n audiopro || echo "⚠️ Some deployments aren't created in the cluster yet. Skipping rollout restart."

echo "✅ All images built, loaded into Kind, and synchronized successfully!"