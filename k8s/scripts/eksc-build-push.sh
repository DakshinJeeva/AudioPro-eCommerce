#!/bin/bash

# Stop script if any command fails
set -e

# Replace with your AWS account ID
ECR_REGISTRY="227037612486.dkr.ecr.us-east-1.amazonaws.com"

echo "🚀 Starting Docker build & push..."

# 1. User Service
echo "📦 Building user-service..."
docker build -t $ECR_REGISTRY/audiopro/user-service:latest -f ../../backend/user-service/Dockerfile ../../backend
docker push $ECR_REGISTRY/audiopro/user-service:latest

# 2. Product Service
echo "📦 Building product-service..."
docker build -t $ECR_REGISTRY/audiopro/product-service:latest -f ../../backend/product-service/Dockerfile ../../backend
docker push $ECR_REGISTRY/audiopro/product-service:latest

# 3. Order Service
echo "📦 Building order-service..."
docker build -t $ECR_REGISTRY/audiopro/order-service:latest -f ../../backend/order-service/Dockerfile ../../backend
docker push $ECR_REGISTRY/audiopro/order-service:latest

# 4. MCP Service
echo "📦 Building mcp-service..."
docker build -t $ECR_REGISTRY/audiopro/mcp-service:latest -f ../../backend/mcp-service/Dockerfile ../../backend
docker push $ECR_REGISTRY/audiopro/mcp-service:latest

# 5. Frontend
echo "📦 Building frontend..."
docker build -t $ECR_REGISTRY/audiopro/frontend:latest -f ../../frontend/Dockerfile ../../frontend
docker push $ECR_REGISTRY/audiopro/frontend:latest

echo "✅ All images built and pushed successfully!"