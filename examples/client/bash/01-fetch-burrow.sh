#!/bin/bash
# Fetch and display a burrow manifest
# Usage: ./01-fetch-burrow.sh <burrow-url>

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

# Colors for output
BOLD='\033[1m'
RESET='\033[0m'
DIM='\033[2m'

# Helper function to fetch with discovery algorithm
# Tries: .burrow.json, burrow.json, .well-known/burrow.json
fetch_manifest() {
  local base_url="$1"

  # Try dotfile convention
  if curl -s -f "$base_url/.burrow.json" 2>/dev/null; then
    return 0
  fi

  # Try non-dotfile convention
  if curl -s -f "$base_url/burrow.json" 2>/dev/null; then
    return 0
  fi

  # Try RFC 8615 convention
  if curl -s -f "$base_url/.well-known/burrow.json" 2>/dev/null; then
    return 0
  fi

  return 1
}

# Fetch the burrow manifest
echo "Fetching burrow from: $BURROW_URL"
MANIFEST=$(fetch_manifest "$BURROW_URL")

if [ -z "$MANIFEST" ]; then
  echo "Error: Could not discover burrow at $BURROW_URL" >&2
  echo "Tried: .burrow.json, burrow.json, .well-known/burrow.json" >&2
  exit 1
fi

# Verify it's valid JSON
if ! echo "$MANIFEST" | jq empty 2>/dev/null; then
  echo "Error: Manifest is not valid JSON" >&2
  exit 1
fi

# Extract and display manifest info
TITLE=$(echo "$MANIFEST" | jq -r '.title // "(untitled)"')
DESCRIPTION=$(echo "$MANIFEST" | jq -r '.description // ""')
UPDATED=$(echo "$MANIFEST" | jq -r '.updated // ""')
SPEC_VERSION=$(echo "$MANIFEST" | jq -r '.specVersion // ""')

echo ""
echo -e "${BOLD}Burrow: $TITLE${RESET}"
if [ -n "$DESCRIPTION" ]; then
  echo "Description: $DESCRIPTION"
fi
if [ -n "$UPDATED" ]; then
  echo "Updated: $UPDATED"
fi
if [ -n "$SPEC_VERSION" ]; then
  echo "Spec: $SPEC_VERSION"
fi

# Display entries
ENTRY_COUNT=$(echo "$MANIFEST" | jq '.entries | length')
echo ""
echo -e "${BOLD}Entries ($ENTRY_COUNT):${RESET}"

echo "$MANIFEST" | jq -r '.entries[] |
  @text "\(.title // .id | if length > 0 then . else "(untitled)" end) " +
        "[\(.kind)] " +
        "(\(.uri))"' | while read -r line; do
  # Truncate long lines
  if [ ${#line} -gt 100 ]; then
    echo "  • ${line:0:97}…"
  else
    echo "  • $line"
  fi
done

echo ""
