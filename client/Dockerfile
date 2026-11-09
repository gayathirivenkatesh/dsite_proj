# Multi-stage Dockerfile for the React client (non-root)
FROM node:20-alpine AS builder

WORKDIR /app
COPY client/package.json client/package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts
COPY client/ ./
RUN npm run build

FROM nginx:alpine AS runtime

# Set up non-root user and configure nginx for unprivileged port 8080
RUN addgroup -S appgroup && adduser -S appuser -G appgroup -u 1000 && \
    mkdir -p /var/cache/nginx /var/run /var/log/nginx && \
    chown -R appuser:appgroup /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html && \
    chmod -R 755 /var/cache/nginx /var/run /var/log/nginx && \
    sed -i 's/listen       80;/listen 8080;/g' /etc/nginx/conf.d/default.conf && \
    sed -i 's/user  nginx;//g' /etc/nginx/nginx.conf && \
    sed -i 's/\/var\/run\/nginx.pid/\/tmp\/nginx.pid/g' /etc/nginx/nginx.conf

COPY --from=builder --chown=appuser:appgroup /app/dist /usr/share/nginx/html

USER appuser
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
