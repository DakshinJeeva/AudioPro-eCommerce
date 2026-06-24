# ──────────────────────────────────────────────────────────────────────────────
# mcp-service  |  port 5004
# Build context: backend/
#
# Fully decoupled: all data access goes through downstream REST APIs.
# No Mongoose models, no cross-service directory copies needed.
#
# Runtime env vars consumed (set via Kubernetes Secret / ConfigMap):
#   CART_SERVICE_URL        http://cart-service:5005
#   PRODUCT_SERVICE_URL     http://product-service:5002
#   ORDER_SERVICE_URL       http://order-service:5003
#   OPENROUTER_API_KEY      <secret>
#   JWT_SECRET              <secret>
#   MCP_SERVICE_PORT        5004 (optional, default)
#   FRONTEND_URL            http://localhost:5173 (optional)
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# 1. Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# 2. Copy shared env file (fallback for local / non-K8s runs)
COPY .env .env

# 3. Copy only what this service owns — no cross-service imports
COPY mcp-service/ ./mcp-service/
COPY middleware-service/ ./middleware-service/

EXPOSE 5004

CMD ["node", "mcp-service/server.js"]
