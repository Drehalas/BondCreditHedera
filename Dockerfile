# Dockerfile for BondCredit Volatility-Aware Rebalancer

FROM node:20-alpine AS base

# Install dependencies for both root and frontend
WORKDIR /app
COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm install
RUN npm --prefix frontend install

# Copy source
COPY . .

# Build frontend
RUN npm run frontend:build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/src ./src
COPY --from=base /app/server ./server
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/frontend/dist ./frontend/dist

# Expose proxy port (if running with frontend)
EXPOSE 8788

# Default command starts the keeper
CMD ["npm", "start"]
