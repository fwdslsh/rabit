# Rabit Burrow & Warren Discovery Specification (Draft)

**Date:** 2026-01-12  
**Status:** Draft (v0.2)  
**Primary goal:** A *Gopher-like*, agent-friendly “menu system” for content navigation using **well-known files**—without inventing new transport schemes.

---

## 1. Purpose

Rabit defines a **convention of well-known dotfiles** that allow agents and tools to:

- Discover what content exists in a location *without crawling*.
- Navigate directly to relevant files and sub-collections using a compact “menu”.
- Reduce compute and token usage by providing precomputed metadata (paths, summaries, tags, hashes).
- Work across **existing transports** (filesystem, HTTP(S), Git, SSH/SFTP, etc.) by referencing standard URIs.

This is intentionally analogous to the way Gopher servers provide a menu of items, but expressed as modern **JSON + Markdown** that can live in repos, directories, or web roots.

---

## 2. Non-goals

This spec **does not** define:

- A new URL/URI scheme (use standard URIs).
- Authentication, authorization, or secret management.
- A transport protocol (HTTP, Git, SFTP, etc. are out of scope).
- A remote execution API.

---

## 3. Terminology

- **Burrow**: A browsable content collection (e.g., a repo root, a docs folder, a web directory).
- **Warren**: A registry index that points to one or more Burrows (and optionally other Warrens).
- **Entry**: A single menu item within a Burrow (file, directory, external URI, or child burrow).
- **Agent**: Any automated client (LLM tool, crawler, CLI) that consumes these files.

---

## 4. Well-known files

A location MAY contain any of these files:

- `.warren.json` — machine-readable registry of burrows
- `.warren.md` — narrative “agent README” for the warren
- `.burrow.json` — machine-readable menu for a burrow
- `.burrow.md` — narrative “agent README” for the burrow

### 4.1 Placement rules (recommended)

**Git repositories**
- Place `.warren.*` and/or `.burrow.*` at the repository root.
- Optionally place `.burrow.*` in key subdirectories to define sub-burrows (e.g., `docs/.burrow.json`).

**Filesystem directories**
- Same as Git: place files in the directory being described.

**HTTP(S)**
- Serve the files from the corresponding path location.
  - Example: if a directory is browsed at `https://example.com/docs/`, then the burrow menu SHOULD be available at:
    - `https://example.com/docs/.burrow.json`
    - `https://example.com/docs/.burrow.md`
- **Operational note:** some web servers block dotfiles by default; operators may need an explicit allowlist.

### 4.2 Precedence (when multiple exist)

If both `.warren.json` and `.burrow.json` exist at the same location:
- Clients SHOULD treat the location as both a warren (registry) and a burrow (browsable collection).
- If a client must choose a single “landing” view, it SHOULD prefer `.warren.md` / `.warren.json` as the top-level entry.

---

## 5. Discovery algorithm (client-side)

Given a starting URI `U` that refers to a directory-like location (or a repo root):

1. Attempt to fetch/read `U + "/.warren.json"`.
   - If present and valid, the client has discovered a **Warren**.
2. Attempt to fetch/read `U + "/.burrow.json"`.
   - If present and valid, the client has discovered a **Burrow**.
3. If neither exists, clients MAY:
   - Walk up parent paths (at most *N* levels; default 2) and repeat steps 1–2, OR
   - Fall back to transport-native listing (out of scope).

If both exist, clients SHOULD display a warren “registry view” and allow entering burrows.

---

## 6. Data model overview

### 6.1 Common document fields

All JSON documents defined by this spec share these top-level fields:

- `specVersion` (string, REQUIRED): e.g. `"rabit.dev/burrow-warren/v0.2"`
- `kind` (string, REQUIRED): `"warren"` or `"burrow"`
- `title` (string, OPTIONAL)
- `description` (string, OPTIONAL)
- `updated` (RFC3339 timestamp string, OPTIONAL)
- `baseUri` (string URI, OPTIONAL): base for resolving relative `uri` and `path` fields
- `links` (array, OPTIONAL): objects of the form:
  - `rel` (string)
  - `uri` (string)
  - `title` (string, OPTIONAL)
- `extensions` (object, OPTIONAL): vendor/plugin-specific structured data

**Resolution rule:** if `baseUri` is present, relative `uri` values are resolved against it.

---

## 7. Warren JSON (`.warren.json`)

A Warren is a registry of burrows (and optionally other warrens).

### 7.1 Schema (normative)

```json
{
  "specVersion": "rabit.dev/burrow-warren/v0.2",
  "kind": "warren",
  "title": "Example Warren",
  "description": "Registry of burrows for Project X.",
  "updated": "2026-01-12T00:00:00Z",
  "baseUri": "https://example.com/",
  "burrows": [
    {
      "id": "docs",
      "title": "Documentation",
      "description": "Product + API docs.",
      "uri": "docs/",
      "tags": ["docs", "start-here"],
      "priority": 10
    },
    {
      "id": "repo",
      "title": "Git Repository",
      "description": "Source code in Git.",
      "uri": "git+https://github.com/org/repo",
      "tags": ["code"],
      "priority": 5
    }
  ],
  "warrens": [
    {
      "id": "org",
      "title": "Org-wide Warren",
      "uri": "https://example.com/org/.warren.json"
    }
  ],
  "links": [
    { "rel": "about", "uri": ".warren.md", "title": "Agent README" }
  ],
  "extensions": {}
}
```

### 7.2 Field definitions

