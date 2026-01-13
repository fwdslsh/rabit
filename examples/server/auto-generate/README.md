# Auto-Generate Burrow Server

**Zero-config Rabit burrow server** - Just mount any directory and get an instant burrow with automatically generated manifest.

## Key Features

✅ **Zero configuration** - No manifest files needed
✅ **Auto-discovery** - Scans directory and creates entries automatically
✅ **Live updates** - Regenerates manifest on each request
✅ **Smart detection** - Recognizes files, directories, and media types
✅ **Priority ordering** - README files get highest priority
✅ **Works anywhere** - Mount any directory and go

## Quick Start

### Serve Any Directory

```bash
# Just mount your content directory - that's it!
docker run -d \
  -p 8095:80 \
  -v ~/my-docs:/data:ro \
  -e BURROW_TITLE="My Documentation" \
  rabit-auto-server

# Burrow is instantly available
curl http://localhost:8095/burrow.json
```

### Using Docker Compose

```bash
# Edit docker-compose.yml to point to your directory
# Then:
docker compose up -d

# Access
curl http://localhost:8095/burrow.json
```

## How It Works

1. **Mount** any directory to `/data` in the container
2. **Request** `burrow.json` (or `.burrow.json` or `.well-known/burrow.json`)
3. **Auto-generation** - Server scans `/data` and creates manifest on-the-fly
4. **Serve** - Generated manifest returned with proper content-type

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BURROW_TITLE` | `Auto-Generated Burrow` | Burrow title |
| `BURROW_DESCRIPTION` | `Automatically generated...` | Burrow description |
| `BURROW_BASE_URI` | Auto-detected | Base URI for the burrow |
| `BURROW_MAX_DEPTH` | `3` | Maximum directory recursion depth |
| `BURROW_INCLUDE_HIDDEN` | `false` | Include hidden files (.*) |
| `BURROW_EXCLUDE_PATTERNS` | `node_modules,dist,.git` | Comma-separated exclude patterns |

## Generated Manifest Example

When you mount a directory like:
```
my-docs/
├── README.md
├── guide.md
├── api/
│   ├── overview.md
│   └── reference.md
└── images/
    └── diagram.png
```

The server generates:
```json
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.3.0/burrow",
  "kind": "burrow",
  "title": "My Documentation",
  "updated": "2026-01-13T12:34:56Z",
  "entries": [
    {
      "id": "readme",
      "kind": "file",
      "uri": "README.md",
      "title": "README",
      "mediaType": "text/markdown",
      "priority": 100
    },
    {
      "id": "guide",
      "kind": "file",
      "uri": "guide.md",
      "mediaType": "text/markdown",
      "priority": 80
    },
    {
      "id": "api",
      "kind": "dir",
      "uri": "api/",
      "title": "api",
      "priority": 70
    }
  ]
}
```

## Smart Features

### Priority Assignment

- `README.md` → priority 100
- `index.*` files → priority 95
- Regular files → priority 80
- Directories → priority 70
- Hidden files → priority 50

### Media Type Detection

Automatically detects MIME types:
- `.md` → `text/markdown`
- `.json` → `application/json`
- `.yaml`, `.yml` → `application/x-yaml`
- `.html` → `text/html`
- `.jpg`, `.png` → `image/jpeg`, `image/png`
- And more...

### ID Generation

Generates valid IDs from filenames:
- `Getting Started.md` → `getting-started`
- `API Reference.md` → `api-reference`
- `01-intro.md` → `intro`

## Building the Image

```bash
# Build from this directory
docker build -t rabit-auto-server .

# Or use docker compose
docker compose build
```

## Use Cases

### Quick Documentation Sharing

```bash
# Share any directory instantly
docker run -p 8080:80 -v ./docs:/data:ro rabit-auto-server
```

### Development Testing

```bash
# Test burrow clients without manually creating manifests
docker run -p 8080:80 -v $(pwd):/data:ro rabit-auto-server
```

### Dynamic Content Sites

```bash
# Serve directory that changes frequently
# Manifest auto-updates on each request
docker run -p 8080:80 -v /var/www/html:/data:ro rabit-auto-server
```

### Home Lab / NAS

```bash
# Expose your file shares as burrows
docker run -p 8080:80 \
  -v /mnt/nas/documents:/data:ro \
  -e BURROW_TITLE="NAS Documents" \
  rabit-auto-server
```

## Customization

### Exclude Patterns

```bash
docker run -p 8080:80 \
  -v ./docs:/data:ro \
  -e BURROW_EXCLUDE_PATTERNS="node_modules,.git,dist,*.tmp" \
  rabit-auto-server
```

### Include Hidden Files

```bash
docker run -p 8080:80 \
  -v ./config:/data:ro \
  -e BURROW_INCLUDE_HIDDEN=true \
  rabit-auto-server
```

### Depth Control

```bash
# Only scan 2 levels deep
docker run -p 8080:80 \
  -v ./large-dir:/data:ro \
  -e BURROW_MAX_DEPTH=2 \
  rabit-auto-server
```

## Performance

- **Lightweight** - Generates manifests in milliseconds
- **No cache** - Always reflects current directory state
- **Read-only** - Mounts content as read-only for safety
- **Efficient** - Uses native filesystem operations

## Comparison with Static Manifests

| Aspect | Auto-Generate | Static Manifest |
|--------|---------------|-----------------|
| Setup | Mount directory | Write manifest file |
| Updates | Automatic | Manual edit required |
| Flexibility | High | Higher (custom metadata) |
| Performance | Very fast | Faster (no generation) |
| Use Case | Dynamic content | Curated content |

## See Also

- [Rabit Specification](../../../docs/rabit-spec-v0.3.0.md) - Full spec
- [.well-known Static Example](../wellknown-static/) - Manual manifest approach
- [Rabit Server Package](../../../packages/rabit-server/) - Production server
