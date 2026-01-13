#!/bin/bash
# Fetch a specific entry from a burrow
# Usage: ./03-fetch-entry.sh <burrow-url> <entry-id>

set -e

if [ $# -lt 2 ]; then
  echo "Usage: $0 <burrow-url> <entry-id>"
  echo ""
  echo "Example:"
  echo "  $0 'file://'$(pwd)'/../burrows/docs-burrow' 'readme'"
  echo "  $0 'https://example.com/docs/' 'getting-started'"
  echo ""
  echo "List available entries:"
  echo "  ./02-list-entries.sh '<burrow-url>'"
  exit 1
fi

BURROW_URL="${1%/}"
ENTRY_ID="$2"

# Colors
BOLD='\033[1m'
RESET='\033[0m'
DIM='\033[2m'

# Helper function to fetch with discovery algorithm
fetch_manifest() {
  local base_url="$1"

  if curl -s -f "$base_url/.burrow.json" 2>/dev/null; then
    return 0
  fi

  if curl -s -f "$base_url/burrow.json" 2>/dev/null; then
    return 0
  fi

  if curl -s -f "$base_url/.well-known/burrow.json" 2>/dev/null; then
    return 0
  fi

  return 1
}

# Fetch the manifest
MANIFEST=$(fetch_manifest "$BURROW_URL")

if [ -z "$MANIFEST" ]; then
  echo "Error: Could not discover burrow at $BURROW_URL" >&2
  exit 1
fi

if ! echo "$MANIFEST" | jq empty 2>/dev/null; then
  echo "Error: Manifest is not valid JSON" >&2
  exit 1
fi

# Find entry by ID
ENTRY=$(echo "$MANIFEST" | jq --arg id "$ENTRY_ID" '.entries[] | select(.id == $id)')

if [ -z "$ENTRY" ]; then
  echo "Error: Entry '$ENTRY_ID' not found" >&2
  echo ""
  echo "Available entries:"
  echo "$MANIFEST" | jq -r '.entries[] | "  • \(.id): \(.title // .uri)"' >&2
  exit 1
fi

# Extract entry fields
ENTRY_KIND=$(echo "$ENTRY" | jq -r '.kind // "unknown"')
ENTRY_TITLE=$(echo "$ENTRY" | jq -r '.title // .id')
ENTRY_URI=$(echo "$ENTRY" | jq -r '.uri')
ENTRY_MEDIA_TYPE=$(echo "$ENTRY" | jq -r '.mediaType // ""')
ENTRY_SIZE=$(echo "$ENTRY" | jq -r '.sizeBytes // ""')

# Display entry header
echo -e "${BOLD}Entry: $ENTRY_ID [$ENTRY_KIND]${RESET}"
echo "Title: $ENTRY_TITLE"
echo "URI: $ENTRY_URI"
if [ -n "$ENTRY_MEDIA_TYPE" ]; then
  echo "Media Type: $ENTRY_MEDIA_TYPE"
fi
if [ -n "$ENTRY_SIZE" ]; then
  # Format bytes nicely
  if [ "$ENTRY_SIZE" -lt 1024 ]; then
    SIZE_STR="${ENTRY_SIZE}B"
  elif [ "$ENTRY_SIZE" -lt 1048576 ]; then
    SIZE_STR="$((ENTRY_SIZE / 1024))KB"
  else
    SIZE_STR="$((ENTRY_SIZE / 1048576))MB"
  fi
  echo "Size: $SIZE_STR"
fi

# Build full URI for fetching
# If the entry URI is absolute, use it directly
# If relative, resolve against the burrow base URL
if [[ "$ENTRY_URI" =~ ^(https?|file):// ]]; then
  FETCH_URI="$ENTRY_URI"
else
  FETCH_URI="${BURROW_URL}/${ENTRY_URI}"
fi

# Fetch the entry content
echo ""
echo -e "${DIM}────── Content ──────${RESET}"

CONTENT=$(curl -s -f "$FETCH_URI" 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "Error: Could not fetch entry content from $FETCH_URI" >&2
  exit 1
fi

# Display content
if [[ "$ENTRY_MEDIA_TYPE" == "text/"* ]] || [[ "$ENTRY_MEDIA_TYPE" == "application/json" ]]; then
  # Text content - display as-is
  echo "$CONTENT"
else
  # Binary content - show size and type
  CONTENT_SIZE=$(echo -n "$CONTENT" | wc -c)
  echo "[Binary content: $CONTENT_SIZE bytes, type: $ENTRY_MEDIA_TYPE]"
  echo ""
  echo "To download this file, use:"
  echo "  curl -o output_file '$FETCH_URI'"
fi

echo ""
