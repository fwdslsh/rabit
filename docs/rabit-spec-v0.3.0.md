# Rabit Burrow & Warren Specification

**Version:** 0.3.0
**Date:** 2026-01-13
**Status:** Draft

---

## 1. Purpose

Rabit defines a **convention of well-known dotfiles** that allow agents and tools to:

- Discover what content exists in a location *without crawling*
- Navigate directly to relevant files and sub-collections using a compact "menu"
- Reduce compute and token usage by providing precomputed metadata (paths, summaries, tags, hashes)
- Work across **existing transports** (filesystem, HTTP(S), Git, SSH/SFTP, etc.) by referencing standard URIs

This is intentionally analogous to the way Gopher servers provide a menu of items, but expressed as modern **JSON + Markdown** that can live in repos, directories, or web roots.

---

## 2. Non-goals

This specification **does not** define:

- A new URL/URI scheme (use standard URIs)
- Authentication, authorization, or secret management
- A transport protocol (HTTP, Git, SFTP, etc. are out of scope)
- A remote execution API
- Conformance levels or certification requirements

---

## 3. Terminology

- **Burrow**: A browsable content collection (e.g., a repo root, a docs folder, a web directory)
- **Warren**: A registry index that points to one or more Burrows (and optionally other Warrens)
- **Entry**: A single menu item within a Burrow (file, directory, external URI, or child burrow)
- **Agent**: Any automated client (LLM tool, crawler, CLI) that consumes these files

---

## 4. Well-known Files

A location MAY contain any of these files:

| File | Purpose |
|------|---------|
| `.warren.json` | Machine-readable registry of burrows |
| `.warren.md` | Narrative "agent README" for the warren |
| `.burrow.json` | Machine-readable menu for a burrow |
| `.burrow.md` | Narrative "agent README" for the burrow |

### 4.1 Placement Rules

**Git repositories:**

- Place `.warren.*` and/or `.burrow.*` at the repository root
- Optionally place `.burrow.*` in key subdirectories to define sub-burrows (e.g., `docs/.burrow.json`)

**Filesystem directories:**

- Same as Git: place files in the directory being described

**HTTP(S):**

- Serve the files from the corresponding path location
- Example: if a directory is browsed at `https://example.com/docs/`, the burrow menu should be at `https://example.com/docs/.burrow.json`
- Note: some web servers block dotfiles by default; operators may need an explicit allowlist

### 4.2 Precedence

If both `.warren.json` and `.burrow.json` exist at the same location:

- Clients should treat the location as both a warren (registry) and a burrow (browsable collection)
- If a client must choose a single "landing" view, it should prefer `.warren.md` / `.warren.json` as the top-level entry

---

## 5. Discovery Algorithm

Given a starting URI `U` that refers to a directory-like location (or a repo root):

1. Attempt to fetch/read `U + "/.warren.json"`
   - If present and valid, the client has discovered a **Warren**
2. Attempt to fetch/read `U + "/.burrow.json"`
   - If present and valid, the client has discovered a **Burrow**
3. If neither exists, clients MAY:
   - Walk up parent paths (at most *N* levels; default 2) and repeat steps 1–2, OR
   - Fall back to transport-native listing (out of scope)

If both exist, clients should display a warren "registry view" and allow entering burrows.

---

## 6. Common Document Fields

All JSON documents share these top-level fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string | Recommended | JSON Schema URI for validation |
| `specVersion` | string | Required | Schema version identifier |
| `kind` | string | Required | `"warren"` or `"burrow"` |
| `title` | string | Optional | Human-readable title |
| `description` | string | Optional | Brief description |
| `updated` | string | Optional | RFC 3339 timestamp |
| `baseUri` | string | Optional | Base URI for resolving relative paths |
| `metadata` | object | Optional | Custom metadata for forward compatibility |
| `extensions` | object | Deprecated | Use `metadata` instead |

### 6.1 Schema Version Format

The `specVersion` field uses the format:

```
fwdslsh.dev/rabit/schemas/0.3.0/{kind}
```

Where `{kind}` is either `burrow` or `warren`.

Examples:

