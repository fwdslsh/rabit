# Read-Only Git Server for Rabit Burrows

Share your Rabit burrows via Git with authenticated clients while enforcing read-only access. Perfect for:

- Sharing documentation with team members
- Publishing burrows to authenticated clients
- Home lab and internal network deployments
- Maintaining your normal workflow (edit freely on host)

## Features

- **Clean URLs** — `git clone git@server:my-burrow.git` (no `/srv/git` prefix)
- **SSH key auth** — No passwords, secure access via `authorized_keys`
- **Read-only** — Clients can clone/fetch but not push
- **No symlinks** — Mount your repos directory directly
- **No root** — Files accessible with your normal user account
- **Standard ports** — Use port 22 by default, or any port you choose

## Quick Start

```bash
# 1. Initialize
./setup.sh

# 2. Add your SSH public key
cat ~/.ssh/id_ed25519.pub >> ssh-keys/authorized_keys

# 3. Add a repository
cp -r /path/to/my-project.git repos/
# Or create a bare clone:
git clone --bare https://github.com/you/project repos/project.git

# 4. Start
docker compose up -d

# 5. Clone from any machine with the private key
git clone git@your-server:project.git
```

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         Host Machine                             │
│                                                                  │
│  ┌──────────────────┐    ┌────────────────────────────────────┐ │
│  │  Your Repos      │    │  Git Server Container              │ │
│  │  ~/repos/        │◄───┤  (rockstorm/git-server)            │ │
│  │                  │ ro │                                     │ │
│  │  Edit & commit   │    │  - SSH on port 22                  │ │
│  │  as usual        │    │  - Rejects push (read-only)        │ │
│  └──────────────────┘    │  - Serves clone/fetch              │ │
│                          └────────────────────────────────────┘ │
│                                      │                           │
│  ┌──────────────────┐                │                           │
│  │  authorized_keys │◄───────────────┘                           │
│  │  (you manage)    │                                            │
│  └──────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ SSH
                                ▼
                    ┌───────────────────────┐
                    │  Authorized Clients   │
                    │  ✓ git clone          │
                    │  ✓ git fetch          │
                    │  ✗ git push (blocked) │
                    └───────────────────────┘
```

## Directory Structure

```
git-readonly/
├── docker-compose.yml      # Server configuration
├── setup.sh                # One-command initialization
├── .env                    # Generated config (ports, paths, UID/GID)
├── repos/                  # Your Git repositories
│   ├── project-a.git/
│   └── docs.git/
├── ssh-keys/
│   ├── authorized_keys     # Public keys of allowed clients
│   └── host-keys/          # SSH host keys (generated)
├── config/
│   └── sshd_config         # SSH server configuration
└── git-shell-commands/     # Read-only enforcement scripts
```

## Configuration

### Using a Different Port

If port 22 is already in use:

```bash
./setup.sh --port 2222
```

Or edit `.env`:
```bash
SSH_PORT=2222
```

Clients then use:
```bash
git clone ssh://git@server:2222/project.git
```

### Using an Existing Repos Directory

Point to your existing bare repositories:

```bash
./setup.sh /home/user/git-repos
```

Or edit `.env`:
```bash
REPOS_PATH=/home/user/git-repos
```

### Adding Authorized Keys

```bash
# Your own key
cat ~/.ssh/id_ed25519.pub >> ssh-keys/authorized_keys

# From GitHub
curl https://github.com/username.keys >> ssh-keys/authorized_keys

# From GitLab
curl https://gitlab.com/username.keys >> ssh-keys/authorized_keys

# Multiple people
cat >> ssh-keys/authorized_keys << 'EOF'
ssh-ed25519 AAAAC3... alice@example.com
ssh-rsa AAAAB3... bob@example.com
EOF
```

### Adding Repositories

**Option 1: Copy bare repository**
```bash
cp -r /path/to/project.git repos/
```

**Option 2: Create bare clone**
```bash
git clone --bare https://github.com/org/project repos/project.git
```

**Option 3: Create from working directory**
```bash
cd /path/to/project
git clone --bare . /path/to/git-readonly/repos/project.git
```

## Client Usage

### Standard Port (22)

```bash
git clone git@your-server:my-burrow.git
```

### Custom Port

```bash
git clone ssh://git@your-server:2222/my-burrow.git
```

### In .burrow.json

Reference the Git server in your burrow manifest:

```json
{
  "rbt": "0.2",
  "manifest": {
    "title": "My Documentation",
    "roots": [
      {
        "git": {
          "remote": "git@docs.company.com:api-docs.git",
          "ref": "refs/heads/main"
        }
      }
    ]
  }
}
```

For home lab with self-signed certs, add HTTPS fallback:

```json
{
  "roots": [
    {
      "git": {
        "remote": "git@homelab.local:docs.git",
        "ref": "refs/heads/main"
      }
    },
    {
      "http": {
        "base": "https://homelab.local/docs/",
        "insecure": true
      }
    }
  ]
}
```

## Read-Only Enforcement

Push operations are blocked at multiple levels:

1. **Repository mounted read-only** — Container can't write to `/repos`
2. **git-receive-pack blocked** — Custom script rejects push commands
3. **No shell access** — Users can only execute git commands

When a client tries to push:
```
$ git push
fatal: Push access is disabled on this read-only server.
This Rabit Git server only allows clone and fetch operations.
```

## Publisher Workflow

Your workflow on the host machine is unchanged:

```bash
# Edit your burrow
cd ~/my-project
vim docs/new-feature.md

# Commit and push to your main remote
git add -A
git commit -m "Add new feature docs"
git push origin main   # Push to GitHub/GitLab as usual

# Update the bare repo for the Git server
cd ~/git-readonly/repos/my-project.git
git fetch origin main:main   # Or set up a post-receive hook
```

Or simply work directly in a repo that's served:
```bash
# If repos/ contains your working repos (not just bare)
cd ~/git-readonly/repos/my-project
vim docs/new-feature.md
git add -A && git commit -m "Update"
# Changes are immediately available to clients
```

## Troubleshooting

### Permission Denied

```
Permission denied (publickey).
```

- Check your public key is in `ssh-keys/authorized_keys`
- Verify file permissions: `chmod 600 ssh-keys/authorized_keys`
- Check UID/GID in `.env` matches your user: `id -u && id -g`

### Host Key Verification Failed

```
Host key verification failed.
```

First connection — add to known_hosts:
```bash
ssh-keyscan your-server >> ~/.ssh/known_hosts
# Or with custom port:
ssh-keyscan -p 2222 your-server >> ~/.ssh/known_hosts
```

### Connection Refused

```
Connection refused
```

- Is container running? `docker compose ps`
- Is port correct? Check `.env` and `docker compose port git-server 22`
- Firewall blocking? `sudo ufw allow 22/tcp`

### Push Rejected (Expected!)

```
fatal: Push access is disabled
```

This is correct behavior — the server is read-only by design.

## Advanced: With Web Server

Add HTTPS access alongside Git:

```bash
# Start both Git and web servers
docker compose --profile web up -d

# Now accessible via:
# - Git: git@server:my-burrow.git
# - Web: http://localhost:8080/.burrow.json
```

Configure in `.env`:
```bash
WEB_PORT=8080
BURROW_TITLE=My Documentation
BURROW_DIR=my-burrow.git
```

## See Also

- [Rabit Specification](../../../docs/rabit-spec-v0.3.0.md) — Full RBT spec with transport protocol details
- [rockstorm/git-server](https://github.com/rockstorm101/git-server-docker) — Base Docker image
- [Rabit Client](../../../packages/rabit-client/) — TypeScript client implementation
