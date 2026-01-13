#!/bin/bash
# Search entries by title or summary
# Usage: ./04-search-entries.sh <url> <search-term>

if [ $# -lt 2 ]; then
  echo "Usage: $0 <url> <search-term>"
  exit 1
fi

URL="${1%/}"
TERM="${2,,}"

fetch() {
  if [[ "$1" == file:// ]]; then
    cat "${1#file://}"
  else
    curl -s "$1"
  fi
}

# Fetch and search
(fetch "$URL/.burrow.json" 2>/dev/null || \
 fetch "$URL/burrow.json" 2>/dev/null || \
 fetch "$URL/.well-known/burrow.json" 2>/dev/null) | \
jq -r ".entries[] | select((.title // \"\" | ascii_downcase | contains(\"$TERM\")) or (.summary // \"\" | ascii_downcase | contains(\"$TERM\"))) | \"\(.id)\t\(.title // .uri)\""
