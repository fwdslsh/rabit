# Rabit Bash Client

Simple bash CLI for browsing Rabit burrows with `curl` and `jq`.

## Usage

```bash
./rabit.sh <command> <url> [args]
```

## Commands

- `fetch <url>` - Display burrow manifest
- `list <url>` - List all entries
- `get <url> <id>` - Fetch entry content
- `search <url> <term>` - Search by title/summary
- `discover <url>` - Discover burrow (discovery algorithm)

## Examples

```bash
# Point to a burrow
URL="file://$(pwd)/../burrows/docs-burrow"

# List entries
./rabit.sh list "$URL"

# Fetch an entry
./rabit.sh get "$URL" readme

# Search
./rabit.sh search "$URL" guide

# Discover
./rabit.sh discover "$URL"

# Show manifest
./rabit.sh fetch "$URL" | jq '.entries | length'
```

## How It Works

Each command implements the Rabit v0.4.0 discovery algorithm (tries `.burrow.json`, `burrow.json`, `.well-known/burrow.json`) and pipes through `jq` for parsing.

Works with both local files (`file://`) and HTTP(S) URLs.
