# Bash Examples

Simple bash scripts showing how to work with Rabit burrows using `curl` and `jq`.

## Quick Start

```bash
# Point to a burrow
URL="file://$(pwd)/../burrows/docs-burrow"

# List entries
./02-list-entries.sh "$URL"

# Fetch an entry
./03-fetch-entry.sh "$URL" readme

# Search
./04-search-entries.sh "$URL" "guide"

# Discover
./05-discover-burrow.sh "$URL"
```

## Scripts

### 01-fetch-burrow.sh
Fetch and display a burrow manifest.
```bash
./01-fetch-burrow.sh <url>
```
Tries the three discovery conventions: `.burrow.json`, `burrow.json`, `.well-known/burrow.json`.

### 02-list-entries.sh
List all entries in a burrow.
```bash
./02-list-entries.sh <url>
```
Output: `id`, `kind`, `title/uri`

### 03-fetch-entry.sh
Fetch a specific entry's content by ID.
```bash
./03-fetch-entry.sh <url> <entry-id>
```

### 04-search-entries.sh
Search entries by title or summary.
```bash
./04-search-entries.sh <url> <search-term>
```

### 05-discover-burrow.sh
Discover a burrow using the discovery algorithm.
```bash
./05-discover-burrow.sh <url>
```

## Examples

With a local burrow:
```bash
BURROW="file://$(pwd)/../burrows/docs-burrow"
./02-list-entries.sh "$BURROW"
```

With HTTP:
```bash
./01-fetch-burrow.sh "https://example.com/docs/"
```

## Combining with Other Tools

Pretty-print manifest:
```bash
./01-fetch-burrow.sh <url> | jq '.entries | length'
```

Export as CSV:
```bash
./02-list-entries.sh <url> | column -t -s $'\t'
```

Get all markdown files:
```bash
./02-list-entries.sh <url> | grep markdown
```

## Notes

- Each script implements the discovery algorithm (tries all three burrow conventions)
- Use `curl` for HTTP(S) URLs and local file paths
- Use `jq` for JSON parsing and filtering
- No external dependencies beyond bash, curl, and jq
- For production use with authentication/caching, see the [TypeScript client](../README.md)
