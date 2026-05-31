# ──────────────────────────────────────────────────────────────────────────────
# product-service  |  port 5002
# Build context: backend/
#
# Selective COPY – only what this service actually imports:
#   product-service/           own controllers, models, routes, server.js
#   middleware-service/        authMiddleware, adminMiddleware
#   user-service/models/       userModel.js  (used by authMiddleware)
#   order-service/models/      orderModel.js (used by ratingController)
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# 1. Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy shared env file so dotenv.config() can read it at /app/.env
COPY .env .env

# 2. Copy only the directories this service needs
COPY product-service/            ./product-service/
COPY middleware-service/         ./middleware-service/
COPY user-service/models/        ./user-service/models/
COPY order-service/models/       ./order-service/models/


EXPOSE 5002

CMD ["node", "product-service/server.js"]
