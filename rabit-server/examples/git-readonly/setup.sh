#!/bin/bash
#
# Setup script for Rabit Git Server (Read-Only)
#
# This script initializes the directory structure and generates
# SSH host keys for the Git server.
#
# Usage: ./setup.sh [burrow-path]
#
# Arguments:
#   burrow-path  Optional path to an existing burrow/repo to link

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Create directories
log_info "Creating directory structure..."
mkdir -p repos
mkdir -p ssh-keys/host-keys

# Create .env file with host UID/GID
log_info "Detecting host user UID/GID..."
cat > .env << EOF
# Host user UID/GID for seamless file access
HOST_UID=$(id -u)
HOST_GID=$(id -g)

# SSH port for Git server
GIT_SSH_PORT=2222

# Web server port (if using --profile web)
WEB_PORT=8080

# Burrow configuration
BURROW_TITLE=My Burrow
BURROW_NAME=my-burrow.git
EOF

log_info "Created .env with UID=$(id -u), GID=$(id -g)"

# Generate SSH host keys if they don't exist
if [ ! -f ssh-keys/host-keys/ssh_host_rsa_key ]; then
    log_info "Generating SSH host keys..."
    ssh-keygen -t rsa -b 4096 -f ssh-keys/host-keys/ssh_host_rsa_key -N "" -q
    ssh-keygen -t ed25519 -f ssh-keys/host-keys/ssh_host_ed25519_key -N "" -q
    ssh-keygen -t ecdsa -b 521 -f ssh-keys/host-keys/ssh_host_ecdsa_key -N "" -q
    log_info "SSH host keys generated"
else
    log_info "SSH host keys already exist"
fi

# Create empty authorized_keys if it doesn't exist
if [ ! -f ssh-keys/authorized_keys ]; then
    touch ssh-keys/authorized_keys
    chmod 600 ssh-keys/authorized_keys
    log_info "Created empty authorized_keys file"
    log_warn "Add public keys to ssh-keys/authorized_keys before starting the server"
else
    log_info "authorized_keys file already exists"
fi

# Make git-shell-commands executable
chmod +x git-shell-commands/*
log_info "Made git-shell-commands executable"

# Handle optional burrow path argument
if [ -n "$1" ]; then
    BURROW_PATH="$1"
    BURROW_NAME=$(basename "$BURROW_PATH")

    # Ensure .git suffix for bare repos
    if [[ ! "$BURROW_NAME" == *.git ]]; then
        BURROW_NAME="${BURROW_NAME}.git"
    fi

    if [ -d "$BURROW_PATH" ]; then
        # Check if it's a git repo
        if [ -d "$BURROW_PATH/.git" ] || [ -f "$BURROW_PATH/HEAD" ]; then
            log_info "Linking burrow: $BURROW_PATH -> repos/$BURROW_NAME"

            # Create symbolic link
            ln -sf "$(realpath "$BURROW_PATH")" "repos/$BURROW_NAME"

            # Update .env with burrow name
            sed -i "s/^BURROW_NAME=.*/BURROW_NAME=$BURROW_NAME/" .env

            log_info "Burrow linked successfully"
        else
            log_warn "$BURROW_PATH is not a Git repository"
            log_info "To share a non-git directory, first initialize it:"
            log_info "  cd $BURROW_PATH && git init && git add -A && git commit -m 'Initial'"
        fi
    else
        log_error "Path does not exist: $BURROW_PATH"
        exit 1
    fi
fi

# Print summary
echo ""
log_info "Setup complete!"
echo ""
echo "Next steps:"
echo ""
echo "  1. Add authorized public keys:"
echo "     cat ~/.ssh/id_rsa.pub >> ssh-keys/authorized_keys"
echo "     # Or fetch from GitHub:"
echo "     curl https://github.com/USERNAME.keys >> ssh-keys/authorized_keys"
echo ""
echo "  2. Add or link repositories:"
echo "     ln -s /path/to/your/repo repos/my-burrow.git"
echo "     # Or copy:"
echo "     git clone --bare /path/to/repo repos/my-burrow.git"
echo ""
echo "  3. Start the server:"
echo "     docker compose up -d"
echo ""
echo "  4. Clone from clients:"
echo "     git clone ssh://git@localhost:2222/srv/git/my-burrow.git"
echo ""
echo "  5. Optional - start with web server:"
echo "     docker compose --profile web up -d"
echo ""
