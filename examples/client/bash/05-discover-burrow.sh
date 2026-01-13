#!/bin/bash
# Discover a burrow using the discovery algorithm
# Usage: ./05-discover-burrow.sh <url>

if [ $# -lt 1 ]; then
  echo "Usage: $0 <url>"
  exit 1
fi

URL="${1%/}"

fetch() {
  if [[ "$1" == file:// ]]; then
    cat "${1#file://}"
  else
    curl -s "$1"
  fi
}

echo "Discovering at: $URL"

# Try all three conventions
BURROW=$(fetch "$URL/.burrow.json" 2>/dev/null || \
         fetch "$URL/burrow.json" 2>/dev/null || \
         fetch "$URL/.well-known/burrow.json" 2>/dev/null)

if [ -z "$BURROW" ]; then
  echo "No burrow found"
  exit 1
fi

# Display summary
echo "$BURROW" | jq '{title, entries: (.entries | length)}'
