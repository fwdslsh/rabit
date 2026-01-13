#!/bin/bash
set -e

# Rabit Server Entrypoint
# Configures nginx and generates manifests based on environment variables

log() {
    local level="$1"
    shift
    if [[ "$RABIT_LOG_LEVEL" != "error" ]] || [[ "$level" == "ERROR" ]]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*"
    fi
}

log "INFO" "Starting Rabit Server v0.3.0"
log "INFO" "Mode: $RABIT_MODE"

# Set default updated timestamp if not provided
if [[ -z "$RABIT_UPDATED" ]]; then
    export RABIT_UPDATED=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
fi

# Detect base URL if not set
if [[ -z "$RABIT_BASE_URL" ]]; then
    export RABIT_BASE_URL="http://localhost:${RABIT_PORT}/"
fi

# Generate nginx configuration
generate_nginx_config() {
    log "INFO" "Generating nginx configuration..."
    
    cat > /etc/nginx/conf.d/default.conf << NGINX_EOF
server {
    listen ${RABIT_PORT};
    server_name _;
    
    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log ${RABIT_LOG_LEVEL};

    # CORS headers
    add_header 'Access-Control-Allow-Origin' '${RABIT_CORS_ORIGINS}' always;
    add_header 'Access-Control-Allow-Methods' 'GET, HEAD, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Origin, Content-Type, Accept, Authorization' always;
    add_header 'Access-Control-Max-Age' '86400' always;

    # Handle preflight requests
    if (\$request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '${RABIT_CORS_ORIGINS}' always;
        add_header 'Access-Control-Allow-Methods' 'GET, HEAD, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Origin, Content-Type, Accept, Authorization' always;
        add_header 'Access-Control-Max-Age' '86400' always;
        add_header 'Content-Length' '0';
        add_header 'Content-Type' 'text/plain';
        return 204;
    }

NGINX_EOF

    case "$RABIT_MODE" in
        burrow)
            cat >> /etc/nginx/conf.d/default.conf << 'NGINX_EOF'
    # Serve burrow content
    root /data/burrow;
    index README.md index.html;

    # Burrow manifest
    location = /.burrow.json {
        default_type application/json;
        add_header 'Content-Type' 'application/json; charset=utf-8' always;
        add_header 'Access-Control-Allow-Origin' '${RABIT_CORS_ORIGINS}' always;
        add_header 'Cache-Control' 'public, max-age=60' always;
    }
NGINX_EOF
            ;;
        warren)
            cat >> /etc/nginx/conf.d/default.conf << 'NGINX_EOF'
    # Serve warren content
    root /data/warren;
    index .warren.md index.html;

    # Warren manifest
    location = /.warren.json {
        default_type application/json;
        add_header 'Content-Type' 'application/json; charset=utf-8' always;
        add_header 'Access-Control-Allow-Origin' '${RABIT_CORS_ORIGINS}' always;
        add_header 'Cache-Control' 'public, max-age=60' always;
    }

    location = /.warren.md {
        default_type text/markdown;
        add_header 'Content-Type' 'text/markdown; charset=utf-8' always;
        add_header 'Access-Control-Allow-Origin' '${RABIT_CORS_ORIGINS}' always;
    }
NGINX_EOF
            ;;
        both)
            cat >> /etc/nginx/conf.d/default.conf << 'NGINX_EOF'
    # Serve both burrow and warren
    
    # Warren at root
    location = /.warren.json {
        alias /data/warren/.warren.json;
        default_type application/json;
        add_header 'Content-Type' 'application/json; charset=utf-8' always;
        add_header 'Access-Control-Allow-Origin' '${RABIT_CORS_ORIGINS}' always;
    }

    location = /.warren.md {
        alias /data/warren/.warren.md;
        default_type text/markdown;
        add_header 'Content-Type' 'text/markdown; charset=utf-8' always;
        add_header 'Access-Control-Allow-Origin' '${RABIT_CORS_ORIGINS}' always;
    }

    # Burrow content
    location /burrow/ {
        alias /data/burrow/;
        
        location ~ \.burrow\.json$ {
            default_type application/json;
            add_header 'Content-Type' 'application/json; charset=utf-8' always;
            add_header 'Access-Control-Allow-Origin' '${RABIT_CORS_ORIGINS}' always;
        }
    }

    # Default to warren
    location / {
        root /data/warren;
    }