- `burrows` (array, REQUIRED unless `warrens` exists)
  - `id` (string, REQUIRED): stable identifier
  - `uri` (string, REQUIRED): location of the burrow root (directory-like URI)
  - `title`, `description` (OPTIONAL)
  - `tags` (array of strings, OPTIONAL)
  - `priority` (number, OPTIONAL): higher = more prominent in menus
- `warrens` (array, OPTIONAL): references to other warrens (same object shape as `burrows` but without tags/priority requirements)

---

## 8. Burrow JSON (`.burrow.json`)

A Burrow is a structured “menu” of content entries.

### 8.1 Schema (normative)

```json
{
  "specVersion": "rabit.dev/burrow-warren/v0.2",
  "kind": "burrow",
  "title": "Docs Burrow",
  "description": "Documentation menu for agents.",
  "updated": "2026-01-12T00:00:00Z",
  "baseUri": "https://example.com/docs/",
  "entrypoint": "index.md",
  "entries": [
    {
      "id": "start",
      "title": "Start Here",
      "summary": "Overview and quick links.",
      "kind": "file",
      "path": "start-here.md",
      "uri": "start-here.md",
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
      "id": "subburrow-guides",
      "title": "Guides (Sub-burrow)",
      "summary": "Step-by-step guides with their own menu.",
      "kind": "burrow",
      "uri": "guides/",
      "burrowHint": "guides/.burrow.json",
      "tags": ["guides"],
      "priority": 6
    }
  ],
  "links": [
    { "rel": "about", "uri": ".burrow.md", "title": "Agent README" }
  ],
  "extensions": {}
}
```

### 8.2 Entry object (normative)

Each item in `entries` is:

- `id` (string, REQUIRED): unique within the burrow
- `kind` (string, REQUIRED): one of:
  - `file` — a single file
  - `dir` — a directory (may be browsed; may contain its own `.burrow.json`)
  - `burrow` — an explicit sub-burrow reference
  - `link` — external URI (web page, blob, etc.)
- `title` (string, OPTIONAL but recommended)
- `summary` (string, OPTIONAL): short description intended for agents
- `path` (string, OPTIONAL): relative path inside the burrow (recommended for `file`/`dir`)
- `uri` (string, REQUIRED): URI to fetch or enter (relative resolved to `baseUri`)
- `mediaType` (string, OPTIONAL): e.g., `text/markdown`, `application/json`
- `sizeBytes` (number, OPTIONAL)
- `modified` (RFC3339 timestamp string, OPTIONAL)
- `sha256` (string, OPTIONAL): hex digest of content (recommended for cache validation)
- `tags` (array of strings, OPTIONAL)
- `priority` (number, OPTIONAL): higher = more prominent
- `burrowHint` (string, OPTIONAL): if `kind="burrow"`, where to find the sub-burrow menu (default `.burrow.json`)

### 8.3 Minimal burrow requirement

A minimal valid `.burrow.json` MUST include:
- `specVersion`, `kind="burrow"`, and `entries` with at least one entry.

---

## 9. Markdown companions (`.warren.md`, `.burrow.md`)

These files exist to provide **narrative context** to agents and humans. They are not meant to be parsed as strict data, but they SHOULD follow a consistent structure for predictable agent reading.

### 9.1 Recommended headings

- **What this is**
- **Start here**
- **High-value paths**
- **How to search**
- **Update cadence**
- **Policies / access notes** (e.g., “do not crawl”, “prefer index”, “private areas”)

### 9.2 Relationship to JSON

- `.warren.json` / `.burrow.json` are canonical for navigation.
- `.warren.md` / `.burrow.md` provide guidance, intent, and best entry points.

---

## 10. Caching & token-efficiency (guidance)

To reduce repeated scanning and token usage:

- Clients SHOULD cache `.warren.json` and `.burrow.json`.
- Clients SHOULD use `sha256` (or HTTP ETag when available) to detect changes.
- Burrow authors SHOULD keep `summary` concise and prefer tags over long prose.

---

## 11. Security considerations

- These files are **not** access control. Publishing them can leak information about repository structure.
- Operators SHOULD omit sensitive paths/URIs from `entries`.
- Crawling controls, if desired, should be managed by transport-native mechanisms (e.g., robots exclusion for web crawlers), but agents SHOULD prefer `.burrow.json` over brute-force crawling.

---

## 12. Extensibility

Vendors/plugins MAY add fields under:
- `extensions`: `{ "<vendor>": { ... } }`

Clients MUST ignore unknown fields outside the normative set unless they explicitly support them.

---

## 13. Examples

### 13.1 `.warren.md` (suggested)

```md
# Example Warren

## What this is
This warren links the primary burrows for Project X.

## Start here
- Documentation burrow: docs/
- Source code burrow: git+https://github.com/org/repo

## High-value paths
- docs/start-here.md
- docs/api/
```

### 13.2 `.burrow.md` (suggested)

```md
# Docs Burrow

## Start here
Read **Start Here** first, then go to **API Reference** if you need endpoints.

## How to search
Prefer `.burrow.json` entries and their tags before crawling files.

## Update cadence
Updated weekly; `updated` in `.burrow.json` is authoritative.
```

---

## 14. References (informative)

- RFC 3986: Uniform Resource Identifier (URI): Generic Syntax
- RFC 8615: Well-Known Uniform Resource Identifiers (URIs)
- RFC 9309: Robots Exclusion Protocol
- RFC 1436: The Internet Gopher Protocol
