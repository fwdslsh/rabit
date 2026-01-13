# Rabit HTTP Server

**Official HTTP server for Rabit burrows and warrens** - Serve your documentation and content with auto-generated manifests and CORS support.

[![Docker Hub](https://img.shields.io/docker/pulls/fwdslsh/rabit-server.svg)](https://hub.docker.com/r/fwdslsh/rabit-server)

## Quick Start

Get an HTTP server running in under 5 minutes:

```bash
# 1. Create a content directory
mkdir my-docs
echo "# Welcome" > my-docs/README.md
echo "## Getting Started" > my-docs/guide.md

# 2. Start the server
docker run -d \
  --name rabit \
  -p 8080:80 \
  -v $(pwd)/my-docs:/data/burrow:ro \
  -e RABIT_TITLE="My Documentation" \
  fwdslsh/rabit-server

# 3. Access your burrow
curl http://localhost:8080/.burrow.json
```

That's it! Your content is now available via HTTP with an auto-generated manifest.

## Features

- **Zero configuration** - Just mount your content directory
- **Auto-generated manifests** - Creates `.burrow.json` and `.warren.json` automatically
- **CORS enabled** - Ready for browser and agent access
- **Content-type detection** - Proper MIME types for all files
- **Health checks** - Built-in `/health` endpoint
- **SHA256 hashes** - Content verification for each entry
- **Two modes** - Serve single burrows or warren registries

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RABIT_MODE` | `burrow` | Mode: `burrow`, `warren`, or `both` |
| `RABIT_PORT` | `80` | Port to listen on |
| `RABIT_TITLE` | `My Burrow` | Title for the manifest |
| `RABIT_DESCRIPTION` | `` | Description for the manifest |
| `RABIT_BASE_URL` | Auto-detected | Base URL for the burrow/warren |
| `RABIT_CORS_ORIGINS` | `*` | Allowed CORS origins |
| `RABIT_AUTO_GENERATE` | `true` | Auto-generate manifests if missing |
| `RABIT_LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error` |

## Volume Mounts

| Container Path | Purpose | Recommended Mount |
|----------------|---------|-------------------|
| `/data/burrow` | Burrow content | Mount as `:ro` (read-only) |
| `/data/warren` | Warren content (multiple burrows) | Mount as `:ro` (read-only) |

## Modes

### Burrow Mode (default)

Serves a single burrow from `/data/burrow`:

```bash
docker run -d \
  -p 8080:80 \
  -v ./content:/data/burrow:ro \
  -e RABIT_TITLE="My Documentation" \
  fwdslsh/rabit-server
```

**Directory structure:**
```
/data/burrow/
├── .burrow.json    # Auto-generated if missing
├── README.md
├── guides/
│   └── getting-started.md
└── api/
    └── reference.md
```

**Endpoints:**
- `http://localhost:8080/.burrow.json` - Burrow manifest
- `http://localhost:8080/README.md` - Content files
- `http://localhost:8080/health` - Health check

### Warren Mode

Serves a registry of burrows from `/data/warren`:

```bash
docker run -d \
  -p 8080:80 \
  -v ./burrows:/data/warren:ro \
  -e RABIT_MODE="warren" \
  -e RABIT_TITLE="My Registry" \
  fwdslsh/rabit-server
```

**Directory structure:**
```
/data/warren/
├── .warren.json    # Auto-generated if missing
├── .warren.md      # Auto-generated if missing
├── docs/           # Each subdirectory becomes a burrow entry
│   ├── .burrow.json
│   └── ...
├── api/
│   ├── .burrow.json
│   └── ...
└── blog/
    ├── .burrow.json
    └── ...
```

**Endpoints:**
- `http://localhost:8080/.warren.json` - Warren registry
- `http://localhost:8080/.warren.md` - Human-readable registry
- `http://localhost:8080/health` - Health check

### Both Mode

Serves both a warren at root and burrows at `/burrow/`:

```bash
docker run -d \
  -p 8080:80 \
  -v ./content:/data/burrow:ro \
  -v ./registry:/data/warren:ro \
  -e RABIT_MODE="both" \
  fwdslsh/rabit-server
```

## Docker Compose Examples

### Single Burrow

```yaml
version: '3.8'

services:
  docs:
    image: fwdslsh/rabit-server:latest
    container_name: rabit-docs
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./docs:/data/burrow:ro
    environment:
      RABIT_TITLE: "My Documentation"
      RABIT_DESCRIPTION: "Project documentation and guides"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

### Warren Registry

```yaml
version: '3.8'

services:
  warren:
    image: fwdslsh/rabit-server:latest
    container_name: rabit-warren
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./registry:/data/warren:ro
    environment:
      RABIT_MODE: warren
      RABIT_TITLE: "My Burrow Registry"
      RABIT_DESCRIPTION: "Central documentation hub"
```

### Multiple Burrows

```yaml
version: '3.8'

services:
  docs:
    image: fwdslsh/rabit-server:latest
    ports:
      - "8081:80"
    volumes:
      - ./docs:/data/burrow:ro
    environment:
      RABIT_TITLE: "User Documentation"
      RABIT_BASE_URL: "http://localhost:8081/"

  api:
    image: fwdslsh/rabit-server:latest
    ports:
      - "8082:80"
    volumes:
      - ./api-docs:/data/burrow:ro
    environment:
      RABIT_TITLE: "API Reference"
      RABIT_BASE_URL: "http://localhost:8082/"
```

## Using Your Own Manifests

If you provide your own `.burrow.json` or `.warren.json`, the server will use them instead of auto-generating:

```bash
# Your existing manifest will be used
docker run -d \
  -p 8080:80 \
  -v ./my-docs:/data/burrow:ro \
  fwdslsh/rabit-server
```

To disable auto-generation entirely:

```bash
docker run -d \
  -p 8080:80 \
  -v ./my-docs:/data/burrow:ro \
  -e RABIT_AUTO_GENERATE=false \
  fwdslsh/rabit-server
```

## CORS Configuration

By default, CORS allows all origins (`*`). To restrict:

```bash
docker run -d \
  -p 8080:80 \
  -v ./docs:/data/burrow:ro \
  -e RABIT_CORS_ORIGINS="https://myapp.example.com" \
  fwdslsh/rabit-server
```

For multiple origins:
```bash
-e RABIT_CORS_ORIGINS="https://app1.example.com,https://app2.example.com"
```

## Health Check

The server exposes a health endpoint:

```bash
curl http://localhost:8080/health
# {"status":"healthy","mode":"burrow"}
```

Use this for:
- Docker healthchecks
- Load balancer health probes
- Monitoring systems
- Orchestrator readiness checks

## Auto-Generated Manifests

When `RABIT_AUTO_GENERATE=true` (default), the server scans your content directory and creates:

**For each file:**
- `id` - Generated from filename
- `rid` - SHA256 hash of content (for verification)
- `href` - Relative path to file
- `type` - MIME type (auto-detected)
- `rel` - Relationships (e.g., `["item", "index"]` for README.md)
- `title` - Extracted from markdown H1 or filename
- `summary` - First paragraph from markdown files
- `size` - File size in bytes
- `modified` - Last modification timestamp

**Example generated manifest:**
```json
{
  "rbt": "0.2",
  "$schema": "https://fwdslsh.dev/rabit/schemas/burrow-0.2.json",
  "manifest": {
    "title": "My Documentation",
    "description": "Project docs",
    "updated": "2026-01-13T12:00:00Z",
    "rid": "urn:rabit:sha256:abc123...",
    "roots": [
      {
        "https": {
          "base": "http://localhost:8080/"
        }
      }
    ],
    "agents": {
      "context": "Content from My Documentation",
      "hints": [
        "Auto-generated manifest - entries discovered from file system"
      ]
    }
  },
  "entries": [
    {
      "id": "readme",
      "rid": "urn:rabit:sha256:def456...",
      "href": "README.md",
      "type": "text/markdown",
      "rel": ["item", "index", "about"],
      "title": "Welcome",
      "summary": "Getting started guide for...",
      "size": 1024,
      "modified": "2026-01-13T11:30:00Z"
    }
  ]
}
```

## Integration with Agents

The server is optimized for AI agent access:

- **CORS enabled** - Agents can fetch from browsers
- **Proper content-types** - Agents understand file formats
- **SHA256 hashes** - Agents can verify content integrity
- **Structured manifests** - Agents can discover content
- **Hints field** - Guides agents on how to use content

## Security Considerations

### Read-Only Mounts

Always mount content as read-only (`:ro`):

```yaml
volumes:
  - ./docs:/data/burrow:ro
```

This prevents any writes to your content directory.

### CORS Origins

In production, restrict CORS to specific origins:

```bash
-e RABIT_CORS_ORIGINS="https://trusted-app.com"
```

### Network Isolation

Consider using internal networks:

```yaml
networks:
  internal:
    driver: bridge
    internal: true
```

### Reverse Proxy

Use a reverse proxy (nginx, Traefik, Caddy) for:
- HTTPS/TLS termination
- Authentication
- Rate limiting
- Caching

## Performance

- **Lightweight** - Alpine-based, ~50MB image
- **Fast startup** - Ready in seconds
- **Efficient** - Nginx serves static content
- **Scalable** - Run multiple instances behind load balancer
- **Cached** - Set appropriate cache headers for CDN

## Building the Image

```bash
cd packages/rabit-server/http
docker build -t fwdslsh/rabit-server:latest .
```

## Troubleshooting

### Manifest not generated

**Check:**
- `RABIT_AUTO_GENERATE=true` is set
- Content directory is not empty
- Bun runtime installed correctly: `docker exec rabit which bun`

### CORS errors in browser

**Check:**
- `RABIT_CORS_ORIGINS` includes your origin
- Browser shows the actual error in console
- Preflight OPTIONS requests succeed

### Wrong base URL in manifest

**Solution:** Set explicitly:
```bash
-e RABIT_BASE_URL="https://docs.example.com/"
```

### Health check failing

**Check:**
- Container is running: `docker ps`
- Port mapping correct: `docker port rabit`
- Logs: `docker logs rabit`

## See Also

- [Rabit Specification](../../../docs/rabit-spec.md)
- [Rabit Git Server](../git/README.md)
- [Docker Compose Examples](../../../examples/server/docker-compose-examples/)
- [Docker Hub](https://hub.docker.com/r/fwdslsh/rabit-server)

## License

CC-BY-4.0 License - See [LICENSE](../LICENSE) file for details.
