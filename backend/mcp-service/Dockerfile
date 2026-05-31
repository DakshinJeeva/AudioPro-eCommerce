# ──────────────────────────────────────────────────────────────────────────────
# mcp-service  |  port 5004
# Build context: backend/
#
# Selective COPY – only what this service actually imports:
#   mcp-service/               own server.js, mcp_server.js, openAI_mcp_client.js
#   middleware-service/        authMiddleware.js (used by openAI_mcp_client)
#   order-service/mcp-service/ cartService.js, orderService.js
#   order-service/models/      cartModel.js, orderModel.js
#   user-service/models/       userModel.js  (used by orderService + authMiddleware)
#   product-service/models/    productModel.js (used by cartService + orderService)
#   utils-service/             sendEmail.js (used by orderService)
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# 1. Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy shared env file so dotenv.config() can read it at /app/.env
COPY .env .env

# 2. Copy only the directories this service needs
COPY mcp-service/                    ./mcp-service/
COPY middleware-service/             ./middleware-service/
COPY order-service/mcp-service/      ./order-service/mcp-service/
COPY order-service/models/           ./order-service/models/
COPY user-service/models/            ./user-service/models/
COPY product-service/models/         ./product-service/models/
COPY utils-service/                  ./utils-service/

EXPOSE 5004

CMD ["node", "mcp-service/server.js"]
