#!/bin/bash
# List entries from a burrow in table format
# Usage: ./02-list-entries.sh <burrow-url>

set -e

if [ $# -lt 1 ]; then
  echo "Usage: $0 <burrow-url>"
  echo ""
  echo "Example:"
  echo "  $0 'file://'$(pwd)'/../burrows/docs-burrow'"
  echo "  $0 'https://example.com/docs/'"
  exit 1
fi

BURROW_URL="${1%/}"

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

# Get title for context
TITLE=$(echo "$MANIFEST" | jq -r '.title // "(untitled)"')
echo "Entries in: $TITLE"
echo ""

# Print table header
printf "%-18s %-12s %-30s %s\n" "ID" "KIND" "TITLE" "URI"
printf "%s\n" "────────────────────────────────────────────────────────────────"

# Print entries as table rows
echo "$MANIFEST" | jq -r '.entries[] |
  @text "\(.id // "") " +
        "\(.kind // "") " +
        "\(.title // .id // "") " +
        "\(.uri // "")"' | while read -r id kind title uri; do
  # Truncate long titles
  if [ ${#title} -gt 30 ]; then
    title="${title:0:27}…"
  fi
  # Truncate long URIs
  if [ ${#uri} -gt 40 ]; then
    uri="${uri:0:37}…"
  fi
  printf "%-18s %-12s %-30s %s\n" "$id" "$kind" "$title" "$uri"
done

echo ""
