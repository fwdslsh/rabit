# Internet-Draft: Rabit Burrow Traversal (RBT)
## draft-rabit-rbt-02 (Work in Progress)

**Intended status:** Informational (candidate for Standards Track)  
**Expires:** 6 months after publication

---

## Status of This Memo

This Internet-Draft is a work item intended for open review and iteration. Internet-Drafts are not standards; they may be updated, replaced, or obsoleted at any time.

---

## Abstract

This document specifies **Rabit Burrow Traversal (RBT)**: a **Git-first**, human-friendly and agent-friendly convention for publishing and traversing **burrows** (published content spaces). A burrow consists of ordinary files (Markdown, HTML, media, etc.) plus a machine-readable **manifest** that enables deterministic traversal by autonomous agents and humans. RBT also defines a **registry** format for discovering known burrows.

RBT defines:

- a **Git-first** distribution and traversal model (baseline HTTPS and SSH remotes),
- an HTTPS static fallback mode for publishers who do not expose Git,
- a cross-machine identity mechanism based on content hashes (RID),
- a **registry** published as JSON + Markdown listing known burrows with summaries and roots,
- optional `/.well-known/` discovery endpoints,
- a normative traversal algorithm for agent implementations, and
- conformance levels for publishers and clients.

RBT is designed to be adoption-friendly: compatible with existing infrastructure and easy to mirror.

---

## 1. Conventions and Terminology

### 1.1 Requirements Language

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** are to be interpreted as described in RFC 2119 and RFC 8174 (BCP 14).

### 1.2 Terminology (Normative)

- **burrow**: a published content space (Git repository first-class; optional HTTPS mirror/export).
- **manifest**: the machine-readable traversal/index document for a burrow (`.burrow.json`).
- **registry**: a list of known burrows published as JSON + Markdown (`.warren.json`, `.warren.md`).
- **entry**: a single resource or collection within a manifest.
- **root**: a locator describing how to access a burrow (Git or HTTPS).
- **RID**: Resource Identifier; a stable content-addressed identifier (§7).
- **agent**: any software client traversing burrows (crawlers, indexers, AI agents, etc.).

### 1.3 Identifiers and URIs

- **URI**: Uniform Resource Identifier per RFC 3986.
- **RID**: Resource Identifier using the `urn:rabit:` scheme defined in §7.

### 1.4 Extensibility

Implementations MUST ignore unknown fields in JSON documents. This enables forward-compatible extensions without breaking existing clients.

Extension fields SHOULD use a namespace prefix to avoid collision with future specification fields:

- Vendor extensions: `x-{vendor}-{field}` (e.g., `x-acme-priority`)
- Experimental extensions: `x-{field}` (e.g., `x-draft-feature`)

---

## 2. Goals and Non-Goals

### 2.1 Goals

RBT aims to provide:

1. Deterministic, agent-robust traversal (no scraping heuristics).
2. Human-friendly publishing using ordinary files.
3. **Git-first** collaboration, versioning, and mirroring.
4. A universal HTTPS static fallback.
5. Cross-machine continuity using stable content-addressed identifiers.
6. Clear conformance levels for interoperability.

### 2.2 Non-Goals

- RBT does not define a new transport protocol; it uses Git transports and HTTPS.
- RBT does not standardize embeddings, vector stores, or LLM APIs.
- RBT does not define authentication or authorization mechanisms.

---

## 3. Conformance Levels

### 3.1 Publisher Conformance

#### 3.1.1 RBT Publisher (Minimal)

A Minimal Publisher:

- MUST publish `.burrow.json` at the burrow root
- MUST include all required fields per §5.2
- MUST publish at least one root (Git or HTTPS)

#### 3.1.2 RBT Publisher (Full)

A Full Publisher:

- MUST meet all Minimal Publisher requirements
- MUST publish a Git root as the primary root
- MUST include valid RIDs for all entries
- MUST include `hash` field for all entries
- SHOULD publish mirrors when available
- SHOULD publish `/.well-known/` discovery endpoints

### 3.2 Client Conformance

#### 3.2.1 RBT Client (Minimal)

A Minimal Client:

- MUST parse `.burrow.json` per §5
- MUST resolve entries via HTTPS roots
- MUST implement the traversal algorithm per §7
- MUST handle errors per §8

#### 3.2.2 RBT Client (Full)

A Full Client:

- MUST meet all Minimal Client requirements
- MUST support Git transports (HTTPS and SSH remotes)
- MUST verify RIDs when fetching resources
- MUST support mirror fallback per §6.4
- MUST implement cycle detection per §7.3
- SHOULD respect cache directives per §8.5

