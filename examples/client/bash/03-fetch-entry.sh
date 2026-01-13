#!/bin/bash
# Fetch a specific entry from a burrow
# Usage: ./03-fetch-entry.sh <burrow-url> <entry-id>

if [ $# -lt 2 ]; then
  echo "Usage: $0 <url> <entry-id>"
  exit 1
fi

URL="${1%/}"
ENTRY_ID="$2"

fetch() {
  if [[ "$1" == file:// ]]; then
    cat "${1#file://}"
  else
    curl -s "$1"
  fi
}

# Fetch burrow, find entry, extract URI
BURROW=$(fetch "$URL/.burrow.json" 2>/dev/null || \
         fetch "$URL/burrow.json" 2>/dev/null || \
         fetch "$URL/.well-known/burrow.json" 2>/dev/null)

ENTRY_URI=$(echo "$BURROW" | jq -r ".entries[] | select(.id == \"$ENTRY_ID\") | .uri")

if [ -z "$ENTRY_URI" ]; then
  echo "Error: Entry '$ENTRY_ID' not found"
  exit 1
fi

# Fetch and display the entry
fetch "$URL/$ENTRY_URI"