NGINX_EOF
            ;;
    esac

    # Common location blocks
    cat >> /etc/nginx/conf.d/default.conf << 'NGINX_EOF'

    # Markdown files
    location ~ \.md$ {
        default_type text/markdown;
        add_header 'Content-Type' 'text/markdown; charset=utf-8' always;
        add_header 'Access-Control-Allow-Origin' '${RABIT_CORS_ORIGINS}' always;
    }

    # YAML files
    location ~ \.(yaml|yml)$ {
        default_type application/x-yaml;
        add_header 'Content-Type' 'application/x-yaml; charset=utf-8' always;
        add_header 'Access-Control-Allow-Origin' '${RABIT_CORS_ORIGINS}' always;
    }

    # JSON files
    location ~ \.json$ {
        default_type application/json;
        add_header 'Content-Type' 'application/json; charset=utf-8' always;
        add_header 'Access-Control-Allow-Origin' '${RABIT_CORS_ORIGINS}' always;
    }

    # Health check endpoint
    location = /health {
        access_log off;
        add_header 'Content-Type' 'application/json' always;
        return 200 '{"status":"healthy","mode":"${RABIT_MODE}"}';
    }
}
NGINX_EOF

    # Substitute environment variables in nginx config
    envsubst '${RABIT_PORT} ${RABIT_CORS_ORIGINS} ${RABIT_LOG_LEVEL} ${RABIT_MODE}' \
        < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp
    mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf

    log "INFO" "Nginx configuration generated"
}

# Generate manifests if auto-generate is enabled
generate_manifests() {
    if [[ "$RABIT_AUTO_GENERATE" != "true" ]]; then
        log "INFO" "Auto-generation disabled, skipping manifest generation"
        return 0
    fi

    case "$RABIT_MODE" in
        burrow)
            if [[ ! -f /data/burrow/.burrow.json ]]; then
                log "INFO" "Generating .burrow.json..."
                bun run /opt/rabit/scripts/generate-manifest.ts burrow
            else
                log "INFO" "Using existing .burrow.json"
            fi
            ;;
        warren)
            if [[ ! -f /data/warren/.warren.json ]]; then
                log "INFO" "Generating .warren.json..."
                bun run /opt/rabit/scripts/generate-manifest.ts warren
            else
                log "INFO" "Using existing .warren.json"
            fi
            ;;
        both)
            if [[ ! -f /data/burrow/.burrow.json ]]; then
                log "INFO" "Generating .burrow.json..."
                bun run /opt/rabit/scripts/generate-manifest.ts burrow
            fi
            if [[ ! -f /data/warren/.warren.json ]]; then
                log "INFO" "Generating .warren.json..."
                bun run /opt/rabit/scripts/generate-manifest.ts warren
            fi
            ;;
    esac
}

# Validate configuration
validate_config() {
    case "$RABIT_MODE" in
        burrow|warren|both)
            ;;
        *)
            log "ERROR" "Invalid RABIT_MODE: $RABIT_MODE (must be: burrow, warren, or both)"
            exit 1
            ;;
    esac

    if [[ "$RABIT_MODE" == "burrow" || "$RABIT_MODE" == "both" ]]; then
        if [[ ! -d /data/burrow ]]; then
            log "ERROR" "Burrow directory /data/burrow does not exist"
            exit 1
        fi
    fi

    if [[ "$RABIT_MODE" == "warren" || "$RABIT_MODE" == "both" ]]; then
        if [[ ! -d /data/warren ]]; then
            log "ERROR" "Warren directory /data/warren does not exist"
            exit 1
        fi
    fi
}

# Print configuration summary
print_config() {
    log "INFO" "Configuration:"
    log "INFO" "  Mode:        $RABIT_MODE"
    log "INFO" "  Port:        $RABIT_PORT"
    log "INFO" "  Title:       $RABIT_TITLE"
    log "INFO" "  Base URL:    $RABIT_BASE_URL"
    log "INFO" "  CORS:        $RABIT_CORS_ORIGINS"
    log "INFO" "  Auto-gen:    $RABIT_AUTO_GENERATE"
}

# Main
validate_config
print_config
generate_nginx_config
generate_manifests

log "INFO" "Starting nginx on port $RABIT_PORT..."

# Execute the CMD
exec "$@"
