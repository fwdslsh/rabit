# Rabit Server - Official Docker Image
# Serves burrows and warrens with minimal configuration
#
# Usage:
#   docker run -v ./content:/data/burrow -e RABIT_TITLE="My Docs" rabit-server
#
FROM oven/bun:1-alpine AS builder

WORKDIR /app
COPY scripts/ ./scripts/
COPY templates/ ./templates/

# Verify scripts are valid
RUN bun check scripts/generate-manifest.ts || true

# Production image
FROM nginx:alpine

LABEL org.opencontainers.image.title="Rabit Server"
LABEL org.opencontainers.image.description="Serve Rabit burrows and warrens with zero configuration"
LABEL org.opencontainers.image.version="0.3.0"
LABEL org.opencontainers.image.vendor="Rabit"
LABEL org.opencontainers.image.source="https://github.com/rabit/rabit-server"

# Install Bun runtime for manifest generation
RUN apk add --no-cache curl bash unzip \
    && curl -fsSL https://bun.sh/install | bash \
    && ln -s /root/.bun/bin/bun /usr/local/bin/bun \
    && apk del curl unzip

# Copy scripts and templates
COPY --from=builder /app/scripts /opt/rabit/scripts
COPY --from=builder /app/templates /opt/rabit/templates
COPY scripts/entrypoint.sh /opt/rabit/entrypoint.sh

RUN chmod +x /opt/rabit/entrypoint.sh \
    && chmod +x /opt/rabit/scripts/*.ts 2>/dev/null || true

# Create data directories
RUN mkdir -p /data/burrow /data/warren /var/log/rabit

# Environment variables with defaults
ENV RABIT_MODE="burrow" \
    RABIT_PORT="80" \
    RABIT_TITLE="My Burrow" \
    RABIT_DESCRIPTION="" \
    RABIT_UPDATED="" \
    RABIT_BASE_URL="" \
    RABIT_CORS_ORIGINS="*" \
    RABIT_AUTO_GENERATE="true" \
    RABIT_WATCH="false" \
    RABIT_LOG_LEVEL="info"

# Expose default port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:${RABIT_PORT}/.burrow.json || \
        wget -q --spider http://localhost:${RABIT_PORT}/.warren.json || exit 1

# Volumes for content
VOLUME ["/data/burrow", "/data/warren"]

ENTRYPOINT ["/opt/rabit/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
