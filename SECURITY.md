# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.3.x   | :white_check_mark: |
| < 0.3   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Rabit, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email security concerns to the maintainers (see repository for contact)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

We aim to respond within 48 hours and will work with you to understand and address the issue.

## Security Considerations

### What Rabit Is

Rabit is a **content discovery convention**—a way to publish machine-readable indexes of content. It is:

- A JSON manifest format (`.burrow.json`, `.warren.json`)
- A set of conventions for organizing content
- Transport-agnostic (works with HTTP, Git, local files)

### What Rabit Is NOT

Rabit is **not** an access control mechanism. The specification explicitly states (§12):

> These files are not access control mechanisms. Publishing them can reveal information about repository structure.

### Publisher Responsibilities

If you publish a burrow:

1. **Do not include sensitive paths** in your manifest entries
2. **Use appropriate transport security** (HTTPS, SSH for Git)
3. **Control access at the transport layer** (web server auth, Git permissions)
4. **Review manifests before publishing** to avoid leaking internal structure

### Client Implementation Security

Implementations of Rabit clients should:

1. **Validate URIs** before fetching (avoid SSRF)
2. **Respect rate limits** and implement backoff
3. **Verify sha256 hashes** when present
4. **Redact credentials** from logs
5. **Set reasonable timeouts** and size limits
6. **Use TLS** by default, require explicit opt-in for insecure connections

See `packages/rabit-client/docs/CLIENT_SPEC.md` §8 for detailed security guidance.

### Server Implementation Security

If running a Rabit server:

1. **Run as non-root** user
2. **Restrict CORS** to known origins
3. **Disable directory listing** unless explicitly needed
4. **Set size limits** on manifest generation
5. **Use read-only mounts** for content directories
6. **Enable authentication** for sensitive content

## Known Limitations

### No Manifest Signing

The current specification does not include manifest signing. This means:

- Manifests fetched over HTTPS are protected by TLS
- Manifests in Git repos can use Git commit signatures
- There is no built-in way to verify manifest integrity independent of transport

**Mitigation:** Use trusted transports (HTTPS with valid certificates, signed Git commits).

### Entry Integrity vs. Manifest Integrity

The `sha256` field on entries allows verifying **entry content**, but does not protect the manifest itself. A compromised manifest could:

- Remove entries
- Change entry metadata (title, summary)
- Point to different URIs

**Mitigation:** Fetch manifests from trusted sources; use Git for versioning and audit trail.

## Threat Model

### In Scope

- Manifest tampering during transit (mitigated by HTTPS/Git)
- Entry content tampering (mitigated by sha256 verification)
- Resource exhaustion (mitigated by client rate limits and size limits)
- Information disclosure via manifest (publisher responsibility)

### Out of Scope

- Authentication and authorization (use transport-layer controls)
- Manifest signing (future consideration)
- DDoS protection (infrastructure concern)
- Client-side code execution (Rabit is data, not code)

## Updates

This security policy may be updated as the specification evolves. Check the repository for the latest version.