- `fwdslsh.dev/rabit/schemas/0.3.0/burrow`
- `fwdslsh.dev/rabit/schemas/0.3.0/warren`

### 6.2 URI Resolution

If `baseUri` is present, relative `uri` values in entries are resolved against it. If absent, relative URIs are resolved against the location where the JSON file was fetched.

---

## 7. Warren Schema (`.warren.json`)

A Warren is a registry of burrows (and optionally other warrens).

### 7.1 Structure

```json
{
  "$schema": "fwdslsh.dev/rabit/schemas/0.3.0/warren",
  "specVersion": "fwdslsh.dev/rabit/schemas/0.3.0/warren",
  "kind": "warren",
  "title": "Example Warren",
  "description": "Registry of burrows for Project X.",
  "updated": "2026-01-13T00:00:00Z",
  "baseUri": "https://example.com/",
  "burrows": [
    {
      "id": "docs",
      "title": "Documentation",
      "description": "Product and API documentation.",
      "uri": "docs/",
      "tags": ["docs", "start-here"],
      "priority": 10
    },
    {
      "id": "repo",
      "title": "Git Repository",
      "description": "Source code.",
      "uri": "https://github.com/org/repo",
      "tags": ["code"],
      "priority": 5
    }
  ],
  "warrens": [
    {
      "id": "org",
      "title": "Organization Warren",
      "uri": "https://example.com/org/.warren.json"
    }
  ]
}
```

### 7.2 Warren-specific Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `burrows` | array | Required* | Array of burrow references |
| `warrens` | array | Optional | Array of warren references (federation) |

*Required unless `warrens` is present.

### 7.3 Burrow Reference Object

Each item in `burrows`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Required | Stable identifier |
| `uri` | string | Required | Location of the burrow root |
| `title` | string | Optional | Human-readable title |
| `description` | string | Optional | Brief description |
| `tags` | array | Optional | Categorization tags |
| `priority` | number | Optional | Higher = more prominent in menus |
| `metadata` | object | Optional | Custom metadata for this burrow reference |

### 7.4 Warren Reference Object

Each item in `warrens`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Required | Stable identifier |
| `uri` | string | Required | Location of the warren |
| `title` | string | Optional | Human-readable title |
| `description` | string | Optional | Brief description |
| `metadata` | object | Optional | Custom metadata for this warren reference |

---

## 8. Burrow Schema (`.burrow.json`)

A Burrow is a structured "menu" of content entries.

### 8.1 Structure

```json
{
  "$schema": "fwdslsh.dev/rabit/schemas/0.3.0/burrow",
  "specVersion": "fwdslsh.dev/rabit/schemas/0.3.0/burrow",
  "kind": "burrow",
  "title": "Documentation Burrow",
  "description": "Documentation menu for agents.",
  "updated": "2026-01-13T00:00:00Z",
  "baseUri": "https://example.com/docs/",
  "repo": {
    "readme": "README.md",
    "license": "LICENSE"
  },
  "agents": {
    "context": "Technical documentation for Example Project API.",
    "entryPoint": "start",
    "hints": [
      "Start with the quickstart guide",
      "API reference is comprehensive but verbose"
    ]
  },
  "entries": [
    {
      "id": "start",
      "title": "Getting Started",
      "summary": "Overview and quick links.",
      "kind": "file",
      "path": "quickstart.md",
      "uri": "quickstart.md",
      "mediaType": "text/markdown",
      "tags": ["start-here"],
      "priority": 10
    },
    {
      "id": "api",
      "title": "API Reference",
      "summary": "Endpoints, schemas, examples.",
      "kind": "dir",
      "path": "api/",
      "uri": "api/",
      "tags": ["reference"],
      "priority": 7
    },
    {
      "id": "guides",
      "title": "Guides",
      "summary": "Step-by-step tutorials.",
      "kind": "burrow",
      "uri": "guides/",
      "tags": ["guides"],
      "priority": 6
    }
  ]
}
```

### 8.2 Burrow-specific Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entries` | array | Required | Array of entry objects |
| `repo` | object | Optional | Standard repository file locations |
| `agents` | object | Optional | Agent-specific guidance |

