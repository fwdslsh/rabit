# Rabit Nginx Server - Official Docker Image
# Serves burrows and warrens via HTTP using .well-known directory convention
#
# Usage:
#   docker run -d -p 8080:80 -v ./content:/data:ro -e RABIT_TITLE="My Docs" fwdslsh/rabit-server-nginx
#
FROM oven/bun:1-alpine AS builder

WORKDIR /app
COPY scripts/ ./scripts/

# Verify scripts are valid
RUN bun check scripts/generate-wellknown.ts || true

# Production image
FROM nginx:alpine

LABEL org.opencontainers.image.title="Rabit Nginx Server"
LABEL org.opencontainers.image.description="Serve Rabit burrows via nginx with .well-known convention"
LABEL org.opencontainers.image.version="0.3.0"
LABEL org.opencontainers.image.vendor="fwdslsh"
LABEL org.opencontainers.image.source="https://github.com/fwdslsh/rabit"
LABEL org.opencontainers.image.documentation="https://github.com/fwdslsh/rabit/tree/main/packages/rabit-server/nginx"

# Install Bun runtime for manifest generation
RUN apk add --no-cache curl bash unzip \
    && curl -fsSL https://bun.sh/install | bash \
    && ln -s /root/.bun/bin/bun /usr/local/bin/bun \
    && apk del curl unzip

# Copy scripts
COPY --from=builder /app/scripts /opt/rabit/scripts
COPY scripts/entrypoint.sh /opt/rabit/entrypoint.sh

RUN chmod +x /opt/rabit/entrypoint.sh \
    && chmod +x /opt/rabit/scripts/*.ts 2>/dev/null || true

# Create directories
RUN mkdir -p /data /usr/share/nginx/html/.well-known

# Simple nginx config - serve static files with CORS
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;

    # CORS headers
    add_header Access-Control-Allow-Origin * always;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;

    # Serve .well-known JSON files
    location ~ ^/.well-known/.*\.json$ {
        default_type application/json;
    }

    # Serve .well-known markdown files
    location ~ ^/.well-known/.*\.md$ {
        default_type text/markdown;
    }

    # Serve markdown files
    location ~ \.md$ {
        default_type text/markdown;
    }

    # Health check
    location /health {
        access_log off;
        return 200 '{"status":"healthy"}';
        add_header Content-Type application/json;
    }
}
EOF

# Environment variables with defaults
ENV RABIT_TITLE="My Burrow" \
    RABIT_DESCRIPTION="" \
    RABIT_BASE_URL="" \
    RABIT_AUTO_GENERATE="true"

# Expose default port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost/health || exit 1

# Note: No VOLUME directive - users mount with -v flag
# Declaring VOLUME here prevents bind mounts from working

ENTRYPOINT ["/opt/rabit/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