---

## 4. Files, Locations, and Discovery

### 4.1 Required file names (Normative)

RBT uses dot-prefixed filenames to avoid conflicts with common repository files (e.g., `manifest.json` used by npm, Chrome extensions, PWAs). Dot-prefixed files also follow Unix conventions for configuration files.

At a burrow root, publishers:

- MUST publish the manifest at: `.burrow.json`

At a registry root, publishers:

- MUST publish the machine-readable registry at: `.warren.json`
- SHOULD publish a human-readable companion at: `.warren.md`

### 4.2 Optional well-known discovery (Recommended)

An HTTPS origin MAY publish:

- `/.well-known/rabit-burrow` → points to the manifest (`.burrow.json`)
- `/.well-known/rabit-warren` → points to the registry (`.warren.json`)

These endpoints use the well-known URI mechanism described by RFC 8615.

### 4.3 Media Types

- `.burrow.json` MUST be served as `application/json; charset=utf-8`
- `.warren.json` MUST be served as `application/json; charset=utf-8`
- `.warren.md` SHOULD be served as `text/markdown; charset=utf-8`

---

## 5. Roots and Transports (Git-First)

### 5.1 Primary Root Type: Git (Required for Full Conformance)

RBT is Git-first: a burrow SHOULD be representable as a Git repository (or a subdirectory within one), even if it is also exported to static HTTPS.

A Full RBT Client MUST support Git remotes over:

- HTTPS (e.g., `https://github.com/org/repo.git`), and
- SSH (e.g., `git@github.com:org/repo.git`)

### 5.2 Root Descriptors (Normative)

A root descriptor MUST be one of the following types:

#### 5.2.1 Git Root Descriptor

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `remote` | string | REQUIRED | Git remote URL (HTTPS or SSH) |
| `ref` | string | REQUIRED | Fully-qualified ref (e.g., `refs/heads/main`) or 40-character commit SHA |
| `path` | string | OPTIONAL | Path within repository (default: `/`) |

The `ref` field MUST be either:

- A fully-qualified ref name beginning with `refs/` (e.g., `refs/heads/main`, `refs/tags/v1.0`)
- A 40-character lowercase hexadecimal Git commit SHA

Example:

```json
{
  "git": {
    "remote": "https://github.com/org/burrow.git",
    "ref": "refs/heads/main",
    "path": "/"
  }
}
```

#### 5.2.2 HTTPS Root Descriptor

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `base` | string | REQUIRED | HTTPS URL to the burrow root (MUST end with `/`) |

The manifest is located at `${base}.burrow.json`.

Example:

```json
{
  "https": {
    "base": "https://cdn.example.org/burrows/example/"
  }
}
```

### 5.3 Root Selection

When multiple roots are available, clients SHOULD prefer them in this order:

1. Git roots (for versioning and integrity)
2. HTTPS roots (for simplicity and caching)

Clients MAY allow user configuration to override this preference.

---

## 6. Manifest JSON — `.burrow.json`

### 6.1 Encoding

The manifest MUST be UTF-8 encoded JSON without a byte order mark (BOM).

### 6.2 Top-level Structure (Normative)

