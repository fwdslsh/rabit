# Rabit Git Server

**Official read-only Git server for Rabit burrows** - Serve your documentation and content repositories via SSH with minimal configuration.

[![Docker Hub](https://img.shields.io/docker/pulls/fwdslsh/rabit-server-git.svg)](https://hub.docker.com/r/fwdslsh/rabit-server-git)

## Quick Start

Get a Git server running in under 5 minutes:

```bash
# 1. Create directories
mkdir -p rabit-git/{repos,ssh-keys}

# 2. Add your SSH public key
cat ~/.ssh/id_ed25519.pub > rabit-git/ssh-keys/authorized_keys

# 3. Add a repository
git clone --bare https://github.com/yourorg/docs.git rabit-git/repos/docs.git

# 4. Start the server
docker run -d \
  --name rabit-git \
  -p 22:22 \
  -v $(pwd)/rabit-git/repos:/repos:ro \
  -v $(pwd)/rabit-git/ssh-keys/authorized_keys:/home/git/.ssh/authorized_keys:ro \
  fwdslsh/rabit-server-git

# 5. Clone from clients
git clone git@your-server:docs.git
```

That's it! Your repositories are now accessible via SSH with read-only access enforced.

## Features

- **Read-only by default** - Clients can clone/fetch but cannot push
- **SSH key authentication** - No passwords, secure access via `authorized_keys`
- **Clean URLs** - `git@server:repo.git` (no `/srv/git` prefix)
- **Zero configuration** - Just mount your repos and SSH keys
- **Standard port 22** - Or use any port you prefer
- **Multiple repositories** - Serve any number of repos from one container

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GIT_BASE_PATH` | `/repos` | Base path for repositories (don't change) |
| `SSH_AUTH_METHODS` | `publickey` | SSH authentication methods |
| `SSH_USER_UID` | `1000` | UID for git user |
| `SSH_USER_GID` | `1000` | GID for git user |

## Volume Mounts

| Container Path | Purpose | Recommended Mount |
|----------------|---------|-------------------|
| `/repos` | Git repositories | Mount as `:ro` (read-only) |
| `/home/git/.ssh/authorized_keys` | SSH public keys | Mount as `:ro` (read-only) |
| `/etc/ssh/host-keys` | SSH host keys (optional) | Persistent volume to avoid fingerprint changes |

## Docker Compose Example

```yaml
version: '3.8'

services:
  rabit-git:
    image: fwdslsh/rabit-server-git:latest
    container_name: rabit-git
    restart: unless-stopped
    ports:
      - "22:22"  # Or use custom port: "2222:22"
    environment:
      SSH_USER_UID: 1000
      SSH_USER_GID: 1000
    volumes:
      - ./repos:/repos:ro
      - ./ssh-keys/authorized_keys:/home/git/.ssh/authorized_keys:ro
      - ./ssh-keys/host-keys:/etc/ssh/host-keys
    healthcheck:
      test: ["CMD", "pgrep", "sshd"]
      interval: 30s
      timeout: 5s
      retries: 3
```

## Usage

### Adding SSH Keys

```bash
# Your own key
cat ~/.ssh/id_ed25519.pub >> ssh-keys/authorized_keys

# From GitHub
curl https://github.com/username.keys >> ssh-keys/authorized_keys

# From GitLab
curl https://gitlab.com/username.keys >> ssh-keys/authorized_keys

# Multiple users
cat >> ssh-keys/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3... alice@example.com
ssh-rsa AAAAB3... bob@example.com
EOF
```

### Adding Repositories

**Option 1: Clone from remote**
```bash
git clone --bare https://github.com/org/project.git repos/project.git
```

**Option 2: Create from working directory**
```bash
cd /path/to/project
git clone --bare . /path/to/rabit-git/repos/project.git
```

**Option 3: Copy existing bare repo**
```bash
cp -r /existing/project.git repos/
```

### Client Access

**Standard port (22):**
```bash
git clone git@your-server:my-docs.git
```

**Custom port (e.g., 2222):**
```bash
git clone ssh://git@your-server:2222/my-docs.git
```

### Using Custom Port

If port 22 is in use on your host:

```yaml
services:
  rabit-git:
    image: fwdslsh/rabit-server-git:latest
    ports:
      - "2222:22"  # Host:Container
    # ... rest of config
```

Clients connect with:
```bash
git clone ssh://git@server:2222/repo.git
```

## Read-Only Enforcement

Push operations are blocked at multiple levels:

1. **Repository mounted read-only** - Container cannot write to `/repos`
2. **git-receive-pack blocked** - Custom script rejects push commands
3. **Limited shell access** - Users can only execute git commands

When a client attempts to push:
```
$ git push
fatal: Push access is disabled on this read-only server.
This Rabit Git server only allows clone and fetch operations.
```

## Publisher Workflow

Your workflow on the host machine remains unchanged:

```bash
# Work in your local repository
cd ~/my-project
vim docs/new-feature.md
git add -A
git commit -m "Add new feature docs"

# Push to your main remote (GitHub, GitLab, etc.)
git push origin main

# Update the bare repo for the Git server
cd ~/rabit-git/repos/my-project.git
git fetch origin main:main
```

Or set up automatic updates with a post-receive hook on your main repository.

## Troubleshooting

### Permission Denied

```
Permission denied (publickey).
```

**Solutions:**
- Verify your public key is in `authorized_keys`
- Check file permissions: `chmod 600 authorized_keys`
- Ensure UID/GID matches your user: `id -u && id -g`
- Restart the container after adding keys

### Host Key Verification Failed

```
Host key verification failed.
```

**Solution:** Add server to known_hosts:
```bash
ssh-keyscan your-server >> ~/.ssh/known_hosts
# Or with custom port:
ssh-keyscan -p 2222 your-server >> ~/.ssh/known_hosts
```

### Connection Refused

```
Connection refused
```

**Check:**
- Is container running? `docker ps`
- Is port mapped correctly? `docker port rabit-git`
- Firewall blocking? `sudo ufw allow 22/tcp`

### Repository Not Found

```
fatal: 'project.git' does not appear to be a git repository
```

**Check:**
- Repository exists in `/repos` directory on host
- Repository is a bare repository (ends with `.git`)
- Container can access the volume: `docker exec rabit-git ls /repos`

## Security Considerations

### Read-Only Mount

Always mount repositories as read-only (`:ro`) to prevent any potential writes:

```yaml
volumes:
  - ./repos:/repos:ro
```

### SSH Key Management

- Store authorized_keys on the host for easy management
- Use separate keys for different users/teams
- Rotate keys periodically
- Remove keys when users leave

### Network Isolation

Consider running on a private network or using a VPN:

```yaml
networks:
  internal:
    driver: bridge
    internal: true
```

### Firewall Rules

If exposing to the internet, limit access by IP:

```bash
# UFW example
sudo ufw allow from 192.168.1.0/24 to any port 22
```

## Integration with Rabit Clients

Reference your Git server in `.burrow.json`:

```json
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.3.0/burrow",
  "kind": "burrow",
  "title": "My Documentation",
  "baseUri": "git@docs.company.com:api-docs.git",
  "entries": [
    {
      "id": "getting-started",
      "kind": "file",
      "uri": "docs/getting-started.md"
    }
  ]
}
```

## Performance

- **Lightweight** - Based on Alpine Linux
- **Fast** - Native Git protocol over SSH
- **Efficient** - No HTTP overhead
- **Scalable** - Serve hundreds of repositories from one container

## Building the Image

```bash
cd packages/rabit-server/git
docker build -t fwdslsh/rabit-server-git:latest .
```

## See Also

- [Rabit Specification](../../../docs/rabit-spec.md)
- [Rabit HTTP Server](../http/README.md)
- [Git Server Examples](../../../examples/server/git-readonly/)
- [Docker Hub](https://hub.docker.com/r/fwdslsh/rabit-server-git)

## License

CC-BY-4.0 License - See [LICENSE](../LICENSE) file for details.
