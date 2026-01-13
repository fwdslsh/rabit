#!/bin/bash
#
# Setup script for Rabit Git Server (Read-Only)
#
# This script initializes the directory structure for hosting
# read-only Git access to your burrows.
#
# Usage:
#   ./setup.sh                    # Basic setup
#   ./setup.sh /path/to/repo      # Setup and configure repo path
#   ./setup.sh --port 2222        # Use non-standard SSH port

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Parse arguments
SSH_PORT="22"
REPOS_PATH=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --port|-p)
            SSH_PORT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS] [REPOS_PATH]"
            echo ""
            echo "Options:"
            echo "  --port, -p PORT    SSH port (default: 22)"
            echo "  --help, -h         Show this help"
            echo ""
            echo "Arguments:"
            echo "  REPOS_PATH         Path to directory containing Git repositories"
            echo "                     (default: ./repos in this directory)"
            exit 0
            ;;
        *)
            REPOS_PATH="$1"
            shift
            ;;
    esac
done

echo ""
echo "============================================"
echo "  Rabit Git Server Setup (Read-Only)"
echo "============================================"
echo ""

# Create directories
log_step "Creating directory structure..."
mkdir -p repos
mkdir -p ssh-keys/host-keys
mkdir -p config

# Detect host UID/GID
HOST_UID=$(id -u)
HOST_GID=$(id -g)

# Create .env file
log_step "Creating configuration..."
cat > .env << EOF
# Rabit Git Server Configuration
# Generated on $(date -Iseconds)

# Host user UID/GID for seamless file access (no root required)
HOST_UID=${HOST_UID}
HOST_GID=${HOST_GID}

# SSH port (use 22 for standard, or higher port if 22 is in use)
SSH_PORT=${SSH_PORT}

# Repository path (absolute or relative to this directory)
# Point this to your existing repos directory, no symlinks needed
REPOS_PATH=${REPOS_PATH:-./repos}

# Web server settings (optional, with --profile web)
WEB_PORT=8080
WEB_BASE_URL=
BURROW_TITLE=My Burrow
BURROW_DIR=
EOF

log_info "Created .env (UID=${HOST_UID}, GID=${HOST_GID}, SSH_PORT=${SSH_PORT})"

# Generate SSH host keys if they don't exist
if [ ! -f ssh-keys/host-keys/ssh_host_rsa_key ]; then
    log_step "Generating SSH host keys..."
    ssh-keygen -t rsa -b 4096 -f ssh-keys/host-keys/ssh_host_rsa_key -N "" -q
    ssh-keygen -t ed25519 -f ssh-keys/host-keys/ssh_host_ed25519_key -N "" -q
    ssh-keygen -t ecdsa -b 521 -f ssh-keys/host-keys/ssh_host_ecdsa_key -N "" -q
    chmod 600 ssh-keys/host-keys/*_key
    chmod 644 ssh-keys/host-keys/*.pub
    log_info "SSH host keys generated"
else
    log_info "SSH host keys already exist (keeping existing)"
fi

# Create empty authorized_keys if it doesn't exist
if [ ! -f ssh-keys/authorized_keys ]; then
    touch ssh-keys/authorized_keys
    chmod 600 ssh-keys/authorized_keys
    log_info "Created empty authorized_keys file"
else
    KEY_COUNT=$(wc -l < ssh-keys/authorized_keys | tr -d ' ')
    log_info "authorized_keys exists (${KEY_COUNT} keys)"
fi

# Make git-shell-commands executable
chmod +x git-shell-commands/* 2>/dev/null || true
log_info "Made git-shell-commands executable"

# Handle custom repos path
if [ -n "$REPOS_PATH" ] && [ "$REPOS_PATH" != "./repos" ]; then
    REPOS_PATH=$(realpath "$REPOS_PATH" 2>/dev/null || echo "$REPOS_PATH")
    sed -i "s|^REPOS_PATH=.*|REPOS_PATH=${REPOS_PATH}|" .env
    log_info "Repository path set to: ${REPOS_PATH}"

    # List available repos
    if [ -d "$REPOS_PATH" ]; then
        REPO_COUNT=$(find "$REPOS_PATH" -maxdepth 1 -type d -name "*.git" 2>/dev/null | wc -l)
        if [ "$REPO_COUNT" -gt 0 ]; then
            log_info "Found ${REPO_COUNT} Git repositories"
        fi
    fi
fi

# Print server fingerprints
echo ""
log_step "SSH Server Fingerprints (for client verification):"
echo ""
for keyfile in ssh-keys/host-keys/*.pub; do
    if [ -f "$keyfile" ]; then
        fingerprint=$(ssh-keygen -lf "$keyfile" 2>/dev/null | awk '{print $2}')
        keytype=$(ssh-keygen -lf "$keyfile" 2>/dev/null | awk '{print $4}' | tr -d '()')
        echo "  ${keytype}: ${fingerprint}"
    fi
done

# Print summary
echo ""
echo "============================================"
log_info "Setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo ""
echo "  ${BLUE}1.${NC} Add authorized SSH public keys:"
echo "     ${GREEN}cat ~/.ssh/id_ed25519.pub >> ssh-keys/authorized_keys${NC}"
echo ""
echo "     Or from GitHub/GitLab:"
echo "     ${GREEN}curl https://github.com/USERNAME.keys >> ssh-keys/authorized_keys${NC}"
echo ""
echo "  ${BLUE}2.${NC} Add repositories to ./repos/ (or set REPOS_PATH in .env):"
echo "     ${GREEN}cp -r /path/to/my-project.git repos/${NC}"
echo "     ${GREEN}git clone --bare https://github.com/org/repo repos/repo.git${NC}"
echo ""
echo "  ${BLUE}3.${NC} Start the server:"
echo "     ${GREEN}docker compose up -d${NC}"
echo ""
echo "  ${BLUE}4.${NC} Clients clone using clean URLs:"
if [ "$SSH_PORT" = "22" ]; then
    echo "     ${GREEN}git clone git@<your-host>:my-project.git${NC}"
else
    echo "     ${GREEN}git clone ssh://git@<your-host>:${SSH_PORT}/my-project.git${NC}"
fi
echo ""
echo "  ${BLUE}5.${NC} Optional - include web server for HTTPS access:"
echo "     ${GREEN}docker compose --profile web up -d${NC}"
echo ""
