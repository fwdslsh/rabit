# Sample Document

This is an example content file to demonstrate how the `.well-known` burrow convention works.

## Overview

When you serve this directory with any static file server:

- **This file** is accessible at: `http://your-server/sample-document.md`
- **The manifest** is accessible at: `http://your-server/.well-known/burrow.json`
- **Human guide** is accessible at: `http://your-server/.well-known/burrow.md`

## Benefits

The `.well-known` convention provides:

1. **Zero Configuration** - No web server setup needed
2. **Standards Compliance** - RFC 8615 compliant
3. **Universal Support** - Works with nginx, Apache, CDNs, S3, etc.
4. **Clean Separation** - Metadata stays in dedicated directory

## Adding Content

To add this to your own directory:

```bash
# 1. Create the .well-known directory
mkdir -p .well-known

# 2. Add your burrow manifest
cat > .well-known/burrow.json <<EOF
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.3.0/burrow",
  "kind": "burrow",
  "title": "My Content",
  "entries": [
    {
      "id": "readme",
      "kind": "file",
      "uri": "README.md"
    }
  ]
}
EOF

# 3. Serve it!
docker run -p 8080:80 -v .:/usr/share/nginx/html:ro nginx:alpine
```

That's it! No nginx configuration, no dotfile allowlists, no special setup.

## Next Steps

- Check out the [README](README.md) for more examples
- See the [Rabit specification](../../../docs/rabit-spec.md) for full details
- Try the [auto-generate example](../auto-generate/) for zero-config burrows