### 8.3 Repository Metadata (`repo`)

The optional `repo` object points to standard repository files:

| Field | Type | Description |
|-------|------|-------------|
| `readme` | string | Path to README file |
| `license` | string | Path to LICENSE file |
| `contributing` | string | Path to CONTRIBUTING file |
| `changelog` | string | Path to CHANGELOG file |

All paths are relative to the burrow root.

### 8.4 Agent Instructions (`agents`)

The optional `agents` object provides guidance for LLM-based agents:

| Field | Type | Description |
|-------|------|-------------|
| `context` | string | Brief description for LLM context (recommended: under 500 characters) |
| `entryPoint` | string | Suggested starting entry `id` |
| `hints` | array | Array of freeform processing hints |

Example:

```json
{
  "agents": {
    "context": "API documentation for a payment processing service.",
    "entryPoint": "quickstart",
    "hints": [
      "Code examples are in /examples and can be referenced directly",
      "Changelog entries are time-sensitive; prefer versioned docs"
    ]
  }
}
```

---

## 9. Entry Schema

Each item in `entries` represents a menu item.

### 9.1 Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Required | Unique identifier within the burrow |
| `kind` | string | Required | Entry type (see below) |
| `uri` | string | Required | URI to fetch or enter |
| `title` | string | Optional | Human-readable title |
| `summary` | string | Optional | Short description for agents |
| `path` | string | Optional | Relative path inside the burrow |
| `mediaType` | string | Optional | MIME type (e.g., `text/markdown`) |
| `sizeBytes` | number | Optional | File size in bytes |
| `modified` | string | Optional | RFC 3339 timestamp |
| `sha256` | string | Optional | Hex digest for cache validation |
| `tags` | array | Optional | Categorization tags |
| `priority` | number | Optional | Higher = more prominent |
| `metadata` | object | Optional | Custom metadata for this entry |

### 9.2 Entry Kind Values

| Kind | Description |
|------|-------------|
| `file` | A single file |
| `dir` | A directory (may contain its own `.burrow.json`) |
| `burrow` | An explicit sub-burrow reference |
| `link` | External URI (web page, external resource) |

### 9.3 Minimal Entry

A minimal valid entry requires only:

```json
{
  "id": "readme",
  "kind": "file",
  "uri": "README.md"
}
```

---

## 10. Markdown Companions

The `.warren.md` and `.burrow.md` files provide **narrative context** for agents and humans. They are not parsed as strict data but should follow a consistent structure.

### 10.1 Recommended Headings

- **What this is** — Brief description of the warren/burrow
- **Start here** — Recommended entry points
- **High-value paths** — Most important files/directories
- **How to search** — Guidance on navigating content
- **Update cadence** — How often content changes
- **Notes** — Access policies, caveats, or special instructions

### 10.2 Example `.burrow.md`

```markdown
# Documentation Burrow

## What this is
Documentation for the Example Project API, organized for both humans and AI agents.

## Start here
Read **Getting Started** (`quickstart.md`) first, then explore the **API Reference** (`api/`).

## High-value paths
- `quickstart.md` — Installation and first steps
- `api/endpoints.md` — Complete endpoint reference
- `examples/` — Working code samples

## How to search
Prefer entries in `.burrow.json` and their tags before crawling files directly.

## Update cadence
Updated weekly. The `updated` field in `.burrow.json` is authoritative.
```

### 10.3 Relationship to JSON

- `.warren.json` / `.burrow.json` are canonical for navigation
- `.warren.md` / `.burrow.md` provide guidance, intent, and context
- The JSON files may reference their Markdown companions via `metadata` if needed

---

## 11. Caching Guidance

To reduce repeated scanning and token usage:

- Clients should cache `.warren.json` and `.burrow.json`
- Clients should use `sha256` (or HTTP ETag when available) to detect content changes
- Publishers should keep `summary` fields concise
- Publishers should prefer tags over long prose for categorization

---

## 12. Security Considerations

- These files are **not** access control mechanisms
- Publishing them can reveal information about repository structure
- Publishers should omit sensitive paths/URIs from entries
- Crawling controls should be managed by transport-native mechanisms (e.g., robots.txt for web)
- Agents should prefer `.burrow.json` navigation over brute-force crawling

