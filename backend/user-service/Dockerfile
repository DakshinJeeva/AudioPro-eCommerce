# ──────────────────────────────────────────────────────────────────────────────
# user-service  |  port 5001
# Build context: backend/
#
# Selective COPY – only what this service actually imports:
#   user-service/          own controllers, models, routes, server.js
#   middleware-service/    authMiddleware.js  (imports ../user-service/models)
#   utils-service/         generateToken, generateVerificationToken, sendEmail
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# 1. Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy shared env file so dotenv.config() can read it at /app/.env
COPY .env .env

# 2. Copy only the directories this service needs
COPY user-service/       ./user-service/
COPY middleware-service/ ./middleware-service/
COPY utils-service/      ./utils-service/

EXPOSE 5001

CMD ["node", "user-service/server.js"]