A manifest JSON document MUST have the following top-level fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rbt` | string | REQUIRED | Specification version (e.g., `"0.2"`) |
| `$schema` | string | RECOMMENDED | JSON Schema URI for validation |
| `manifest` | object | REQUIRED | Manifest metadata |
| `entries` | array | REQUIRED | Array of entry objects |

### 6.3 Manifest Object (Normative)

The `manifest` object MUST include:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | REQUIRED | Human-readable title |
| `updated` | string | REQUIRED | RFC 3339 timestamp of last update |
| `rid` | string | REQUIRED | RID of this manifest (see §6.6) |
| `roots` | array | REQUIRED | Array of root descriptors (§5.2) |

The `manifest` object MAY include:

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Brief description (1-3 sentences) |
| `mirrors` | array | Array of mirror root descriptors |
| `git` | object | Git provenance information |
| `cache` | object | Cache control directives (§8.5) |
| `repo` | object | Standard repository files (§13.3) |
| `agents` | object | Agent instructions (§13.4) |

### 6.4 Entry Objects (Normative)

Each entry MUST include:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | REQUIRED | Stable identifier within this manifest |
| `rid` | string | REQUIRED | Cross-machine RID (§6) |
| `href` | string | REQUIRED | URI-reference (relative or absolute) |
| `type` | string | REQUIRED | Media type (e.g., `text/markdown`) |
| `rel` | array | REQUIRED | Array of relation types (§6.5) |

Each entry MAY include:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Human-readable title |
| `summary` | string | Brief description |
| `hash` | string | Content hash for verification |
| `size` | integer | Size in bytes |
| `modified` | string | RFC 3339 timestamp |
| `lang` | string | BCP 47 language tag |
| `links` | array | Related entry references |
| `children` | object | Pagination descriptor (§6.7) |

### 6.5 Relation Types (`rel`) Vocabulary

RBT defines the following normative relation types. Implementations MUST recognize these values:

| Value | Description |
|-------|-------------|
| `item` | A leaf resource (document, image, etc.) |
| `collection` | A grouping of related entries |
| `index` | Primary entry point or table of contents |
| `about` | Describes the burrow itself (README, etc.) |
| `alternate` | Alternative representation of another entry |
| `parent` | Reference to a parent collection |
| `related` | Semantically related resource |
| `license` | Licensing information |
| `author` | Author information |

Implementations MAY use additional relation types. Unknown relation types MUST be ignored by clients.

For interoperability with web standards, implementations MAY use IANA Link Relation types (RFC 8288) in addition to the RBT vocabulary.

### 6.6 Pagination (`children`)

When an entry represents a collection with many children, pagination MAY be used:

```json
{
  "children": {
    "href": "collection-page-2.json",
    "offset": 100,
    "limit": 100,
    "total": 250
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `href` | string | REQUIRED | URI to next page of entries |
| `offset` | integer | REQUIRED | Starting index of next page |
| `limit` | integer | REQUIRED | Maximum entries per page |
| `total` | integer | OPTIONAL | Total number of children |

### 6.7 Example: Minimal Manifest

```json
{
  "rbt": "0.2",
  "$schema": "https://rabit.dev/schemas/burrow-0.2.json",
  "manifest": {
    "title": "Example Burrow",
    "updated": "2025-01-15T12:00:00Z",
    "rid": "urn:rabit:sha256:a1b2c3d4e5f6...",
    "roots": [
      {
        "git": {
          "remote": "https://github.com/org/burrow.git",
          "ref": "refs/heads/main",
          "path": "/"
        }
      },
      {
        "https": {
          "base": "https://example.org/burrow/"
        }
      }
    ],
    "repo": {
      "readme": "README.md",
      "license": "LICENSE"
    }
  },
  "entries": [
    {
      "id": "readme",
      "rid": "urn:rabit:sha256:b2c3d4e5f6a1...",
      "href": "README.md",
      "type": "text/markdown",
      "rel": ["index", "about"],
      "title": "About this burrow",
      "hash": "sha256:b2c3d4e5f6a1..."
    },
    {
      "id": "docs",
      "rid": "urn:rabit:sha256:c3d4e5f6a1b2...",
      "href": "docs/",
      "type": "application/x-directory",
      "rel": ["collection"],
      "title": "Documentation",
      "children": {
        "href": "docs/.burrow.json",
        "offset": 0,
        "limit": 50,
        "total": 120
      }
    }
  ]
}
```

---

## 7. Resource Identifiers (RID)

### 7.1 Locator vs Identifier

RBT separates locators (roots + href) from identifiers (RID). This enables mirrors and relocations without breaking identity.

### 7.2 RID Scheme (Normative)

RBT defines the RID scheme:

```
urn:rabit:sha256:{hex}
```

Where `{hex}` is the 64-character lowercase hexadecimal SHA-256 digest.

### 7.3 RID Computation (Normative)

The RID MUST be computed as follows:

#### 7.3.1 For Regular Files

1. Read the file as raw bytes (no transformations)
2. Compute SHA-256 over the complete byte sequence
3. Encode as lowercase hexadecimal

```
RID = "urn:rabit:sha256:" + lowercase_hex(sha256(file_bytes))
```

**Important:** RID computation uses raw file bytes, NOT Git blob format. This ensures consistency between Git-hosted and HTTPS-hosted resources.

#### 7.3.2 For the Manifest Itself

The manifest's own RID is computed over a canonical form:

1. Parse the manifest JSON
2. Remove the `rid` field from the `manifest` object
3. Serialize to canonical JSON (RFC 8785: JCS)
4. Compute SHA-256 over the UTF-8 bytes of the canonical JSON

#### 7.3.3 For Directories/Collections

Collections do not have RIDs. The `rid` field for collection entries SHOULD contain a synthetic identifier:

```
urn:rabit:collection:{manifest_rid_short}:{id}
```

Where `{manifest_rid_short}` is the first 16 characters of the manifest's RID hash.

### 7.4 Mirror Substitution (Normative)

A client MAY substitute an entry's root with a mirror root only if:

1. The mirror root is listed in `manifest.mirrors`, AND
2. The fetched resource bytes verify against the entry's `rid` or `hash`.

If verification fails, the client MUST:

1. Log the verification failure
2. Fall back to the next available root
3. Report the failure if all roots fail (see §9)

---

## 8. Traversal Algorithm

### 8.1 Overview

This section defines the normative traversal behavior for RBT clients.

### 8.2 Entry Ordering

Entries in a manifest SHOULD be ordered by the publisher to indicate recommended traversal order. Clients:

- SHOULD traverse entries in array order by default
- MAY re-order based on `rel` values (e.g., `index` first)
- MAY allow user-specified ordering

### 8.3 Traversal Strategy

RBT clients MUST implement breadth-first traversal by default:

```
FUNCTION traverse(manifest):
    queue = new Queue()
    visited = new Set()
    
    FOR entry IN manifest.entries:
        queue.enqueue(entry)
    
    WHILE queue is not empty:
        entry = queue.dequeue()
        
        IF entry.rid IN visited:
            CONTINUE  // Skip cycles
        
        visited.add(entry.rid)
        process(entry)
        
        IF entry.children:
            child_manifest = fetch(entry.children.href)
            FOR child IN child_manifest.entries:
                queue.enqueue(child)
```

Clients MAY implement depth-first traversal as a configurable option.

### 8.4 Cycle Detection

Clients MUST detect and handle cycles:

1. Maintain a set of visited RIDs during traversal
2. Skip entries whose RID has already been visited
3. Log cycle detection for debugging

### 8.5 Cache Control

#### 8.5.1 Manifest-Level Cache Directives

The manifest MAY include cache control:

```json
{
  "manifest": {
    "cache": {
      "maxAge": 3600,
      "staleWhileRevalidate": 86400
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `maxAge` | integer | Seconds the manifest may be cached |
| `staleWhileRevalidate` | integer | Seconds stale content may be served while revalidating |

#### 8.5.2 Client Caching Behavior

Clients SHOULD:

1. Cache manifests according to `cache` directives
2. Cache resources indefinitely when RID verification is available
3. Revalidate using `If-None-Match` (ETag) when available
4. Default to 1 hour cache for manifests without directives

### 8.6 Rate Limiting

Clients SHOULD implement rate limiting:

1. Maximum 10 concurrent requests per host
2. Minimum 100ms delay between requests to the same host
3. Exponential backoff on 429 (Too Many Requests) responses

---

## 9. Error Handling

### 9.1 Error Categories

RBT defines the following error categories:

| Category | Description | Recovery |
|----------|-------------|----------|
| `manifest_invalid` | Manifest JSON is malformed or missing required fields | MUST abort traversal |
| `manifest_not_found` | Manifest not found at expected location | MUST try alternate roots |
| `entry_not_found` | Entry resource not found | SHOULD continue traversal, log error |
| `verification_failed` | RID/hash mismatch | MUST try mirrors, then skip entry |
| `transport_error` | Network or Git transport failure | SHOULD retry with backoff |
| `rate_limited` | Server returned 429 | MUST backoff, then retry |

### 9.2 Graceful Degradation

Clients MUST implement graceful degradation:

1. **Root Fallback:** If primary root fails, try roots in order
2. **Mirror Fallback:** If all roots fail and mirrors exist, try mirrors
3. **Partial Success:** Continue traversal even if some entries fail
4. **Error Aggregation:** Collect and report all errors after traversal

### 9.3 Error Reporting

Clients SHOULD provide structured error reports:

```json
{
  "traversal": {
    "manifest": "https://example.org/.burrow.json",
    "started": "2025-01-15T12:00:00Z",
    "completed": "2025-01-15T12:05:00Z",
    "entriesProcessed": 150,
    "entriesSkipped": 3,
    "errors": [
      {
        "category": "entry_not_found",
        "entryId": "missing-doc",
        "href": "docs/missing.md",
        "attempts": [
          {"root": "git", "error": "blob not found"},
          {"root": "https", "status": 404}
        ]
      }
    ]
  }
}
```

---

## 10. Registry JSON — `.warren.json`

### 10.1 Purpose

A registry provides discovery of multiple burrows. Organizations, communities, or individuals MAY publish registries to curate collections of related burrows.

### 10.2 Required Formats

A registry:

- MUST publish `.warren.json` (machine-readable)
- SHOULD publish `.warren.md` (human-readable companion)

### 10.3 Top-level Structure (Normative)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rbt` | string | REQUIRED | Specification version |
| `$schema` | string | RECOMMENDED | JSON Schema URI |
| `registry` | object | REQUIRED | Registry metadata |
| `entries` | array | REQUIRED | Array of burrow entries |

### 10.4 Registry Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | REQUIRED | Human-readable title |
| `updated` | string | REQUIRED | RFC 3339 timestamp |
| `rid` | string | OPTIONAL | RID of this registry |
| `description` | string | OPTIONAL | Brief description |

### 10.5 Registry Entry Objects

Each entry MUST include:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | REQUIRED | Short identifier (slug) |
| `title` | string | REQUIRED | Human-readable title |
| `summary` | string | REQUIRED | 1-3 sentence description |
| `roots` | array | REQUIRED | Array of root descriptors |

Each entry MAY include:

| Field | Type | Description |
|-------|------|-------------|
| `rid` | string | RID of the burrow's manifest |
| `tags` | array | Categorization tags |
| `updated` | string | Last update timestamp |

### 10.6 Example: Registry

```json
{
  "rbt": "0.2",
  "$schema": "https://rabit.dev/schemas/warren-0.2.json",
  "registry": {
    "title": "Example Registry",
    "updated": "2025-01-15T12:00:00Z",
    "description": "A curated collection of documentation burrows."
  },
  "entries": [
    {
      "name": "rbt-spec",
      "title": "RBT Specification",
      "summary": "The official Rabit Burrow Traversal specification and examples.",
      "roots": [
        {
          "git": {
            "remote": "https://github.com/rabit/rbt-spec.git",
            "ref": "refs/heads/main",
            "path": "/"
          }
        }
      ],
      "tags": ["specification", "documentation"],
      "updated": "2025-01-15T12:00:00Z"
    }
  ]
}
```

---

## 11. Well-Known Discovery Endpoints

### 11.1 `/.well-known/rabit-burrow`

Points to a burrow's manifest:

```json
{
  "rbt": "0.2",
  "manifest": "https://example.org/burrow/.burrow.json",
  "roots": [
    {
      "git": {
        "remote": "https://github.com/org/burrow.git",
        "ref": "refs/heads/main",
        "path": "/"
      }
    }
  ]
}
```

### 11.2 `/.well-known/rabit-warren`

Points to a registry:

```json
{
  "rbt": "0.2",
  "registry": {
    "json": "https://example.org/registry/.warren.json",
    "md": "https://example.org/registry/.warren.md"
  }
}
```

---

## 12. Git Provenance (Optional)

A manifest MAY include Git provenance for auditability:

```json
{
  "manifest": {
    "git": {
      "remote": "https://github.com/org/burrow.git",
      "ref": "refs/heads/main",
      "commit": "abc123def456789...",
      "path": "/",
      "author": "Jane Doe <jane@example.org>",
      "timestamp": "2025-01-15T12:00:00Z"
    }
  }
}
```

---

## 13. Agent Instructions (Optional)

This section defines optional mechanisms for publishers to provide guidance to autonomous agents (LLM-based crawlers, AI assistants, etc.) consuming burrow content. All features in this section are OPTIONAL.

### 13.1 Purpose

While RBT defines *how* to traverse a burrow, publishers may wish to provide guidance on *how agents should interpret or use* the content. This section provides lightweight conventions for such guidance without mandating specific behaviors.

### 13.2 File-Based Instructions (Compatibility)

Publishers MAY include instruction files at the burrow root for compatibility with emerging conventions:

| File | Format | Description |
|------|--------|-------------|
| `llms.txt` | Plain text | Context and instructions for LLMs (per llms.txt convention) |
| `AGENTS.md` | Markdown | Instructions for AI coding agents |

These files are not RBT-specific and MAY be consumed by agents independently of RBT traversal.

When present, RBT clients targeting LLM-based agents SHOULD:

1. Check for instruction files before processing entries
2. Provide file contents as context to the agent
3. Treat instructions as non-binding guidance

### 13.3 Standard Repository Files

Burrows MAY contain standard repository files following established Git and open-source conventions. These files are not RBT-specific but provide useful context for both human readers and agents.

#### 13.3.1 Common Files

| File | Variants | Purpose |
|------|----------|---------|
| `README` | `README.md`, `README.txt`, `README` | Project overview and orientation |
| `LICENSE` | `LICENSE.md`, `LICENSE.txt`, `LICENSE`, `COPYING` | Licensing terms |
| `CONTRIBUTING` | `CONTRIBUTING.md`, `CONTRIBUTING.txt` | Contribution guidelines |
| `CODE_OF_CONDUCT` | `CODE_OF_CONDUCT.md` | Community standards |
| `SECURITY` | `SECURITY.md`, `SECURITY.txt` | Security policy and reporting |
| `CHANGELOG` | `CHANGELOG.md`, `HISTORY.md`, `NEWS` | Version history |
| `AUTHORS` | `AUTHORS.md`, `CONTRIBUTORS.md` | Attribution |

Publishers SHOULD use Markdown (`.md`) variants when formatting is beneficial.

#### 13.3.2 Manifest Metadata (Optional)

The manifest MAY indicate the presence and location of standard files via a `repo` object:

```json
{
  "manifest": {
    "repo": {
      "readme": "README.md",
      "license": "LICENSE",
      "contributing": "CONTRIBUTING.md",
      "changelog": "CHANGELOG.md",
      "security": "SECURITY.md"
    }
  }
}
```

All fields are OPTIONAL. When present, values MUST be relative paths from the burrow root.

This metadata enables agents to:

1. Locate these files without directory traversal
2. Understand licensing before processing content
3. Provide attribution per contribution guidelines
4. Direct security-related queries appropriately

#### 13.3.3 License Considerations

Agents SHOULD check for license information before extensive content processing. When `repo.license` is present, agents SHOULD:

1. Fetch and parse the license file
2. Respect any restrictions indicated (in conjunction with `permissions` guidance)
3. Provide attribution when required by the license

---

### 13.4 Manifest-Based Instructions (Native)

The manifest MAY include an `agents` object for structured guidance:

```json
{
  "manifest": {
    "agents": {
      "context": "Technical specification for the RBT protocol.",
      "entryPoint": "README.md",
      "hints": ["Sections marked 'Normative' contain requirements"],
      "ignore": ["drafts/*", "*.bak"]
    }
  }
}
```

#### 13.4.1 Fields

All fields are OPTIONAL:

| Field | Type | Description |
|-------|------|-------------|
| `context` | string | Brief description for LLM context (recommended: under 500 characters) |
| `entryPoint` | string | Suggested starting entry `id` or `href` |
| `hints` | array | Freeform processing hints (array of strings) |
| `ignore` | array | Glob patterns for entries agents may skip |
| `permissions` | object | Usage guidance (see §13.5) |

#### 13.4.2 Example

```json
{
  "manifest": {
    "agents": {
      "context": "API documentation for Acme Corp's payment processing service. Intended for developers integrating with our REST API.",
      "entryPoint": "quickstart",
      "hints": [
        "Start with the quickstart guide for orientation",
        "Code examples are in /examples and can be referenced directly",
        "Changelog entries are time-sensitive; prefer versioned docs"
      ],
      "ignore": ["internal/*", "deprecated/*"]
    }
  }
}
```

### 13.5 Permissions Guidance

Publishers MAY express usage preferences via a `permissions` object. These are **advisory hints**, not access control mechanisms. Agents SHOULD respect stated preferences but enforcement is out of scope.

```json
{
  "permissions": {
    "summarize": true,
    "quote": "with-attribution",
    "index": true,
    "train": false
  }
}
```

Suggested permission keys (all OPTIONAL, all values freeform):

| Key | Example Values | Intent |
|-----|----------------|--------|
| `summarize` | `true`, `false` | May agents summarize content? |
| `quote` | `true`, `"with-attribution"`, `false` | May agents quote content? |
| `index` | `true`, `false` | May agents index for search? |
| `train` | `true`, `false` | May content be used for model training? |

Publishers MAY include additional keys. Unknown keys SHOULD be ignored by clients.

### 13.6 Precedence and Combination

When multiple instruction sources exist:

1. Manifest `agents` object provides structured, machine-readable guidance
2. File-based instructions (`llms.txt`, `AGENTS.md`) provide supplementary narrative context
3. Clients MAY combine context from multiple sources as appropriate
4. In case of conflict, publishers SHOULD ensure consistency; clients MAY use any reasonable interpretation

### 13.7 Relationship to robots.txt

RBT does not define a relationship to `robots.txt`. Publishers who wish to restrict traditional web crawlers SHOULD continue using `robots.txt` per established conventions. Whether RBT agents should respect `robots.txt` is left to implementation discretion.

### 13.8 Non-Enforcement Notice

This section defines a mechanism for expressing preferences, not enforcing them. Publishers seeking to restrict access to content MUST use appropriate access control mechanisms (authentication, authorization) rather than relying on agent cooperation.

---

## 14. Private Burrows and Authentication (Optional)

RBT supports private burrows that require authentication. This section provides guidance on recommended authentication mechanisms; RBT does not define new authentication protocols.

### 14.1 Guiding Principles

1. **Use existing standards.** RBT relies on established transport-layer authentication.
2. **Prefer key-based authentication.** Key-based mechanisms provide better security and automation support than password-based authentication.
3. **Keep credentials out of manifests.** Authentication credentials MUST NOT be stored in `.burrow.json` or `.warren.json` files.

### 14.2 Recommended Authentication Mechanisms

#### 14.2.1 Git Repositories

For private Git repositories:

- **Recommended:** SSH with public key authentication
- **Alternative:** HTTPS with token-based authentication via Git credential helpers

Standard Git authentication mechanisms apply; no RBT-specific configuration is required.

#### 14.2.2 HTTPS Endpoints

For private HTTPS roots:

- **Recommended:** Mutual TLS (mTLS) with client certificates
- **Alternative:** Bearer token authentication (OAuth2, API keys)

Standard HTTPS authentication mechanisms apply; no RBT-specific configuration is required.

### 14.3 Authentication Hints (Optional)

The manifest MAY include an `auth` object to document access requirements:

```json
{
  "manifest": {
    "auth": {
      "required": true,
      "documentation": "https://example.org/docs/access"
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `required` | boolean | Whether authentication is required |
| `documentation` | string | URL to access documentation |

This metadata is advisory; clients discover actual authentication requirements through standard transport-layer challenges.

### 14.4 Security Guidance

Publishers and clients should follow security best practices for their chosen authentication mechanisms:

- Use short-lived credentials where possible
- Implement credential rotation
- Store credentials securely
- Use read-only credentials for traversal clients

Refer to the documentation for your Git hosting provider or HTTPS infrastructure for implementation guidance.

---

## 15. Security Considerations

### 15.1 Threat Model

RBT systems face the following threats:

| Threat | Description | Mitigation |
|--------|-------------|------------|
| Mirror poisoning | Malicious mirror serves altered content | RID verification (§7.4) |
| Manifest tampering | Attacker modifies manifest in transit | HTTPS, Git integrity |
| SSRF attacks | Agent fetches internal/malicious URLs | URL validation (§13.2) |
| Resource exhaustion | Malicious manifest causes infinite traversal | Cycle detection, limits (§13.3) |
| Content injection | Untrusted content executed by client | Sandboxing (§13.4) |

### 15.2 URL Validation

Clients MUST validate URLs before fetching:

1. MUST reject non-HTTPS URLs (except `git://` for Git remotes)
2. MUST reject URLs with private/internal IP ranges
3. MUST reject URLs with localhost or loopback addresses
4. SHOULD implement allowlist/blocklist for domains
5. SHOULD reject URLs with suspicious patterns (e.g., `@` in hostname)

### 15.3 Resource Limits

Clients MUST implement resource limits:

| Resource | Recommended Limit |
|----------|------------------|
| Maximum manifest size | 10 MB |
| Maximum entry count per manifest | 10,000 |
| Maximum traversal depth | 100 |
| Maximum total entries | 1,000,000 |
| Maximum request timeout | 30 seconds |

### 15.4 Content Handling

Clients MUST treat burrow content as untrusted:

1. MUST NOT execute code from burrow resources
2. MUST sanitize HTML before rendering
3. MUST validate media types match content
4. SHOULD sandbox content rendering
5. SHOULD implement Content Security Policy for web clients

### 15.5 Credential Security

1. SSH keys MUST be stored securely (encrypted, restricted permissions)
2. HTTPS tokens MUST NOT be logged
3. Credentials MUST NOT be included in error reports
4. Clients SHOULD support credential helpers (Git credential manager, etc.)

### 15.6 Attestation (Future Extension)

Future versions MAY define manifest signing:

```json
{
  "manifest": {
    "signature": {
      "algorithm": "ed25519",
      "publicKey": "...",
      "value": "..."
    }
  }
}
```

This is reserved for future specification and is non-normative in this version.

---

## 16. Versioning Policy

### 16.1 Version Format

The `rbt` field uses semantic versioning: `{major}.{minor}`

- **Major version:** Breaking changes to required fields or behaviors
- **Minor version:** Additive changes (new optional fields, clarifications)

### 16.2 Compatibility Rules

| Client Version | Document Version | Behavior |
|---------------|------------------|----------|
| 0.2 | 0.2 | Full compatibility |
| 0.2 | 0.1 | SHOULD process with warnings |
| 0.2 | 0.3 | SHOULD process, ignoring unknown fields |
| 0.2 | 1.0 | MAY reject or process with significant warnings |

### 16.3 Deprecation

Deprecated features will be:

1. Marked deprecated in a minor release
2. Supported for at least 2 minor releases
3. Removed in the next major release

---

## 17. IANA Considerations

### 17.1 Well-Known URI Registrations

This document requests registration of:

| Suffix | Reference |
|--------|-----------|
| `rabit-burrow` | This document, §11.1 |
| `rabit-warren` | This document, §11.2 |

### 17.2 URN Namespace

This document requests registration of the `rabit` URN namespace for RIDs:

- **Namespace ID:** rabit
- **Registration Information:** Version 1, 2025-01-15
- **Declared Registrant:** [To be determined]
- **Syntax:** `urn:rabit:{type}:{value}`

---

## 18. References

### 18.1 Normative References

- **RFC 2119** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels"
- **RFC 3339** Klyne, G., "Date and Time on the Internet: Timestamps"
- **RFC 3986** Berners-Lee, T., "Uniform Resource Identifier (URI): Generic Syntax"
- **RFC 8174** Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words"
- **RFC 8259** Bray, T., "The JavaScript Object Notation (JSON) Data Interchange Format"
- **RFC 8288** Nottingham, M., "Web Linking"
- **RFC 8615** Nottingham, M., "Well-Known Uniform Resource Identifiers (URIs)"
- **RFC 8785** Rundgren, A., "JSON Canonicalization Scheme (JCS)"

### 18.2 Informative References

- **Git Protocol** The Git project, https://git-scm.com/docs/protocol-v2
- **JSON Schema** Wright, A., https://json-schema.org/

---

## Appendix A: JSON Schema

JSON Schema documents for `.burrow.json` and `.warren.json` are published at:

- `https://rabit.dev/schemas/burrow-0.2.json`
- `https://rabit.dev/schemas/warren-0.2.json`

---

## Appendix B: Implementation Checklist

### B.1 Publisher Checklist

- [ ] Create `.burrow.json` with all required fields
- [ ] Compute RIDs for all entries
- [ ] Include at least one root (Git or HTTPS)
- [ ] Validate against JSON Schema
- [ ] Test traversal with reference client
- [ ] For private burrows: document access requirements

### B.2 Client Checklist

- [ ] Parse and validate manifest JSON
- [ ] Implement breadth-first traversal
- [ ] Implement cycle detection
- [ ] Implement error handling and fallback
- [ ] Implement RID verification
- [ ] Implement rate limiting
- [ ] Implement URL validation
- [ ] Implement resource limits
- [ ] Support standard Git and HTTPS authentication

---

## Appendix C: Changelog

### C.1 Changes from draft-rabit-rbt-01

1. **Terminology:** Unified on canonical terms (manifest, registry); removed brand/canonical mapping
2. **Conformance:** Added §3 defining publisher and client conformance levels
3. **Traversal:** Added §8 with normative traversal algorithm
4. **Error Handling:** Added §9 with error categories and recovery
5. **RID Computation:** Added §7.3 with explicit byte-sequence rules
6. **Relation Types:** Added §6.5 defining `rel` vocabulary
7. **Agent Instructions:** Added §13 with optional guidance for LLM-based agents (llms.txt, AGENTS.md compatibility)
8. **Repository Files:** Added §13.3 for standard Git repository files (LICENSE, README, CONTRIBUTING, etc.) with optional manifest metadata
9. **Private Burrows:** Added §14 with guidance on authentication (recommends SSH for Git, mTLS for HTTPS)
10. **Security:** Expanded §15 with threat model and mitigations
11. **Versioning:** Added §16 with compatibility rules
12. **Pagination:** Added §6.6 defining `children` structure
13. **Caching:** Added §8.5 with cache control directives
14. **File naming:** Changed to dot-prefixed files (`.burrow.json`, `.warren.json`, `.warren.md`) to avoid conflicts with common repository files
15. **Well-known:** Using `rabit-burrow` and `rabit-warren` endpoints to match file naming

---

## Authors' Addresses

[To be added]
