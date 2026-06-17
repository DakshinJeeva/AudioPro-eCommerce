# ──────────────────────────────────────────────────────────────────────────────
# order-service  |  port 5003
# Build context: backend/
#
# Selective COPY – only what this service actually imports:
#   order-service/             own controllers, models, routes, kafka, server.js
#   middleware-service/        authMiddleware, adminMiddleware
#   user-service/models/       userModel.js  (used by authMiddleware)
#   product-service/models/    productModel.js (used by populate in orderController)
#   utils-service/             sendEmail.js (used by Kafka order consumer)
#   kafka/                     shared Kafka client (order consumer)
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# 1. Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy shared env file so dotenv.config() can read it at /app/.env
COPY .env .env

# 2. Copy only the directories this service needs
COPY order-service/           ./order-service/
COPY middleware-service/      ./middleware-service/
COPY user-service/models/     ./user-service/models/
COPY product-service/models/  ./product-service/models/
COPY utils-service/           ./utils-service/
COPY kafka/                   ./kafka/

EXPOSE 5003

CMD ["node", "order-service/server.js"]
