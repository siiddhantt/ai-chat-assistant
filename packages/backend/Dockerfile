# Backend Dockerfile - Multi-stage build for optimal size and security
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY packages/backend/package.json ./packages/backend/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/backend ./packages/backend

# Build/compile TypeScript
WORKDIR /app/packages/backend
RUN npm run build 2>/dev/null || echo "No build script, skipping..."

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY packages/backend/package.json ./packages/backend/

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/packages/backend ./packages/backend

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

CMD ["sh", "-c", "node packages/backend/dist/migrations/run.js && node packages/backend/dist/src/index.js"]
