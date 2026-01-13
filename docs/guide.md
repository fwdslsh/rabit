# Rabit Implementation Guide

**Version:** 0.4.0

---

## Terminology

| Term | Description |
|------|-------------|
| **Burrow** | A content collection with a `.burrow.json` manifest |
| **Warren** | A registry of burrows (`.warren.json`) |
| **Entry** | A menu item (file, directory, sub-burrow, external link, or manifest reference) |
| **Kind** | Entry type: `file`, `dir`, `burrow`, `map`, or `link` |

---

## File Naming Conventions

Rabit supports three file naming conventions to accommodate different hosting environments:

1. **`.burrow.json`** (dotfile) - Recommended for git repositories and filesystems. Keeps files unobtrusive.
2. **`burrow.json`** (no dot) - Use when web servers block dotfiles or for better visibility.
3. **`.well-known/burrow.json`** - Use for enterprise environments following RFC 8615.

The same applies to warrens (`.warren.json`, `warren.json`, `.well-known/warren.json`) and companion markdown files.

**Discovery order:** Clients try dotfile → no-dot → .well-known, stopping at the first successful response.

---

## Quick Start: Creating a Burrow

Publishing a burrow takes three steps:

### 1. Create a burrow manifest

Choose your preferred naming convention (`.burrow.json` recommended for git repos):

```json
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.4.0/burrow",
  "kind": "burrow",
  "title": "My Documentation",
  "description": "Documentation for my project.",
  "updated": "2026-01-13T00:00:00Z",
  "baseUri": "https://docs.example.com/",
  "entries": [
    {
      "id": "readme",
      "kind": "file",
      "uri": "README.md",
      "title": "Getting Started",
      "summary": "Introduction and setup guide.",
      "mediaType": "text/markdown",
      "priority": 100
    },
    {
      "id": "api",
      "kind": "dir",
      "uri": "api/",
      "title": "API Reference",
      "summary": "Complete API documentation.",
      "priority": 80
    },
    {
      "id": "legacy-api",
      "kind": "map",
      "uri": "legacy/api.burrow.json",
      "title": "Legacy API",
      "summary": "Documentation for deprecated API endpoints."
    }
  ]
}
```

### 2. Optionally create a companion markdown file

```markdown
# My Documentation

## Start here
Read the README first, then explore the API Reference.

## High-value paths
- README.md — Installation and quick start
- api/ — Complete API documentation
- Legacy API — Deprecated endpoints (for reference only)
```

### 3. That's it!

Your burrow is ready. Agents can discover it, read the manifest, and navigate your content.

---

## Entry Schema

Each entry in a burrow has:

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier within the burrow |
| `kind` | Yes | Entry type: `file`, `dir`, `burrow`, `map`, or `link` |
| `uri` | Yes | Location (relative or absolute) |
| `title` | No | Human-readable title |
| `summary` | No | Brief description for agents |
| `path` | No | Relative path inside the burrow |
| `mediaType` | No | MIME type (e.g., `text/markdown`) |
| `sizeBytes` | No | File size in bytes |
| `sha256` | No | SHA256 hex digest for cache validation |
| `tags` | No | Array of categorization tags |
| `priority` | No | Number: higher = more prominent in menus |
| `metadata` | No | Custom metadata object (for extensibility) |

### Entry Kind Reference

- **`file`** — A single file (markdown, HTML, image, etc.)
- **`dir`** — A directory without its own `.burrow.json` file
- **`burrow`** — A subdirectory with its own `.burrow.json` manifest (recursive burrows)
- **`map`** — A reference to a specific burrow manifest file (e.g., `docs-api.burrow.json`)
- **`link`** — An external URI or resource not directly hosted

---

## Creating a Warren

A warren is a registry of burrows:

