# Rabit: Burrows for the Agentic Web

> A simple convention for publishing content that both humans and AI agents can navigate reliably.

Rabit is a dotfile convention that lets you create machine-readable manifests (`.burrow.json`) that describe your content structure. Think of it as a table of contents for the agentic age.

```json
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.4.0/burrow",
  "kind": "burrow",
  "title": "My Project",
  "entries": [
    {
      "id": "docs",
      "kind": "dir",
      "uri": "docs/",
      "title": "Documentation"
    },
    {
      "id": "api",
      "kind": "file",
      "uri": "API.md",
      "title": "API Reference"
    }
  ]
}
```

**No new infrastructure. Just JSON files in your repo.**

---

## Why Rabit?

- **Agents can discover what you have** without scraping or guessing
- **Works across transports** (HTTP, Git, local files, etc.)
- **Human and agent friendly** — your files stay unchanged
- **Zero dependencies** — single manifest file per directory
- **Optional guidance** — hints for how AI should interpret your content

---

## Get Started in 3 Steps

### 1. Create `.burrow.json`

```json
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.4.0/burrow",
  "kind": "burrow",
  "title": "My Documentation",
  "entries": [
    {
      "id": "readme",
      "kind": "file",
      "uri": "README.md",
      "title": "Getting Started"
    }
  ]
}
```

### 2. (Optional) Create `.burrow.md` companion

```markdown
# My Documentation

A human-readable guide to navigating this burrow.
Start with README.md, then explore the API reference.
```

### 3. Done!

Agents can now discover and traverse your content with a manifest as your guide.

---

## Learn More

**New to Rabit?**
- [What is Rabit and why does it exist?](./docs/about.md) — Read the philosophy and history
- [Implementation Guide](./docs/guide.md) — Learn terminology, conventions, and best practices

**Technical Details**
- [Complete Specification](./docs/rabit-spec.md) — Full v0.4.0 spec with all details
- [Client Implementation](./packages/rabit-client/) — Traverse burrows programmatically
- [Examples](./examples/) — See real burrow structures and use cases

**Related Projects**
- [Server](./packages/rabit-server/) — Host manifests via HTTP or git
- [MCP Plugin](./packages/rabit-mcp/) — Use burrows with Claude and other AI tools
- [OpenCode Plugin](./packages/opencode-rabit/) — Integrate with OpenCode environment

---

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `docs/` | Specification and guides |
| `schemas/` | JSON Schema validation files |
| `packages/rabit-client/` | Reference client (TypeScript/Bun) |
| `packages/rabit-server/` | Server implementation (Docker) |
| `packages/rabit-mcp/` | Model Context Protocol plugin |
| `packages/opencode-rabit/` | OpenCode extension |
| `examples/` | Example burrows and use cases |

---

## Quick Reference

### Entry Types

- **`file`** — A single document or resource
- **`dir`** — A directory without structured metadata
- **`burrow`** — A subdirectory with its own manifest (nested structure)
- **`map`** — Reference to a separate burrow manifest file
- **`link`** — External URI or resource

### File Naming

Rabit supports three conventions:

1. **`.burrow.json`** (dotfile) — Git-friendly, recommended
2. **`burrow.json`** (standard) — Web server-friendly
3. **`.well-known/burrow.json`** — RFC 8615 compliant

Clients try them in order and use the first one they find.

### Key Fields

Every entry needs:
- `id` — Unique identifier
- `kind` — Entry type (file, dir, burrow, map, link)
- `uri` — Location (relative or absolute)

Optional but useful:
- `title` — Human-readable name
- `summary` — Brief description for agents
- `priority` — Higher = more prominent
- `mediaType` — MIME type (e.g., `text/markdown`)
- `tags` — Categorization array

---

## License

CC-BY-4.0 — Free to use and modify with attribution.

---

**Have questions?** Check [docs/about.md](./docs/about.md) for the full story or [docs/guide.md](./docs/guide.md) for detailed implementation guidance.
