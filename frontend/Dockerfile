FROM node:20-alpine

WORKDIR /app

# 1. Install dependencies from package.json only.
#    This layer is cached and only re-runs when package*.json changes.
COPY package*.json ./
RUN npm install

# 2. Copy application source — node_modules is excluded by .dockerignore
#    so the clean install above is never overwritten by the host's copy.
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]