# Rabit Server

Official Docker image for serving Rabit burrows and warrens with zero configuration.

## Quick Start

### Serve a Burrow

```bash
# Serve a directory as a burrow
docker run -d \
  -p 8080:80 \
  -v ./my-docs:/data/burrow \
  -e RABIT_TITLE="My Documentation" \
  rabit/server
```

Your content is now available at:
- Manifest: http://localhost:8080/.burrow.json
- Content: http://localhost:8080/

### Serve a Warren (Registry)

```bash
# Serve a directory of burrows as a warren
docker run -d \
  -p 8080:80 \
  -v ./my-burrows:/data/warren \
  -e RABIT_MODE="warren" \
  -e RABIT_TITLE="My Registry" \
  rabit/server
```

Your registry is now available at:
- Registry: http://localhost:8080/.warren.json
- Markdown: http://localhost:8080/.warren.md

## Features

- **Zero configuration** - Just mount your content directory
- **Auto-generated manifests** - Creates `.burrow.json` and `.warren.json` automatically
- **CORS enabled** - Ready for browser and agent access
- **Content-type detection** - Proper MIME types for all files
- **Health checks** - Built-in `/health` endpoint
- **SHA256 hashes** - Optional content verification

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

## Modes

### Burrow Mode (default)

Serves a single burrow from `/data/burrow`:

```bash
docker run -v ./content:/data/burrow rabit/server
```

Directory structure:
```
/data/burrow/
├── .burrow.json    # Auto-generated if missing
├── README.md
├── guides/
│   └── getting-started.md
└── api/
    └── reference.md
```

### Warren Mode

Serves a registry of burrows from `/data/warren`:

```bash
docker run -v ./burrows:/data/warren -e RABIT_MODE=warren rabit/server
```

Directory structure:
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

### Both Mode

Serves both a warren at root and burrows at `/burrow/`:

```bash
docker run \
  -v ./content:/data/burrow \
  -v ./registry:/data/warren \
  -e RABIT_MODE=both \
  rabit/server
```

## Using Your Own Manifests

If you provide your own `.burrow.json` or `.warren.json`, the server will use them instead of auto-generating:

```bash
# Your existing manifest will be used
docker run -v ./my-docs:/data/burrow rabit/server
```

To disable auto-generation entirely:

```bash
docker run -v ./my-docs:/data/burrow -e RABIT_AUTO_GENERATE=false rabit/server
```

## Docker Compose

### Single Burrow

```yaml
version: '3.8'
services:
  docs:
    image: rabit/server
    ports:
      - "8080:80"
    volumes:
      - ./docs:/data/burrow:ro
    environment:
      RABIT_TITLE: "My Documentation"
      RABIT_DESCRIPTION: "Project documentation and guides"
```

### Multiple Burrows with Warren

```yaml
version: '3.8'
services:
  warren:
    image: rabit/server
    ports:
      - "8080:80"
    volumes:
      - ./registry:/data/warren:ro
    environment:
      RABIT_MODE: warren
      RABIT_TITLE: "My Burrow Registry"

  docs:
    image: rabit/server
    ports:
      - "8081:80"
    volumes:
      - ./docs:/data/burrow:ro
    environment:
      RABIT_TITLE: "Documentation"
      RABIT_BASE_URL: "http://localhost:8081/"

  api:
    image: rabit/server
    ports:
      - "8082:80"
    volumes:
      - ./api-docs:/data/burrow:ro
    environment:
      RABIT_TITLE: "API Reference"
      RABIT_BASE_URL: "http://localhost:8082/"
```

## Health Check

The server exposes a health endpoint:

```bash
curl http://localhost:8080/health
# {"status":"healthy","mode":"burrow"}
```

## CORS Configuration

By default, CORS allows all origins (`*`). To restrict:

```bash
docker run \
  -v ./docs:/data/burrow \
  -e RABIT_CORS_ORIGINS="https://myapp.example.com" \
  rabit/server
```

## Building the Image

```bash
docker build -t rabit/server .
```

## API Endpoints

| Endpoint | Mode | Description |
|----------|------|-------------|
| `/.burrow.json` | burrow, both | Burrow manifest |
| `/.burrow.md` | burrow, both | Human-readable burrow companion |
| `/.warren.json` | warren, both | Warren registry |
| `/.warren.md` | warren, both | Human-readable registry |
| `/health` | all | Health check |
| `/*` | all | Static content |

## Examples

### Read-Only Git Server

Share burrows via Git with SSH key authentication and read-only access:

```bash
cd examples/git-readonly
./setup.sh

# Add your SSH key
cat ~/.ssh/id_ed25519.pub >> ssh-keys/authorized_keys

# Add a repository
git clone --bare https://github.com/you/docs repos/docs.git

# Start
docker compose up -d

# Clients clone with clean URLs:
git clone git@your-server:docs.git
```

Features:
- Clean URLs (`git@server:repo.git`) — no `/srv/git` prefix
- Standard port 22 by default (configurable with `--port`)
- No symlinks required — mount repos directly
- No root access needed on host

See [examples/git-readonly/README.md](examples/git-readonly/README.md) for full documentation.

### Using with File Paths

The Rabit v0.3.0 spec uses standard URIs for file paths:

```json
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.3.0/burrow",
  "kind": "burrow",
  "title": "My Documentation",
  "baseUri": "file:///mnt/shared/documentation/",
  "entries": [
    { "id": "readme", "kind": "file", "uri": "README.md" }
  ]
}
```

## License

CC-BY-4.0 License - See LICENSE file for details.

## Links

- [Rabit Specification](../../docs/rabit-spec-v0.3.0.md)
- [GitHub Repository](https://github.com/itlackey/rabit)
- [Docker Hub](https://hub.docker.com/r/rabit/server)
