# RFC 8615 .well-known Static Burrow Example

This example demonstrates using the RFC 8615 `.well-known` convention to serve Rabit burrows with zero web server configuration. This approach is ideal when:

- You can't or don't want to configure dotfile serving
- You're working in enterprise environments with strict policies
- You want a standards-based, predictable location for metadata

## Key Benefits

✅ **No web server configuration needed** - `.well-known` is a standard directory
✅ **Works with any static file server** - nginx, Apache, S3, CDN, etc.
✅ **RFC 8615 compliant** - Follows internet standard for metadata
✅ **Simple to add** - Just drop `.well-known/` into any directory

## Quick Start

### Option 1: Use the Example Content

```bash
# Start the example server
docker compose up -d

# Access the burrow
curl http://localhost:8090/.well-known/burrow.json
```

The burrow is now available at `http://localhost:8090/`

### Option 2: Serve Your Own Directory

```bash
# 1. Add .well-known to your content directory
mkdir -p ~/my-docs/.well-known

# 2. Create a burrow manifest
cat > ~/my-docs/.well-known/burrow.json <<EOF
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.3.0/burrow",
  "kind": "burrow",
  "title": "My Documentation",
  "description": "My project documentation",
  "updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "entries": [
    {
      "id": "readme",
      "kind": "file",
      "uri": "README.md",
      "title": "Getting Started"
    }
  ]
}
EOF

# 3. Run with docker (mounting your directory)
docker run -d \
  -p 8090:80 \
  -v ~/my-docs:/usr/share/nginx/html:ro \
  nginx:alpine
```

Your content is now accessible at:
- Burrow manifest: `http://localhost:8090/.well-known/burrow.json`
- Content: `http://localhost:8090/README.md`

## Directory Structure

```
your-content/
├── .well-known/
│   ├── burrow.json       # Burrow manifest (required)
│   └── burrow.md         # Human-readable guide (optional)
├── README.md
├── docs/
│   ├── guide.md
│   └── api.md
└── ... (your content)
```

## How It Works

1. **Standard Location**: RFC 8615 defines `.well-known` for metadata
2. **No Configuration**: Web servers serve it by default (not blocked like dotfiles)
3. **Discovery**: Rabit clients try `.well-known/burrow.json` as the third option
4. **Clean Separation**: Keeps metadata in dedicated directory

## Example Manifest

The included `.well-known/burrow.json` demonstrates:
- Basic burrow structure
- File and directory entries
- Human-readable titles and summaries
- Priority ordering

## Use Cases

### Static Documentation Sites

```bash
# GitHub Pages, Netlify, Vercel
mkdir .well-known
echo '{"specVersion":"fwdslsh.dev/rabit/schemas/0.3.0/burrow",...}' > .well-known/burrow.json
git add .well-known/
git push
```

### S3 Buckets

```bash
# Upload to S3
aws s3 sync .well-known/ s3://my-bucket/.well-known/
aws s3 sync . s3://my-bucket/ --exclude ".well-known/*"
```

### Enterprise File Shares

```bash
# SMB/NFS/SharePoint
# Just add .well-known/ directory - no server config needed
cp burrow.json /mnt/enterprise-share/.well-known/
```

## Comparison with Other Conventions

| Convention | Location | Pros | Cons |
|------------|----------|------|------|
| Dotfile | `.burrow.json` | Unobtrusive, git-friendly | Web servers may block |
| Non-dotfile | `burrow.json` | Always visible | Directory clutter |
| **RFC 8615** | `.well-known/burrow.json` | **Standards-based, no config** | **Extra directory** |

## Environment Variables

The docker-compose.yml accepts these variables:

```bash
# Port to expose
PORT=8090 docker compose up -d

# Custom content directory
CONTENT_DIR=~/my-content docker compose up -d
```

## See Also

- [RFC 8615: Well-Known URIs](https://www.rfc-editor.org/rfc/rfc8615.html)
- [Rabit Specification](../../../docs/rabit-spec.md) - Discovery algorithm
- [Conventions Demo](../../conventions-demo/) - All three naming conventions
