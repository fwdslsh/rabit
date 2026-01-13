#!/bin/bash
# Rabit CLI - Simple bash client using curl and jq
# Usage: ./rabit.sh <command> <url> [args...]

set -e

fetch() {
  if [[ "$1" == file:// ]]; then
    cat "${1#file://}"
  else
    curl -s "$1"
  fi
}

get_burrow() {
  fetch "$1/.burrow.json" 2>/dev/null || \
  fetch "$1/burrow.json" 2>/dev/null || \
  fetch "$1/.well-known/burrow.json" 2>/dev/null
}

cmd_fetch() {
  local url="${1%/}"
  get_burrow "$url" | jq .
}

cmd_list() {
  local url="${1%/}"
  get_burrow "$url" | jq -r '.entries[] | "\(.id)\t\(.kind)\t\(.title // .uri)"'
}

cmd_get() {
  local url="${1%/}"
  local entry_id="$2"

  local burrow=$(get_burrow "$url")
  local uri=$(echo "$burrow" | jq -r ".entries[] | select(.id == \"$entry_id\") | .uri")

  if [ -z "$uri" ]; then
    echo "Error: Entry '$entry_id' not found" >&2
    exit 1
  fi

  fetch "$url/$uri"
}

cmd_search() {
  local url="${1%/}"
  local term="${2,,}"

  get_burrow "$url" | \
  jq -r ".entries[] | select((.title // \"\" | ascii_downcase | contains(\"$term\")) or (.summary // \"\" | ascii_downcase | contains(\"$term\"))) | \"\(.id)\t\(.title // .uri)\""
}

cmd_discover() {
  local url="${1%/}"

  echo "Discovering at: $url"
  local burrow=$(get_burrow "$url")

  if [ -z "$burrow" ]; then
    echo "No burrow found" >&2
    exit 1
  fi

  echo "$burrow" | jq '{title, entries: (.entries | length)}'
}

case "${1:-help}" in
  fetch)
    cmd_fetch "$2"
    ;;
  list)
    cmd_list "$2"
    ;;
  get)
    cmd_get "$2" "$3"
    ;;
  search)
    cmd_search "$2" "$3"
    ;;
  discover)
    cmd_discover "$2"
    ;;
  *)
    cat <<EOF
Usage: rabit.sh <command> <url> [args]

Commands:
  fetch <url>              - Show burrow manifest
  list <url>               - List entries
  get <url> <entry-id>     - Fetch entry content
  search <url> <term>      - Search entries
  discover <url>           - Discover burrow

Example:
  ./rabit.sh list file://$(pwd)/examples/burrows/docs-burrow
  ./rabit.sh get file://$(pwd)/examples/burrows/docs-burrow readme
  ./rabit.sh search file://$(pwd)/examples/burrows/docs-burrow guide
EOF
    ;;
esac
