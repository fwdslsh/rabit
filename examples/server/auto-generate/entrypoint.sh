#!/bin/bash
# Entrypoint script for auto-generate burrow server

set -e

echo "==> Starting Rabit Auto-Generate Server"
echo "    Data directory: ${DATA_DIR:-/data}"
echo "    Title: ${BURROW_TITLE:-Auto-Generated Burrow}"

# Generate initial manifest
echo "==> Generating initial burrow manifest..."
/usr/local/bin/generate-burrow.sh > /tmp/burrow.json

# Start nginx in background
nginx &
NGINX_PID=$!

# Watch for changes and regenerate (simple polling approach)
echo "==> Server ready! Manifest will regenerate every 60 seconds"
while true; do
    sleep 60
    /usr/local/bin/generate-burrow.sh > /tmp/burrow.json 2>/dev/null || true
done &

# Wait for nginx
wait $NGINX_PID
