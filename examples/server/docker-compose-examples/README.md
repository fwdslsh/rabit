# Rabit Server Docker Compose Examples

This directory contains various Docker Compose configurations for deploying Rabit servers.

## Available Examples

- **[http-single-burrow.yml](#http-single-burrow)** - Single HTTP server serving one burrow
- **[http-warren-registry.yml](#http-warren-registry)** - HTTP server serving a warren (registry of burrows)
- **[git-single-repo.yml](#git-single-repo)** - Git server serving repositories
- **[hybrid-http-git.yml](#hybrid-http-git)** - Both HTTP and Git servers for the same content
- **[production-traefik.yml](#production-traefik)** - Production setup with Traefik reverse proxy

## HTTP Single Burrow

Serve a single documentation directory via HTTP.

```yaml
# http-single-burrow.yml
version: '3.8'
services:
  rabit:
    image: fwdslsh/rabit-server:latest
    container_name: rabit-http
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./docs:/data/burrow:ro
    environment:
      RABIT_TITLE: "My Documentation"
      RABIT_DESCRIPTION: "Project documentation and guides"
      RABIT_BASE_URL: "http://localhost:8080/"
```

**Usage:**
```bash
docker compose -f http-single-burrow.yml up -d
curl http://localhost:8080/.burrow.json
```

## HTTP Warren Registry

Serve multiple burrows as a warren registry.

```yaml
# http-warren-registry.yml
version: '3.8'
services:
  warren:
    image: fwdslsh/rabit-server:latest
    container_name: rabit-warren
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./burrows:/data/warren:ro
    environment:
      RABIT_MODE: warren
      RABIT_TITLE: "Documentation Hub"
      RABIT_DESCRIPTION: "Central registry for all documentation"
```

**Directory structure:**
```
burrows/
├── docs/
│   └── .burrow.json
├── api/
│   └── .burrow.json
└── guides/
    └── .burrow.json
```

**Usage:**
```bash
docker compose -f http-warren-registry.yml up -d
curl http://localhost:8080/.warren.json
```

## Git Single Repo

Serve repositories via SSH with read-only access.

```yaml
# git-single-repo.yml
version: '3.8'
services:
  git:
    image: fwdslsh/rabit-server-git:latest
    container_name: rabit-git
    restart: unless-stopped
    ports:
      - "22:22"
    environment:
      SSH_USER_UID: 1000
      SSH_USER_GID: 1000
    volumes:
      - ./repos:/repos:ro
      - ./ssh-keys/authorized_keys:/home/git/.ssh/authorized_keys:ro
      - git-host-keys:/etc/ssh/host-keys

volumes:
  git-host-keys:
```

**Setup:**
```bash
# Add SSH keys
mkdir -p ssh-keys
cat ~/.ssh/id_ed25519.pub >> ssh-keys/authorized_keys

# Add a repository
git clone --bare https://github.com/org/docs repos/docs.git

# Start
docker compose -f git-single-repo.yml up -d

# Clone
git clone git@localhost:docs.git
```

## Hybrid HTTP + Git

Serve the same content via both HTTP and Git.

```yaml
# hybrid-http-git.yml
version: '3.8'
services:
  http:
    image: fwdslsh/rabit-server:latest
    container_name: rabit-http
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - ./content:/data/burrow:ro
    environment:
      RABIT_TITLE: "Documentation"
      RABIT_BASE_URL: "http://localhost:8080/"

  git:
    image: fwdslsh/rabit-server-git:latest
    container_name: rabit-git
    restart: unless-stopped
    ports:
      - "2222:22"
    volumes:
      - ./content.git:/repos/content.git:ro
      - ./ssh-keys/authorized_keys:/home/git/.ssh/authorized_keys:ro
```

**Usage:**
```bash
# HTTP access
curl http://localhost:8080/.burrow.json

# Git access
git clone ssh://git@localhost:2222/content.git
```

## Production with Traefik

Production-ready setup with automatic HTTPS via Traefik.

```yaml
# production-traefik.yml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    container_name: traefik
    command:
      - "--api.insecure=false"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-certs:/letsencrypt
    restart: unless-stopped

  docs:
    image: fwdslsh/rabit-server:latest
    container_name: rabit-docs
    restart: unless-stopped
    volumes:
      - ./docs:/data/burrow:ro
    environment:
      RABIT_TITLE: "Production Documentation"
      RABIT_BASE_URL: "https://docs.example.com/"
      RABIT_CORS_ORIGINS: "https://example.com,https://app.example.com"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.docs.rule=Host(`docs.example.com`)"
      - "traefik.http.routers.docs.entrypoints=websecure"
      - "traefik.http.routers.docs.tls.certresolver=letsencrypt"
      - "traefik.http.services.docs.loadbalancer.server.port=80"
      # HTTP to HTTPS redirect
      - "traefik.http.routers.docs-http.rule=Host(`docs.example.com`)"
      - "traefik.http.routers.docs-http.entrypoints=web"
      - "traefik.http.routers.docs-http.middlewares=redirect-to-https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"

volumes:
  traefik-certs:

networks:
  default:
    name: rabit-network
```

**Setup:**
```bash
# Update domain and email
sed -i 's/docs.example.com/docs.yourdomain.com/g' production-traefik.yml
sed -i 's/admin@example.com/your@email.com/g' production-traefik.yml

# Deploy
docker compose -f production-traefik.yml up -d

# Check status
docker compose -f production-traefik.yml ps
```

## See Also

- [HTTP Server Documentation](../../../packages/rabit-server/http/README.md)
- [Git Server Documentation](../../../packages/rabit-server/git/README.md)
- [Rabit Specification](../../../docs/rabit-spec.md)
