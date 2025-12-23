# Frontend Dockerfile - SvelteKit with Node adapter
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY packages/frontend/package.json ./packages/frontend/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/frontend ./packages/frontend

# Build SvelteKit
WORKDIR /app/packages/frontend
RUN npm run build

# Production stage - Node.js
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY packages/frontend/package.json packages/frontend/package-lock.json ./packages/frontend/

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/packages/frontend/build ./packages/frontend/build

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "packages/frontend/build/index.js"]
