# Multi-stage Dockerfile for the Express API server (non‑root)
# -----------------------------------------------------------------
# Builder stage – install only production dependencies
FROM node:20-alpine AS builder

# Create a non‑root user (uid 1000) and set working directory
RUN addgroup -S appgroup && adduser -S appuser -G appgroup -u 1000
WORKDIR /app

# Install only production dependencies (skip dev deps)
COPY server/package.json server/package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts && \
    chown -R appuser:appgroup /app

# Copy the source code (excluding dev files via .dockerignore)
COPY server/ ./

# -----------------------------------------------------------------
# Runtime stage – run as non‑root user
FROM node:20-alpine AS runtime

# Copy the non‑root user from builder
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group
COPY --from=builder /app /app

# Use the non‑root user
USER appuser
WORKDIR /app

# Expose the port the server listens on (default 3000)
EXPOSE 3000

# Start the server
CMD ["node", "src/server.js"]

