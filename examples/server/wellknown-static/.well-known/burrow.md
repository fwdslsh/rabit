# RFC 8615 .well-known Example Burrow

Welcome! This burrow demonstrates the RFC 8615 `.well-known` convention for serving Rabit manifests.

## Contents

| Entry | Description |
|-------|-------------|
| [README.md](../README.md) | Complete guide to using .well-known |
| [sample-document.md](../sample-document.md) | Example content file |
| [docker-compose.yml](../docker-compose.yml) | Docker setup |

## Why .well-known?

The `.well-known` directory is defined by RFC 8615 as a standard location for metadata. Benefits:

- ✅ **No web server configuration needed** - works out of the box
- ✅ **Standards-based** - follows internet RFC
- ✅ **Enterprise-friendly** - acceptable in strict environments
- ✅ **Works everywhere** - static hosts, CDNs, S3, etc.

## Machine-Readable Manifest

For programmatic access, see [burrow.json](./burrow.json).

## Quick Start

```bash
# Clone and start
git clone https://github.com/fwdslsh/rabit.git
cd rabit/examples/server/wellknown-static
docker compose up -d

# Access
curl http://localhost:8090/.well-known/burrow.json
```

## Learn More

- [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615.html) - Well-Known URIs standard
- [Rabit Specification](../../../docs/rabit-spec.md) - Full spec with discovery order
