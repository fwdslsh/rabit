# Rabit Git Server - Read-Only SSH-Based Repository Server
#
# Official Docker image for serving Rabit burrows via Git with SSH key authentication
# Default configuration enforces read-only access (clone/fetch only, no push)
#
# Usage:
#   docker run -d \
#     -p 22:22 \
#     -v ./repos:/repos:ro \
#     -v ./authorized_keys:/home/git/.ssh/authorized_keys:ro \
#     fwdslsh/rabit-server-git
#
FROM rockstorm/git-server:latest

LABEL org.opencontainers.image.title="Rabit Git Server"
LABEL org.opencontainers.image.description="Read-only Git server for Rabit burrows with SSH key authentication"
LABEL org.opencontainers.image.version="0.3.0"
LABEL org.opencontainers.image.vendor="fwdslsh"
LABEL org.opencontainers.image.source="https://github.com/fwdslsh/rabit"
LABEL org.opencontainers.image.documentation="https://github.com/fwdslsh/rabit/tree/main/packages/rabit-server/git"

# Copy SSH server configuration for clean URLs
COPY config/sshd_config /etc/ssh/sshd_config.template

# Copy read-only enforcement scripts
COPY git-shell-commands /home/git/git-shell-commands.template

# Create setup script to initialize on first run
RUN echo '#!/bin/sh' > /usr/local/bin/rabit-init.sh && \
    echo 'set -e' >> /usr/local/bin/rabit-init.sh && \
    echo '# Copy templates to proper locations if not already set up' >> /usr/local/bin/rabit-init.sh && \
    echo 'if [ ! -f /home/git/git-shell-commands/git-receive-pack ]; then' >> /usr/local/bin/rabit-init.sh && \
    echo '  cp -r /home/git/git-shell-commands.template/* /home/git/git-shell-commands/' >> /usr/local/bin/rabit-init.sh && \
    echo '  chmod +x /home/git/git-shell-commands/*' >> /usr/local/bin/rabit-init.sh && \
    echo '  chown -R git:git /home/git/git-shell-commands' >> /usr/local/bin/rabit-init.sh && \
    echo 'fi' >> /usr/local/bin/rabit-init.sh && \
    echo '# Merge custom sshd config if needed' >> /usr/local/bin/rabit-init.sh && \
    echo 'if [ ! -f /etc/ssh/sshd_config.rabit ]; then' >> /usr/local/bin/rabit-init.sh && \
    echo '  cat /etc/ssh/sshd_config.template >> /etc/ssh/sshd_config' >> /usr/local/bin/rabit-init.sh && \
    echo '  touch /etc/ssh/sshd_config.rabit' >> /usr/local/bin/rabit-init.sh && \
    echo 'fi' >> /usr/local/bin/rabit-init.sh && \
    echo 'exec /docker-entrypoint.sh "$@"' >> /usr/local/bin/rabit-init.sh && \
    chmod +x /usr/local/bin/rabit-init.sh

# Environment variables
ENV GIT_BASE_PATH=/repos \
    SSH_AUTH_METHODS=publickey

# Repository volume (mount as read-only in docker run/compose)
VOLUME ["/repos"]

# SSH keys volume
VOLUME ["/home/git/.ssh"]

# Expose SSH port
EXPOSE 22

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD pgrep sshd || exit 1

ENTRYPOINT ["/usr/local/bin/rabit-init.sh"]
CMD ["sshd"]
