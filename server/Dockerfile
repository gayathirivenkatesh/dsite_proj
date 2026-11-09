# Multi-stage Dockerfile for Express API server (non-root)
FROM node:20-alpine AS builder

WORKDIR /app
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts
COPY server/ ./

FROM node:20-alpine AS runtime

RUN addgroup -S appgroup && adduser -S appuser -G appgroup -u 1000
WORKDIR /app

COPY --from=builder --chown=appuser:appgroup /app /app

USER appuser
EXPOSE 3000

CMD ["node", "src/server.js"]
