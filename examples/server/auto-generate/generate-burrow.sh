#!/bin/bash
# Generate burrow.json from directory structure

set -e

# Configuration from environment
DATA_DIR="${DATA_DIR:-/data}"
BURROW_TITLE="${BURROW_TITLE:-Auto-Generated Burrow}"
BURROW_DESCRIPTION="${BURROW_DESCRIPTION:-Automatically generated burrow from directory contents}"
BURROW_BASE_URI="${BURROW_BASE_URI:-}"
BURROW_MAX_DEPTH="${BURROW_MAX_DEPTH:-3}"
BURROW_INCLUDE_HIDDEN="${BURROW_INCLUDE_HIDDEN:-false}"
BURROW_EXCLUDE_PATTERNS="${BURROW_EXCLUDE_PATTERNS:-node_modules,dist,.git}"

# Convert exclude patterns to array
IFS=',' read -ra EXCLUDE_ARRAY <<< "$BURROW_EXCLUDE_PATTERNS"

# Get current timestamp
UPDATED=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Function to check if path should be excluded
should_exclude() {
    local path="$1"
    local basename=$(basename "$path")

    # Check exclude patterns
    for pattern in "${EXCLUDE_ARRAY[@]}"; do
        if [[ "$basename" == $pattern ]]; then
            return 0
        fi
    done

    # Check hidden files
    if [[ "$BURROW_INCLUDE_HIDDEN" != "true" && "$basename" == .* ]]; then
        return 0
    fi

    return 1
}

# Function to get MIME type
get_mime_type() {
    local file="$1"
    local ext="${file##*.}"

    case "$ext" in
        md|markdown) echo "text/markdown" ;;
        json) echo "application/json" ;;
        yaml|yml) echo "application/x-yaml" ;;
        html|htm) echo "text/html" ;;
        txt) echo "text/plain" ;;
        pdf) echo "application/pdf" ;;
        jpg|jpeg) echo "image/jpeg" ;;
        png) echo "image/png" ;;
        gif) echo "image/gif" ;;
        svg) echo "image/svg+xml" ;;
        js) echo "application/javascript" ;;
        css) echo "text/css" ;;
        xml) echo "application/xml" ;;
        zip) echo "application/zip" ;;
        *) echo "application/octet-stream" ;;
    esac
}

# Function to generate ID from filename
generate_id() {
    local name="$1"
    # Remove extension
    local id="${name%.*}"
    # Convert to lowercase and replace spaces/special chars with hyphens
    id=$(echo "$id" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')
    # Remove leading numbers
    id=$(echo "$id" | sed 's/^[0-9]*-//')
    echo "$id"
}

# Function to get priority
get_priority() {
    local name="$1"
    local is_dir="$2"

    if [[ "$name" =~ ^README ]]; then
        echo 100
    elif [[ "$name" =~ ^index\. ]]; then
        echo 95
    elif [[ "$is_dir" == "true" ]]; then
        echo 70
    else
        echo 80
    fi
}

# Function to scan directory
scan_directory() {
    local dir="$1"
    local depth="$2"
    local entries=""

    if [[ $depth -gt $BURROW_MAX_DEPTH ]]; then
        return
    fi

    # Read directory contents
    while IFS= read -r -d '' item; do
        local rel_path="${item#$DATA_DIR/}"
        local basename=$(basename "$item")

        # Skip if should be excluded
        if should_exclude "$item"; then
            continue
        fi

        local id=$(generate_id "$basename")
        local kind="file"
        local uri="$rel_path"
        local mediaType=""

        if [[ -d "$item" ]]; then
            kind="dir"
            uri="$rel_path/"
        else
            mediaType=$(get_mime_type "$basename")
        fi

        local priority=$(get_priority "$basename" "$([[ -d "$item" ]] && echo true || echo false)")

        # Build entry JSON
        local entry=$(cat <<EOF
{
  "id": "$id",
  "kind": "$kind",
  "uri": "$uri",
  "title": "$basename"$([ -n "$mediaType" ] && echo ",
  \"mediaType\": \"$mediaType\""),
  "priority": $priority
}
EOF
)

        if [[ -n "$entries" ]]; then
            entries="$entries,"
        fi
        entries="$entries$entry"

    done < <(find "$dir" -maxdepth 1 -mindepth 1 -print0 | sort -z)

    echo "$entries"
}

# Generate entries
ENTRIES=$(scan_directory "$DATA_DIR" 1)

# Build burrow JSON
cat <<EOF
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.3.0/burrow",
  "kind": "burrow",
  "title": "$BURROW_TITLE",
  "description": "$BURROW_DESCRIPTION",
  "updated": "$UPDATED"$([ -n "$BURROW_BASE_URI" ] && echo ",
  \"baseUri\": \"$BURROW_BASE_URI\""),
  "entries": [$ENTRIES]
}
EOF
