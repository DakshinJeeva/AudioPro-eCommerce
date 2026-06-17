# ──────────────────────────────────────────────────────────────────────────────
# cart-service  |  port 5005
# Build context: backend/
#
# Selective COPY – only what this service actually imports:
#   cart-service/              own controllers, models, routes, kafka, server.js
#   middleware-service/        authMiddleware, internalMiddleware
#   user-service/models/       userModel.js  (used by authMiddleware)
#   product-service/models/    productModel.js (used by cartService)
#   kafka/                     shared Kafka client + producer
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# 1. Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy shared env file so dotenv.config() can read it at /app/.env
COPY .env .env

# 2. Copy only the directories this service needs
COPY cart-service/               ./cart-service/
COPY middleware-service/         ./middleware-service/
COPY user-service/models/        ./user-service/models/
COPY product-service/models/     ./product-service/models/
COPY kafka/                      ./kafka/

EXPOSE 5005

CMD ["node", "cart-service/server.js"]
