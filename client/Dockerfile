# Multi-stage Dockerfile for the React client (non‑root)
# ----------------------------------------------------------
# Builder stage – install dependencies and create a production build
FROM node:20-alpine AS builder

# Create non‑root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup -u 1000
WORKDIR /app

# Install only production dependencies (skip dev deps)
COPY client/package.json client/package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts && \
    chown -R appuser:appgroup /app

# Copy source and build
COPY client/ ./
RUN npm run build && \
    chown -R appuser:appgroup /app

# ----------------------------------------------------------
# Runtime stage – serve static files with a tiny web server (nginx)
FROM nginx:alpine AS runtime

# Copy non‑root user from builder
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

# Remove default nginx html
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Use non‑root user
USER appuser

# Expose HTTP port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

