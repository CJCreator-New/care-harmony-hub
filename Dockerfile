# Multi-stage build for CareSync Frontend
# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage with Nginx
FROM nginx:1.25-alpine AS production

# Install security updates and curl for health checks
RUN apk add --no-cache curl && \
    apk upgrade --no-cache

# Create non-root user
RUN addgroup -g 1001 -S nginx && \
    adduser -S caresync -u 1001 -G nginx

# Copy built application from builder stage
COPY --from=builder --chown=caresync:nginx /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY --chown=caresync:nginx nginx.conf /etc/nginx/nginx.conf

# Create log directory with proper permissions
RUN mkdir -p /var/log/nginx && \
    chown -R caresync:nginx /var/log/nginx && \
    chown -R caresync:nginx /var/cache/nginx && \
    chown -R caresync:nginx /run

# Switch to non-root user
USER caresync

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]