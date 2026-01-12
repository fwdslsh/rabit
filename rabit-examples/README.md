# Rabit Examples

This directory contains example burrows, a warren, and a proof-of-concept CLI client demonstrating the Rabit Burrow Traversal (RBT) specification.

## Structure

```
rabit-examples/
├── docker-compose.yml      # Hosts all burrows and warren
├── nginx-cors.conf         # CORS configuration for nginx
├── warren/                  # Registry of burrows
│   ├── .warren.json        # Machine-readable registry
│   └── .warren.md          # Human-readable companion
├── burrows/
│   ├── docs-burrow/        # Documentation example
│   │   ├── .burrow.json    # Burrow manifest
│   │   ├── README.md
│   │   ├── faq.md
│   │   ├── guides/
│   │   │   ├── installation.md
│   │   │   └── configuration.md
│   │   └── api/
│   │       └── overview.md
│   ├── api-burrow/         # API reference example
│   │   ├── .burrow.json
│   │   ├── README.md
│   │   ├── openapi.yaml
│   │   ├── auth.md
│   │   └── endpoints.md
│   └── blog-burrow/        # Blog example
│       ├── .burrow.json
│       ├── README.md
│       └── posts/
│           ├── scaling-million-users.md
│           ├── introducing-acme-2.md
│           └── kubernetes-journey.md
└── client/                  # Bun.js CLI client
    ├── package.json
    ├── types.ts             # TypeScript types for RBT
    ├── rabit.ts             # Client library
    └── cli.ts               # CLI commands
```

## Quick Start

### 1. Start the Burrows and Warren

```bash
docker compose up -d
```

This starts four nginx containers:

| Service | URL | Description |
|---------|-----|-------------|
| Warren | http://localhost:8080 | Registry of all burrows |
| Docs Burrow | http://localhost:8081 | Documentation example |
| API Burrow | http://localhost:8082 | API reference example |
| Blog Burrow | http://localhost:8083 | Engineering blog example |

### 2. Verify the Services

```bash
# Check warren
curl http://localhost:8080/.warren.json | jq .

# Check a burrow
curl http://localhost:8081/.burrow.json | jq .
```

### 3. Use the CLI Client

```bash
cd client
bun install

# List burrows in the warren
bun run cli.ts warren http://localhost:8080

# Show burrow info
bun run cli.ts burrow http://localhost:8081

# List entries
bun run cli.ts entries http://localhost:8081

# Fetch a specific entry
bun run cli.ts fetch http://localhost:8081 readme

# Traverse all entries
bun run cli.ts traverse http://localhost:8082

# Search entries
bun run cli.ts search http://localhost:8083 kubernetes

# Show agent instructions
bun run cli.ts agent-info http://localhost:8081
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `warren <url>` | List all burrows registered in a warren |
| `burrow <url>` | Show burrow manifest metadata |
| `entries <url>` | List all entries in a burrow |
| `fetch <url> <id>` | Fetch and display a specific entry |
| `traverse <url>` | Traverse and fetch all entries (BFS) |
| `search <url> <q>` | Search entries by title/summary |
| `agent-info <url>` | Show agent instructions and hints |

## Example Output

### Listing a Warren

```
$ bun run cli.ts warren http://localhost:8080

Fetching warren: http://localhost:8080

Acme Burrow Registry
Central registry of all Acme documentation and content burrows.
  Version: 0.2
  Updated: 2025-01-15T12:00:00Z
  Burrows: 3

Registered Burrows:

  docs - Acme Documentation
  Official documentation for the Acme Platform including installation guides...
  Tags: documentation, guides, tutorials

  api - Acme API Reference
  Complete API reference with OpenAPI specification...
  Tags: api, reference, openapi

  blog - Acme Engineering Blog
  Technical insights from the Acme Platform engineering team...
  Tags: blog, engineering, architecture
```

### Traversing a Burrow

```
$ bun run cli.ts traverse http://localhost:8082

Traversing: Acme API Reference

✓ readme (text/markdown) - 0.4KB
✓ openapi (application/x-yaml) - 2.1KB
✓ auth (text/markdown) - 1.3KB
✓ endpoints (text/markdown) - 2.0KB

Traversed 4 entries
```

## Stopping the Services

```bash
docker compose down
```

## Notes

- This is a proof-of-concept implementation
- The CLI only supports HTTPS roots (not Git)
- RID verification is not implemented
- Child pagination is not implemented

For a production implementation, see the full RBT specification.
