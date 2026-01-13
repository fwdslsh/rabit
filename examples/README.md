# Rabit Examples

This directory contains example burrows, a warren, and a proof-of-concept CLI client demonstrating the Rabit Burrow Traversal (RBT) specification.

## File Naming Conventions

Rabit v0.3.0 supports three file naming conventions:
1. **Dotfile** (`.burrow.json`) - Recommended for git/filesystem
2. **Non-dotfile** (`burrow.json`) - Web server friendly
3. **RFC 8615** (`.well-known/burrow.json`) - Enterprise standard

See the [conventions-demo](conventions-demo/) directory for examples and detailed explanations.

## Structure

```
examples/
├── server/
│   ├── ngnix-dotfiles/      # Docker setup for hosting burrows (dotfile convention)
│   │   ├── docker-compose.yml
│   │   └── nginx-cors.conf
│   ├── wellknown-static/    # RFC 8615 .well-known example (zero config)
│   │   ├── docker-compose.yml
│   │   ├── .well-known/burrow.json
│   │   └── sample-document.md
│   ├── auto-generate/       # Dynamic manifest generation (zero setup)
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   ├── generate-burrow.sh
│   │   └── sample-content/
│   └── git-readonly/        # Git server example for burrows
│       ├── docker-compose.yml
│       ├── setup.sh
│       └── config/
├── .warren.json             # Warren (registry) manifest
├── conventions-demo/        # File naming conventions examples
│   ├── burrow.json          # Non-dotfile convention
│   ├── .well-known/
│   │   └── burrow.json      # RFC 8615 convention
│   └── README.md            # Conventions documentation
├── burrows/
│   ├── docs-burrow/        # Documentation example
│   │   ├── .burrow.json    # Burrow manifest
│   │   ├── .burrow.md      # Human-readable companion
│   │   ├── README.md
│   │   ├── LICENSE
│   │   ├── faq.md
│   │   ├── guides/
│   │   │   ├── installation.md
│   │   │   └── configuration.md
│   │   └── api/
│   │       └── overview.md
│   ├── api-burrow/         # API reference example
│   │   ├── .burrow.json
│   │   ├── .burrow.md      # Human-readable companion
│   │   ├── README.md
│   │   ├── openapi.yaml
│   │   ├── auth.md
│   │   └── endpoints.md
│   └── blog-burrow/        # Blog example
│       ├── .burrow.json
│       ├── .burrow.md      # Human-readable companion
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

### Server Examples

The `server/` directory contains multiple approaches for serving burrows:

#### 1. **ngnix-dotfiles** - Traditional dotfile approach
- Uses `.burrow.json` dotfile convention
- Requires nginx configuration for dotfile serving
- Hosts multiple burrows and a warren
- Best for: Git repos, controlled environments

#### 2. **wellknown-static** - RFC 8615 approach
- Uses `.well-known/burrow.json` convention
- **Zero web server configuration** needed
- Standards-compliant (RFC 8615)
- Best for: Static hosts, CDNs, enterprise environments

#### 3. **auto-generate** - Dynamic generation
- **Zero setup** - just mount any directory
- Automatically generates `burrow.json` on-the-fly
- Supports all three naming conventions
- Best for: Quick sharing, dynamic content, development

#### 4. **git-readonly** - Git server
- Serve burrows via Git with SSH authentication
- Read-only access for clients
- Clean URLs with standard port 22

### Human-Readable Companion Files

Each burrow includes a `.burrow.md` file that provides:
- A human-friendly table of contents
- Brief descriptions of each entry
- Access information (URLs, file paths)
- Links to the machine-readable `.burrow.json`

These companion files make burrows browsable via GitHub, file managers, or any Markdown viewer.

## Quick Start

### 1. Start the Burrows and Warren

```bash
cd server/ngnix-dotfiles
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

### 4. Access via File Paths (Local Development)

You can also access example burrows directly via file paths:

```bash
# Using the production client
cd ../rabit-client
bun install

# Access burrow via file path
bun run src/cli.ts burrow ../examples/burrows/docs-burrow/

# List entries via file path
bun run src/cli.ts entries ../examples/burrows/api-burrow/

# Traverse via file path
bun run src/cli.ts traverse ../examples/burrows/blog-burrow/
```

This demonstrates RBT's file root support, which works with local paths, SMB shares, and NFS mounts.

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
cd server/ngnix-dotfiles
docker compose down
```

## Notes

- This is a proof-of-concept implementation
- The CLI only supports HTTPS roots (not Git)
- RID verification is not implemented
- Child pagination is not implemented

For a production implementation, see the full RBT specification.
