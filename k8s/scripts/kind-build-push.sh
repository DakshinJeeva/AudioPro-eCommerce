#!/bin/bash

# Stop script if any command fails
set -e

# Define a local cluster name if yours is not the default 'kind'
CLUSTER_NAME="kind"

echo "🚀 Starting Docker build & Kind loading..."

# 1. User Service
echo "📦 Building user-service..."
docker build -t audiopro/user-service:local -f ../../backend/user-service/Dockerfile ../../backend
kind load docker-image audiopro/user-service:local --name $CLUSTER_NAME

# 2. Product Service
echo "📦 Building product-service..."
docker build -t audiopro/product-service:local -f ../../backend/product-service/Dockerfile ../../backend
kind load docker-image audiopro/product-service:local --name $CLUSTER_NAME

# 3. Order Service
echo "📦 Building order-service..."
docker build -t audiopro/order-service:local -f ../../backend/order-service/Dockerfile ../../backend
kind load docker-image audiopro/order-service:local --name $CLUSTER_NAME

# 4. MCP Service
echo "📦 Building mcp-service..."
docker build -t audiopro/mcp-service:local -f ../../backend/mcp-service/Dockerfile ../../backend
kind load docker-image audiopro/mcp-service:local --name $CLUSTER_NAME

# 5. Frontend
echo "📦 Building frontend..."
docker build -t audiopro/frontend:local -f ../../frontend/Dockerfile ../../frontend
kind load docker-image audiopro/frontend:local --name $CLUSTER_NAME

echo "🔄 Restarting deployments to use the updated local images..."
# This forces Kubernetes to recreate the pods instantly with your newly loaded images
kubectl rollout restart deployment/user-service deployment/product-service deployment/order-service deployment/mcp-service deployment/frontend -n audiopro || echo "⚠️ Some deployments aren't created in the cluster yet. Skipping rollout restart."

echo "✅ All images built, loaded into Kind, and synchronized successfully!"