#!/bin/bash
# Search entries in a burrow by title or summary
# Usage: ./04-search-entries.sh <burrow-url> <search-term>

set -e

if [ $# -lt 2 ]; then
  echo "Usage: $0 <burrow-url> <search-term>"
  echo ""
  echo "Example:"
  echo "  $0 'file://'$(pwd)'/../burrows/docs-burrow' 'getting started'"
  echo "  $0 'https://example.com/docs/' 'api'"
  exit 1
fi

BURROW_URL="${1%/}"
SEARCH_TERM="${2,,}"  # Convert to lowercase

# Colors
BOLD='\033[1m'
RESET='\033[0m'

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

# Search entries
echo "Searching for \"$SEARCH_TERM\" in burrow..."
echo ""

# Use jq to search title and summary fields (case-insensitive)
RESULTS=$(echo "$MANIFEST" | jq \
  --arg search "${SEARCH_TERM}" \
  '.entries[] | select(
    (.title // "" | ascii_downcase | contains($search)) or
    (.summary // "" | ascii_downcase | contains($search)) or
    (.id | ascii_downcase | contains($search))
  )')

if [ -z "$RESULTS" ]; then
  echo "No entries found matching \"$SEARCH_TERM\""
  exit 0
fi

# Display results
RESULT_COUNT=$(echo "$RESULTS" | jq -s 'length')
echo "Found $RESULT_COUNT $([ "$RESULT_COUNT" -eq 1 ] && echo "entry" || echo "entries"):"
echo ""

# Counter for numbering
COUNT=1

echo "$RESULTS" | jq -r '.id' | while read -r id; do
  # Get the full entry
  ENTRY=$(echo "$MANIFEST" | jq --arg id "$id" '.entries[] | select(.id == $id)')

  ENTRY_KIND=$(echo "$ENTRY" | jq -r '.kind // "unknown"')
  ENTRY_TITLE=$(echo "$ENTRY" | jq -r '.title // .id')
  ENTRY_SUMMARY=$(echo "$ENTRY" | jq -r '.summary // ""')
  ENTRY_URI=$(echo "$ENTRY" | jq -r '.uri')

  # Display result
  echo -e "${BOLD}$COUNT. $id [$ENTRY_KIND]${RESET}"
  echo "   Title: $ENTRY_TITLE"
  if [ -n "$ENTRY_SUMMARY" ]; then
    # Truncate long summaries
    if [ ${#ENTRY_SUMMARY} -gt 80 ]; then
      ENTRY_SUMMARY="${ENTRY_SUMMARY:0:77}…"
    fi
    echo "   Summary: $ENTRY_SUMMARY"
  fi
  echo "   URI: $ENTRY_URI"
  echo ""

  COUNT=$((COUNT + 1))
done

echo ""
echo "To fetch an entry, use:"
echo "  ./03-fetch-entry.sh '$BURROW_URL' '<entry-id>'"
echo ""
