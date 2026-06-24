# ──────────────────────────────────────────────────────────────────────────────
# cart-service  |  port 5005
# Build context: backend/
#
# Fully decoupled from product-service — product lookups go through HTTP API.
#
# Directories copied:
#   cart-service/       own controllers, models, routes, kafka, server.js
#   middleware-service/ authMiddleware (JWT verification)
#   user-service/models/userModel.js  (used by authMiddleware)
#   kafka/              shared Kafka client
#
# Runtime env vars:
#   PRODUCT_SERVICE_URL  http://product-service:5002  (default)
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# 1. Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy shared env file (fallback for non-K8s runs)
COPY .env .env

# 2. Copy only what this service needs
COPY cart-service/               ./cart-service/
COPY middleware-service/         ./middleware-service/
COPY user-service/models/        ./user-service/models/
COPY kafka/                      ./kafka/

EXPOSE 5005

CMD ["node", "cart-service/server.js"]
