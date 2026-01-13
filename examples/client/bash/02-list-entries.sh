#!/bin/bash
# List entries from a burrow
# Usage: ./02-list-entries.sh <url>

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

# Fetch and list entries
(fetch "$URL/.burrow.json" 2>/dev/null || \
 fetch "$URL/burrow.json" 2>/dev/null || \
 fetch "$URL/.well-known/burrow.json" 2>/dev/null) | \
jq -r '.entries[] | "\(.id)\t\(.kind)\t\(.title // .uri)"'
