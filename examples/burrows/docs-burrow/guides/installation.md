# Installation Guide

## Prerequisites

- Node.js 18 or later
- Docker (optional)

## Quick Install

```bash
npm install -g @acme/cli
acme init my-project
cd my-project
acme start
```

## Docker Install

```bash
docker run -p 3000:3000 acme/platform:latest
```

## Verify Installation

```bash
acme --version
# Should output: acme v2.1.0
```

## Next Steps

- [Configuration Guide](./configuration.md)
- [API Overview](../api/overview.md)
