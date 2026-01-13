# Bash Client Examples

> Simple examples showing how to browse Rabit burrows using standard Unix command-line tools.

These examples demonstrate the **Rabit v0.4.0** specification using only `curl`, `jq`, and standard bash. They're designed for learning and quick interactions. For production use, see the [TypeScript client](../README.md).

## Prerequisites

- `curl` - for HTTP requests
- `jq` - for JSON parsing
- `bash` - shell scripting

Install on macOS:
```bash
brew install curl jq
```

Install on Ubuntu/Debian:
```bash
apt-get install curl jq
```

## Quick Start

All examples take a burrow URL as an argument. Try them with a local burrow:

```bash
# Point to an example burrow
BURROW="file:///$(pwd)/../burrows/docs-burrow"

# Fetch and display the burrow
./01-fetch-burrow.sh "$BURROW"

# List entries
./02-list-entries.sh "$BURROW"

# Fetch an entry
./03-fetch-entry.sh "$BURROW" readme
```

Or with remote burrows (any HTTP(S) URL):

```bash
./01-fetch-burrow.sh "https://example.com/docs/"
```

## Examples

### 1. Fetch Burrow (`01-fetch-burrow.sh`)

**Purpose**: Fetch and display a burrow manifest with human-readable formatting.

**Usage**:
```bash
./01-fetch-burrow.sh <burrow-url>
```

**Output**:
```
Burrow: Documentation Burrow
Description: Documentation menu for agents.
Updated: 2026-01-13T00:00:00Z

Entries:
  • start [file] - Getting Started (quickstart.md)
  • api [burrow] - API Reference (api/)
  • guides [burrow] - Guides (guides/)
```

**What it does**:
- Fetches the `.burrow.json` manifest from the URL
- Displays title, description, and update timestamp
- Lists all entries with their ID, kind, title, and URI

**Learning value**: Shows the discovery algorithm (tries three conventions) and manifest structure.

---

### 2. List Entries (`02-list-entries.sh`)

**Purpose**: Display entries in a formatted table for easy browsing.

**Usage**:
```bash
./02-list-entries.sh <burrow-url>
```

**Output**:
```
ID              KIND       TITLE                URI
────────────────────────────────────────────────────────────────
start           file       Getting Started      quickstart.md
api             burrow     API Reference        api/
guides          burrow     Guides               guides/
```

**What it does**:
- Fetches entries from burrow manifest
- Formats as aligned columns
- Helps navigate burrow structure

**Learning value**: Shows how to extract and filter entry fields using `jq`.

---

### 3. Fetch Entry (`03-fetch-entry.sh`)

**Purpose**: Fetch and display the content of a specific entry.

**Usage**:
```bash
./03-fetch-entry.sh <burrow-url> <entry-id>
```

**Example**:
```bash
./03-fetch-entry.sh "file://$(pwd)/../burrows/docs-burrow" readme
```

**Output**:
```
Entry: readme [file]
Title: Project README
URI: README.md

──── Content ────
# Project Documentation

Welcome to the documentation...
```

**What it does**:
- Finds the entry by ID in the manifest
- Resolves the entry's URI relative to the burrow base
- Fetches and displays the content
- Shows entry metadata (type, size if available)

**Learning value**: Demonstrates URI resolution and content fetching for different entry kinds.

---

### 4. Search Entries (`04-search-entries.sh`)

**Purpose**: Search entries by title or summary text.

**Usage**:
```bash
./04-search-entries.sh <burrow-url> <search-term>
```

**Example**:
```bash
./04-search-entries.sh "file://$(pwd)/../burrows/blog-burrow" "kubernetes"
```

**Output**:
```
Searching for "kubernetes" in burrow...

Found 2 entries:

1. scaling-journey [file]
   Summary: How we scaled Kubernetes to 1M pods
   URI: posts/scaling-kubernetes.md

2. k8s-migration [file]
   Summary: Migrating from VMs to Kubernetes
   URI: posts/k8s-migration.md
```

**What it does**:
- Fetches entries from burrow
- Searches title and summary fields (case-insensitive)
- Displays matching entries with context

**Learning value**: Shows how to filter and search within a burrow using `jq` and `grep`.

---

### 5. Discover Burrow (`05-discover-burrow.sh`)

**Purpose**: Auto-discover a burrow at a location using the discovery algorithm.

**Usage**:
```bash
./05-discover-burrow.sh <base-url>
```

**Example**:
```bash
# Discover at repository root
./05-discover-burrow.sh "file://$(pwd)/.."

# Discover at HTTP location
./05-discover-burrow.sh "https://example.com/docs"
```

**Output**:
```
Discovering burrow at: file://.../docs

Trying: file://.../docs/.burrow.json ✓ Found!
Spec Version: fwdslsh.dev/rabit/schemas/0.4.0/burrow
Title: Documentation Burrow

Entries: 3
```

**What it does**:
- Implements the Rabit v0.4.0 discovery algorithm
- Tries three conventions: `.burrow.json`, `burrow.json`, `.well-known/burrow.json`
- Reports which convention succeeded
- Shows burrow metadata

**Learning value**: Core Rabit concept - how clients discover burrows at a location.

---

## Real-World Use Cases

### Browse a project's documentation

```bash
./02-list-entries.sh "file://$HOME/projects/myapp/docs"
```

### Find relevant API documentation

```bash
./04-search-entries.sh "https://api.example.com/docs" "authentication"
```

### Generate a site navigation menu

```bash
./02-list-entries.sh "https://docs.example.com" | grep '\[file\]'
```

### Follow breadcrumbs through nested burrows

```bash
# Start at root
./02-list-entries.sh "https://example.com"

# Navigate into a sub-burrow
./02-list-entries.sh "https://example.com/api"
```

## Combining with Other Tools

### Pretty-print a burrow manifest

```bash
./01-fetch-burrow.sh "file://$(pwd)/../burrows/docs-burrow" | jq '.entries | length'
```

### Export entry list as CSV

```bash
curl -s "file://$(pwd)/../burrows/docs-burrow/.burrow.json" | \
  jq -r '.entries[] | [.id, .kind, .title, .uri] | @csv'
```

### Count entries by kind

```bash
curl -s "file://$(pwd)/../burrows/docs-burrow/.burrow.json" | \
  jq 'group_by(.kind) | map({(.[0].kind): length}) | add'
```

## Troubleshooting

### `curl: (3) URL using bad/illegal format`

This happens with `file://` URLs. Make sure the path is absolute:
```bash
# Wrong
./01-fetch-burrow.sh "file://./docs"

# Correct
./01-fetch-burrow.sh "file://$(pwd)/docs"
```

### `jq: parse error`

The manifest wasn't valid JSON. Verify the URL is correct and the burrow is accessible:
```bash
curl -v "https://example.com/docs/.burrow.json"
```

### `Entry not found`

Entry ID doesn't exist in the burrow. List entries first:
```bash
./02-list-entries.sh "<burrow-url>"
```

## Limitations

These bash examples are intentionally simple:

- **No caching** - Each request fetches fresh data
- **Basic error handling** - Assumes well-formed burrows
- **Single transport** - Work with HTTP/HTTPS and local files
- **No authentication** - No support for authenticated endpoints
- **Limited query** - Simple text search only

For production use with these features, use the [TypeScript client](../README.md).

## Resources

- **Specification**: [Rabit v0.4.0 Spec](../../../docs/rabit-spec.md)
- **TypeScript Client**: [Full-featured reference implementation](../README.md)
- **Example Burrows**: [Browse local examples](../burrows/)
- **Server Examples**: [Hosting burrows](../server/)