```json
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.4.0/warren",
  "kind": "warren",
  "title": "My Organization",
  "description": "Central registry of all company burrows",
  "updated": "2026-01-13T00:00:00Z",
  "baseUri": "https://example.com/",
  "burrows": [
    {
      "id": "docs",
      "uri": "https://docs.example.com/",
      "title": "Documentation",
      "description": "User-facing documentation",
      "tags": ["docs", "guide"],
      "priority": 100
    },
    {
      "id": "api",
      "uri": "https://api.example.com/",
      "title": "API Reference",
      "description": "REST and GraphQL API documentation",
      "tags": ["api", "reference"]
    },
    {
      "id": "blog",
      "uri": "https://blog.example.com/",
      "title": "Engineering Blog",
      "description": "Technical articles and updates",
      "tags": ["blog", "news"]
    }
  ],
  "warrens": [
    {
      "id": "partners",
      "uri": "https://partners.example.com/.warren.json",
      "title": "Partner Networks",
      "description": "External partner burrows and resources"
    }
  ]
}
```

### Warren Fields

| Field | Required | Description |
|-------|----------|-------------|
| `specVersion` | Yes | Schema version identifier |
| `kind` | Yes | Must be `"warren"` |
| `title` | No | Human-readable title |
| `description` | No | Brief description |
| `updated` | No | RFC 3339 timestamp of last update |
| `baseUri` | No | Base URI for resolving relative paths |
| `burrows` | No | Array of burrow references |
| `warrens` | No | Array of warren references (federation) |
| `metadata` | No | Custom metadata object |

---

## Agent Instructions

Optionally provide guidance for AI agents in your burrow or warren:

```json
{
  "agents": {
    "context": "Technical documentation for a payment API. Comprehensive guide covering authentication, transactions, webhooks, and error handling.",
    "entryPoint": "quickstart",
    "hints": [
      "Always start with the quickstart guide for first-time users",
      "Code examples are in the /examples directory",
      "Webhook documentation is critical for integration",
      "See SECURITY.md for authentication best practices"
    ]
  }
}
```

### Agent Instruction Fields

| Field | Description |
|-------|-------------|
| `context` | Brief description for LLM context (recommended: under 500 characters) |
| `entryPoint` | Suggested starting entry ID for agents |
| `hints` | Array of freeform processing hints for agents |

---

## Example: Multi-level Burrow Structure

Here's a realistic example with nested burrows:

```
company-docs/
├── .burrow.json (root burrow)
├── README.md
├── guides/
│   ├── .burrow.json (sub-burrow)
│   ├── getting-started.md
│   └── advanced-topics.md
├── api/
│   ├── .burrow.json (sub-burrow)
│   ├── rest-api.md
│   └── graphql-api.md
├── legacy-api.burrow.json (separate manifest, referenced with kind: "map")
└── SECURITY.md
```

Root `.burrow.json`:

```json
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.4.0/burrow",
  "kind": "burrow",
  "title": "Company Documentation",
  "entries": [
    {
      "id": "readme",
      "kind": "file",
      "uri": "README.md",
      "title": "Welcome",
      "priority": 100
    },
    {
      "id": "guides",
      "kind": "burrow",
      "uri": "guides/",
      "title": "Guides",
      "priority": 90
    },
    {
      "id": "api",
      "kind": "burrow",
      "uri": "api/",
      "title": "API Reference",
      "priority": 85
    },
    {
      "id": "legacy",
      "kind": "map",
      "uri": "legacy-api.burrow.json",
      "title": "Legacy API",
      "summary": "Deprecated - for reference only"
    },
    {
      "id": "security",
      "kind": "file",
      "uri": "SECURITY.md",
      "title": "Security",
      "priority": 50
    }
  ]
}
```

---

## Best Practices

1. **Use consistent `priority` values** to guide agent traversal
2. **Include `summary`** for brief descriptions that agents will reference
3. **Add `mediaType`** for files (helps agents understand content)
4. **Create sub-burrows** for logically distinct sections (don't create monolithic burrow files)
5. **Use `kind: "map"`** to point to separate burrow files for different topics
6. **Include agent instructions** to help LLM tools understand your content's purpose
7. **Provide a companion `.burrow.md`** for human readers

---

## Learn More

- **Full Specification:** [rabit-spec.md](./rabit-spec.md)
- **Client Implementation:** [../packages/rabit-client/](../packages/rabit-client/)
- **Examples:** [../examples/](../examples/)
