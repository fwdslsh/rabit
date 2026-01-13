#!/bin/bash
# Discover a burrow using the Rabit v0.4.0 discovery algorithm
# Tries: .burrow.json, burrow.json, .well-known/burrow.json
# Usage: ./05-discover-burrow.sh <base-url>

set -e

if [ $# -lt 1 ]; then
  echo "Usage: $0 <base-url>"
  echo ""
  echo "Example:"
  echo "  $0 'file://'$(pwd)'/../burrows/docs-burrow'"
  echo "  $0 'https://example.com/docs'"
  echo "  $0 'https://api.example.com'"
  exit 1
fi

BASE_URL="${1%/}"

# Colors
BOLD='\033[1m'
GREEN='\033[32m'
RED='\033[31m'
RESET='\033[0m'
DIM='\033[2m'

echo "Discovering burrow at: $BASE_URL"
echo ""

# Helper function to fetch a file
fetch_file() {
  local url="$1"

  # Handle file:// URLs
  if [[ "$url" =~ ^file:// ]]; then
    local filepath="${url#file://}"
    if [ -f "$filepath" ]; then
      cat "$filepath"
      return 0
    else
      return 1
    fi
  else
    # Handle HTTP(S) URLs
    curl -s -f "$url" 2>/dev/null
    return $?
  fi
}

# Try each convention
CONVENTIONS=(".burrow.json" "burrow.json" ".well-known/burrow.json")
FOUND=0
MANIFEST=""

for CONVENTION in "${CONVENTIONS[@]}"; do
  URL="${BASE_URL}/${CONVENTION}"

  printf "Trying: ${DIM}%s${RESET} " "$CONVENTION"

  if RESPONSE=$(fetch_file "$URL" 2>/dev/null) && echo "$RESPONSE" | jq empty 2>/dev/null; then
    echo -e "${GREEN}✓ Found!${RESET}"
    FOUND=1
    MANIFEST="$RESPONSE"
    break
  else
    echo -e "${RED}✗${RESET}"
  fi
done

if [ $FOUND -eq 0 ]; then
  echo ""
  echo "Error: No burrow found at $BASE_URL" >&2
  echo "Tried all three conventions with no valid response" >&2
  exit 1
fi

# Display burrow information
echo ""
echo -e "${BOLD}Burrow Found!${RESET}"
echo ""

# Extract and display info
TITLE=$(echo "$MANIFEST" | jq -r '.title // "(untitled)"')
DESCRIPTION=$(echo "$MANIFEST" | jq -r '.description // ""')
SPEC_VERSION=$(echo "$MANIFEST" | jq -r '.specVersion // ""')
UPDATED=$(echo "$MANIFEST" | jq -r '.updated // ""')
ENTRY_COUNT=$(echo "$MANIFEST" | jq '.entries | length')

echo "Title: $TITLE"
if [ -n "$DESCRIPTION" ]; then
  echo "Description: $DESCRIPTION"
fi
echo "Spec Version: $SPEC_VERSION"
echo "Entries: $ENTRY_COUNT"
if [ -n "$UPDATED" ]; then
  echo "Updated: $UPDATED"
fi

# Show agent guidance if available
AGENT_CONTEXT=$(echo "$MANIFEST" | jq -r '.agents.context // ""')
AGENT_ENTRYPOINT=$(echo "$MANIFEST" | jq -r '.agents.entryPoint // ""')

if [ -n "$AGENT_CONTEXT" ]; then
  echo ""
  echo -e "${BOLD}Agent Guidance:${RESET}"
  echo "$AGENT_CONTEXT"
  if [ -n "$AGENT_ENTRYPOINT" ]; then
    echo ""
    echo "Recommended entry point: $AGENT_ENTRYPOINT"
  fi
fi

# Show sample entries
echo ""
echo -e "${BOLD}Sample Entries:${RESET}"
echo "$MANIFEST" | jq -r '.entries[] | "\(.id) [\(.kind)] - \(.title // .uri)"' | head -5

echo ""
