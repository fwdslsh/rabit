# Rabit Server

**Official Docker images for serving Rabit burrows** - Zero-configuration servers for documentation, content, and knowledge repositories.

## Available Images

Rabit provides two official Docker images, each optimized for different use cases:

### 1. HTTP Server (`fwdslsh/rabit-server`)

Serve burrows and warrens via HTTP with auto-generated manifests.

[![Docker Hub](https://img.shields.io/docker/pulls/fwdslsh/rabit-server.svg)](https://hub.docker.com/r/fwdslsh/rabit-server)

```bash
docker run -d \
  -p 8080:80 \
  -v ./docs:/data/burrow:ro \
  -e RABIT_TITLE="My Documentation" \
  fwdslsh/rabit-server
```

**Perfect for:**
- Public documentation websites
- Internal knowledge bases
- API documentation servers
- Content delivery for browsers and agents
- Warren registries (multiple burrows)

**[Read full documentation →](./http/README.md)**

### 2. Git Server (`fwdslsh/rabit-server-git`)

Read-only SSH-based Git server for secure burrow distribution.

[![Docker Hub](https://img.shields.io/docker/pulls/fwdslsh/rabit-server-git.svg)](https://hub.docker.com/r/fwdslsh/rabit-server-git)

```bash
docker run -d \
  -p 22:22 \
  -v ./repos:/repos:ro \
  -v ./authorized_keys:/home/git/.ssh/authorized_keys:ro \
  fwdslsh/rabit-server-git
```

**Perfect for:**
- Team documentation sharing
- Secure content distribution
- SSH key-authenticated access
- Home lab and internal networks
- Git-based workflows

**[Read full documentation →](./git/README.md)**

## Quick Comparison

| Feature | HTTP Server | Git Server |
|---------|-------------|------------|
| **Protocol** | HTTP/HTTPS | SSH/Git |
| **Authentication** | None / Reverse proxy | SSH keys |
| **Access Control** | Via reverse proxy | Via authorized_keys |
| **CORS** | Built-in | N/A |
| **Auto-generation** | Yes | No (serves repos as-is) |
| **Best for** | Public/browser access | Secure team access |
| **Client** | Any HTTP client | Git client |
| **Port** | 80/443 | 22 (or custom) |

## Use Cases

### Public Documentation

Use **HTTP Server** for public-facing documentation:

```yaml
version: '3.8'
services:
  docs:
    image: fwdslsh/rabit-server:latest
    ports:
      - "80:80"
    volumes:
      - ./docs:/data/burrow:ro
    environment:
      RABIT_TITLE: "Product Documentation"
      RABIT_BASE_URL: "https://docs.example.com/"
```

### Team Knowledge Base

Use **Git Server** for authenticated team access:

```yaml
version: '3.8'
services:
  git:
    image: fwdslsh/rabit-server-git:latest
    ports:
      - "22:22"
    volumes:
      - ./repos:/repos:ro
      - ./team-keys:/home/git/.ssh/authorized_keys:ro
```

### Hybrid Setup

Use **both** for maximum flexibility:

```yaml
version: '3.8'
services:
  # Public HTTP access
  http:
    image: fwdslsh/rabit-server:latest
    ports:
      - "80:80"
    volumes:
      - ./docs:/data/burrow:ro
    environment:
      RABIT_TITLE: "Public Docs"

  # Authenticated Git access
  git:
    image: fwdslsh/rabit-server-git:latest
    ports:
      - "22:22"
    volumes:
      - ./repos:/repos:ro
      - ./authorized_keys:/home/git/.ssh/authorized_keys:ro
```

## Getting Started

### 1. Choose Your Server

- **Need browser access?** → [HTTP Server](./http/README.md)
- **Need SSH authentication?** → [Git Server](./git/README.md)
- **Need both?** → Use both images

### 2. Pull the Image

```bash
# HTTP Server
docker pull fwdslsh/rabit-server:latest

# Git Server
docker pull fwdslsh/rabit-server-git:latest
```

### 3. Mount Your Content

**HTTP Server:**
```bash
docker run -d -p 8080:80 \
  -v ./my-docs:/data/burrow:ro \
  fwdslsh/rabit-server
```

**Git Server:**
```bash
docker run -d -p 22:22 \
  -v ./repos:/repos:ro \
  -v ./keys:/home/git/.ssh/authorized_keys:ro \
  fwdslsh/rabit-server-git
```

### 4. Access Your Content

**HTTP Server:**
```bash
curl http://localhost:8080/.burrow.json
```

**Git Server:**
```bash
git clone git@server:my-docs.git
```

## Environment Variables

### HTTP Server

| Variable | Default | Description |
|----------|---------|-------------|
| `RABIT_MODE` | `burrow` | `burrow`, `warren`, or `both` |
| `RABIT_TITLE` | `My Burrow` | Manifest title |
| `RABIT_DESCRIPTION` | `` | Manifest description |
| `RABIT_BASE_URL` | Auto-detected | Base URL |
| `RABIT_CORS_ORIGINS` | `*` | CORS allowed origins |
| `RABIT_AUTO_GENERATE` | `true` | Auto-generate manifests |

[See all HTTP variables →](./http/README.md#environment-variables)

### Git Server

| Variable | Default | Description |
|----------|---------|-------------|
| `SSH_USER_UID` | `1000` | Git user UID |
| `SSH_USER_GID` | `1000` | Git user GID |
| `GIT_BASE_PATH` | `/repos` | Repository base path |
| `SSH_AUTH_METHODS` | `publickey` | SSH auth methods |

[See all Git variables →](./git/README.md#environment-variables)

## Building from Source

```bash
# Clone the repository
git clone https://github.com/fwdslsh/rabit.git
cd rabit/packages/rabit-server

# Build both images
make build

# Or build individually
make build-http
make build-git

# Test the images
make test

# Publish to Docker Hub
make publish
```

## Examples

Comprehensive examples are available in the [`examples/server/`](../../examples/server/) directory:

- **[Auto-generate](../../examples/server/auto-generate/)** - Auto-generated manifest server
- **[Git readonly](../../examples/server/git-readonly/)** - Read-only Git server setup
- **[Wellknown static](../../examples/server/wellknown-static/)** - Static .well-known files
- **[Docker Compose examples](../../examples/server/docker-compose-examples/)** - Various deployment scenarios

## Production Deployment

### HTTP Server with Traefik

```yaml
version: '3.8'
services:
  traefik:
    image: traefik:v2.10
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

  docs:
    image: fwdslsh/rabit-server:latest
    volumes:
      - ./docs:/data/burrow:ro
    environment:
      RABIT_TITLE: "Documentation"
      RABIT_BASE_URL: "https://docs.example.com/"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.docs.rule=Host(`docs.example.com`)"
      - "traefik.http.routers.docs.tls.certresolver=letsencrypt"
```

### Git Server with Custom Port

```yaml
version: '3.8'
services:
  git:
    image: fwdslsh/rabit-server-git:latest
    ports:
      - "2222:22"  # Custom port to avoid conflicts
    volumes:
      - /mnt/repos:/repos:ro
      - ./team-keys:/home/git/.ssh/authorized_keys:ro
      - git-host-keys:/etc/ssh/host-keys
    restart: unless-stopped

volumes:
  git-host-keys:
```

## Security Best Practices

### 1. Always Use Read-Only Mounts

```yaml
volumes:
  - ./content:/data/burrow:ro  # Note the :ro
```

### 2. Restrict CORS (HTTP Server)

```bash
-e RABIT_CORS_ORIGINS="https://trusted-domain.com"
```

### 3. Use SSH Keys (Git Server)

Never use password authentication. Always use SSH keys:

```bash
cat ~/.ssh/id_ed25519.pub >> authorized_keys
```

### 4. Network Isolation

```yaml
networks:
  internal:
    driver: bridge
    internal: true
```

### 5. Regular Updates

```bash
docker pull fwdslsh/rabit-server:latest
docker pull fwdslsh/rabit-server-git:latest
```

## Health Checks

Both images include built-in health checks:

### HTTP Server

```yaml
healthcheck:
  test: ["CMD", "wget", "-q", "--spider", "http://localhost/health"]
  interval: 30s
  timeout: 5s
  retries: 3
```

### Git Server

```yaml
healthcheck:
  test: ["CMD", "pgrep", "sshd"]
  interval: 30s
  timeout: 5s
  retries: 3
```

## Troubleshooting

### HTTP Server Issues

- **Manifest not generated:** Check `RABIT_AUTO_GENERATE=true` and logs
- **CORS errors:** Verify `RABIT_CORS_ORIGINS` setting
- **Wrong base URL:** Set `RABIT_BASE_URL` explicitly

[Full HTTP troubleshooting →](./http/README.md#troubleshooting)

### Git Server Issues

- **Permission denied:** Verify SSH keys in `authorized_keys`
- **Host key verification failed:** Add server to `known_hosts`
- **Connection refused:** Check port mapping and firewall

[Full Git troubleshooting →](./git/README.md#troubleshooting)

## Integration with Rabit Clients

Both servers work seamlessly with Rabit clients:

**HTTP Server:**
```json
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.3.0/burrow",
  "kind": "burrow",
  "title": "Documentation",
  "baseUri": "https://docs.example.com/"
}
```

**Git Server:**
```json
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.3.0/burrow",
  "kind": "burrow",
  "title": "Documentation",
  "baseUri": "git@git.example.com:docs.git"
}
```

## Support

- **Documentation:** [Rabit Specification](../../docs/rabit-spec.md)
- **Issues:** [GitHub Issues](https://github.com/fwdslsh/rabit/issues)
- **Docker Hub:**
  - [fwdslsh/rabit-server](https://hub.docker.com/r/fwdslsh/rabit-server)
  - [fwdslsh/rabit-server-git](https://hub.docker.com/r/fwdslsh/rabit-server-git)

## License

CC-BY-4.0 License - See [LICENSE](./LICENSE) file for details.

## Contributing

Contributions welcome! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.
