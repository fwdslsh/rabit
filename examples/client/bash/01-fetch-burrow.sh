#!/bin/bash
# Fetch and display a burrow manifest
# Usage: ./01-fetch-burrow.sh <url>

if [ $# -lt 1 ]; then
  echo "Usage: $0 <url>"
  exit 1
fi

URL="${1%/}"

# Helper: fetch file/URL
fetch() {
  if [[ "$1" == file:// ]]; then
    cat "${1#file://}"
  else
    curl -s "$1"
  fi
}

# Try discovery conventions
fetch "$URL/.burrow.json" 2>/dev/null || \
fetch "$URL/burrow.json" 2>/dev/null || \
fetch "$URL/.well-known/burrow.json" 2>/dev/null | jq .
