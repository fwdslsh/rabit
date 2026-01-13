#!/bin/bash
set -e

# Rabit Nginx Server Entrypoint
# Generates .well-known manifests and symlinks content

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "Starting Rabit Nginx Server v0.3.0"

# Set defaults
export RABIT_TITLE="${RABIT_TITLE:-My Burrow}"
export RABIT_DESCRIPTION="${RABIT_DESCRIPTION:-}"
export RABIT_BASE_URL="${RABIT_BASE_URL:-http://localhost/}"
export RABIT_AUTO_GENERATE="${RABIT_AUTO_GENERATE:-true}"

log "Configuration:"
log "  Title:       $RABIT_TITLE"
log "  Base URL:    $RABIT_BASE_URL"
log "  Auto-gen:    $RABIT_AUTO_GENERATE"

# Ensure directories exist
mkdir -p /usr/share/nginx/html/.well-known

# Symlink content from /data to nginx html root
# This allows user-mounted content to be served
if [ -d /data ]; then
    log "Symlinking content from /data..."
    # Link all files and directories except .well-known
    for item in /data/*; do
        if [ -e "$item" ] && [ "$(basename "$item")" != ".well-known" ]; then
            ln -sf "$item" "/usr/share/nginx/html/$(basename "$item")"
        fi
    done
fi

# Generate .well-known/burrow.json if auto-generate is enabled
if [ "$RABIT_AUTO_GENERATE" = "true" ]; then
    # Check if user provided their own .well-known files
    if [ -f /data/.well-known/burrow.json ]; then
        log "Using user-provided .well-known/burrow.json"
        cp /data/.well-known/burrow.json /usr/share/nginx/html/.well-known/burrow.json
    else
        log "Generating .well-known/burrow.json..."
        bun run /opt/rabit/scripts/generate-wellknown.ts
    fi

    # Also copy/generate burrow.md if it exists
    if [ -f /data/.well-known/burrow.md ]; then
        log "Using user-provided .well-known/burrow.md"
        cp /data/.well-known/burrow.md /usr/share/nginx/html/.well-known/burrow.md
    fi
else
    log "Auto-generation disabled"
    # Still copy user-provided files if they exist
    if [ -d /data/.well-known ]; then
        cp -r /data/.well-known/* /usr/share/nginx/html/.well-known/ 2>/dev/null || true
    fi
fi

log "Starting nginx..."

# Execute the CMD (nginx)
exec "$@"