---

## 13. Extensibility

### 13.1 The `metadata` Field

Publishers may add custom data under the `metadata` field for forward compatibility and extensibility:

```json
{
  "metadata": {
    "myvendor": {
      "customField": "value"
    },
    "generator": "my-burrow-tool/1.0"
  }
}
```

The `metadata` field is available on:

- Root documents (burrow and warren)
- Burrow reference objects (in warrens)
- Warren reference objects (in warrens)
- Entry objects (in burrows)

### 13.2 Forward Compatibility

Clients MUST ignore unknown fields at any level of the document structure. This allows future specification versions to add new fields without breaking older clients.

### 13.3 Deprecated: `extensions`

The `extensions` field is deprecated and will be removed in a future version. Use `metadata` instead. For migration:

```json
// Before (deprecated)
{
  "extensions": { "myvendor": { "key": "value" } }
}

// After (recommended)
{
  "metadata": { "myvendor": { "key": "value" } }
}
```

---

## 14. Transport Examples

While Rabit is transport-agnostic, here are examples of URIs for common scenarios:

### 14.1 HTTP(S)

```json
{
  "uri": "https://docs.example.com/api/"
}
```

### 14.2 Git Repositories

For Git-hosted content, use standard Git URLs:

```json
{
  "uri": "https://github.com/org/repo"
}
```

Or with a path into the repository:

```json
{
  "uri": "https://github.com/org/repo/tree/main/docs"
}
```

### 14.3 Local Filesystem

For local paths (primarily in development or local tools):

```json
{
  "uri": "file:///home/user/projects/docs/"
}
```

Or as a relative path when `baseUri` is set:

```json
{
  "baseUri": "file:///home/user/projects/",
  "entries": [
    { "id": "docs", "kind": "dir", "uri": "docs/" }
  ]
}
```

---

## 15. References

- RFC 3986: Uniform Resource Identifier (URI): Generic Syntax
- RFC 3339: Date and Time on the Internet: Timestamps
- RFC 8615: Well-Known Uniform Resource Identifiers (URIs)
- RFC 9309: Robots Exclusion Protocol

---

## Appendix A: Minimal Examples

### A.1 Minimal Burrow

```json
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.3.0/burrow",
  "kind": "burrow",
  "entries": [
    { "id": "readme", "kind": "file", "uri": "README.md" }
  ]
}
```

### A.2 Minimal Warren

```json
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.3.0/warren",
  "kind": "warren",
  "burrows": [
    { "id": "docs", "uri": "docs/" }
  ]
}
```

---

## Appendix B: Migration from v0.2

For implementations migrating from the v0.2 (draft-rabit-rbt-04) specification:

### B.1 Removed Features

| v0.2 Feature | v0.3 Replacement |
|--------------|------------------|
| `rbt` version field | `specVersion` with full schema URI |
| `rid` (Resource Identifier) | Optional `sha256` field |
| `manifest` wrapper object | Flat top-level structure |
| `rel` array | `kind` field + `tags` array |
| `href` field | `uri` field |
| `type` field | `mediaType` field |
| `roots` array | `baseUri` + standard URIs |
| Conformance levels | Removed (guidance only) |
| Traversal algorithm | Removed (implementation detail) |
| Error categories | Removed (implementation detail) |
| Auth hints | Removed (non-goal) |
| Git provenance | Removed (use extensions if needed) |

### B.2 Structural Changes

**Before (v0.2):**

```json
{
  "rbt": "0.2",
  "manifest": {
    "title": "Example",
    "roots": [{ "git": { "remote": "..." } }]
  },
  "entries": [
    { "id": "x", "rid": "urn:rabit:...", "href": "x.md", "type": "text/markdown", "rel": ["item"] }
  ]
}
```

**After (v0.3):**

```json
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.3.0/burrow",
  "kind": "burrow",
  "title": "Example",
  "entries": [
    { "id": "x", "kind": "file", "uri": "x.md", "mediaType": "text/markdown" }
  ]
}
```
