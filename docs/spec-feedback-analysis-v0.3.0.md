# Specification Feedback Analysis: v0.3.0 Review

**Date:** 2026-01-13
**Status:** Analysis Document
**Purpose:** Interpret feedback on draft-rabit-rbt-04 and plan integration of v0.3.0 recommendations

---

## Executive Summary

We received feedback in the form of a proposed v0.3.0 spec draft (`rabit-burrow-warren-spec-draft-v0.3.0.md`) that takes a fundamentally different—and arguably wiser—approach to the Rabit specification. The core feedback is clear: **we are over-specifying**.

The v0.3.0 proposal returns to the original vision: a simple, Gopher-like "menu system" that helps agents navigate content **without inventing new protocols, schemes, or complex machinery**.

This document analyzes the differences, interprets the feedback, and proposes a path forward.

---

## 1. Philosophy Shift: What the Feedback is Really Saying

### 1.1 The Core Message

The feedback is not just about removing features—it's about **philosophy**:

| Our Current Approach (draft-rabit-rbt-04) | Feedback's Approach (v0.3.0) |
|------------------------------------------|------------------------------|
| Define a complete system | Define a convention |
| Prescriptive conformance levels | Descriptive best practices |
| Invent new concepts (RID scheme) | Leverage existing standards |
| Detailed traversal algorithm | Trust implementers |
| IETF-style Internet-Draft | Practical spec document |
| "Full" vs "Minimal" conformance | Just works |
| Transport protocol detection rules | Use URIs as-is |

### 1.2 The Key Insight

The v0.3.0 spec opens with:

> *"A Gopher-like, agent-friendly 'menu system' for content navigation using well-known files—without inventing new transport schemes."*

This is the vision we should have stayed true to. Somewhere along the way, we started building an RFC instead of a pragmatic convention.

### 1.3 "Less is More"

The user's observation that "less is more" captures it perfectly. Every feature we add:
- Increases implementation burden
- Creates more edge cases
- Reduces adoption likelihood
- Moves us away from being a simple "dotfile convention"

---

## 2. Detailed Comparison

### 2.1 Document Structure

| Aspect | draft-rabit-rbt-04 | v0.3.0 Proposal |
|--------|-------------------|-----------------|
| Length | ~1,450 lines | ~340 lines |
| Sections | 18 major sections + appendices | 14 concise sections |
| Tone | Formal RFC-style | Practical guide |
| Normative language | Heavy RFC 2119 usage | Light, guidance-focused |

### 2.2 Core Concepts

| Concept | draft-rabit-rbt-04 | v0.3.0 Proposal |
|---------|-------------------|-----------------|
| **Burrow** | "Published content space" with complex metadata | "Browsable content collection" |
| **Warren** | Registry with detailed entry schema | "Registry index pointing to burrows" |
| **Entry** | 11 required/optional fields, pagination, links | Simple menu item with kind, path, uri |
| **Version field** | `"rbt": "0.2"` | `"specVersion": "rabit.dev/burrow-warren/v0.2"` |

### 2.3 Entries Schema Comparison

**Our Current Entry (Required Fields):**
```json
{
  "id": "required",
  "rid": "required (urn:rabit:sha256:...)",
  "href": "required",
  "type": "required (media type)",
  "rel": "required (array of relation types)"
}
```

**v0.3.0 Entry:**
```json
{
  "id": "required",
  "kind": "required (file|dir|burrow|link)",
  "uri": "required"
}
```

The v0.3.0 entry is dramatically simpler. No mandatory RID, no mandatory media type, no mandatory relation array.

### 2.4 Features We Added That v0.3.0 Omits

| Feature | Our Spec | v0.3.0 | Verdict |
|---------|----------|--------|---------|
| RID (urn:rabit:) scheme | Normative, required | Not present | **Remove** |
| Conformance levels | Minimal/Full for Publisher/Client | None | **Remove** |
| Traversal algorithm | Normative breadth-first | None | **Remove** |
| Error categories | 6 defined categories | None | **Remove** |
| Cache control directives | maxAge, staleWhileRevalidate | Guidance only | **Simplify** |
| Pagination (children) | Formal structure | None | **Remove or simplify** |
| Agent instructions (manifest.agents) | Structured with permissions | Not present | **Consider keeping but simplify** |
| Git provenance (manifest.git) | Detailed structure | None | **Remove** |
| Auth hints (manifest.auth) | Structured object | None | **Remove** |
| Transport protocol detection | Normative table | None (use URIs) | **Remove** |
| FTP/FTPS/SFTP roots | Detailed descriptors | None | **Remove** |
| File roots | Detailed descriptors | None | **Remove** |
| HTTP with insecure option | Detailed descriptor | None | **Remove** |
| Well-known discovery endpoints | Normative format | Optional mention | **Simplify** |
| IANA considerations | URN namespace request | None | **Remove** |
| Relation types vocabulary | Normative list | None | **Simplify** |
| Git-first philosophy | Core design principle | Transport-agnostic | **Reconsider** |

### 2.5 Features in v0.3.0 We Should Adopt

| Feature | Description |
|---------|-------------|
| `specVersion` format | `"rabit.dev/burrow-warren/v0.2"` is more self-documenting than `"0.2"` |
| Entry `kind` field | Simple enum: `file`, `dir`, `burrow`, `link` |
| `baseUri` at document level | Cleaner than embedded in roots |
| `burrows` array in warren | Direct list vs. generic `entries` |
| `priority` field | Simple numeric ordering for menus |
| Markdown companions as first-class | `.warren.md` / `.burrow.md` with recommended headings |
| Explicit non-goals section | Sets clear boundaries |

---

## 3. Analysis: What We Got Right

Not everything should change. Some of our additions have value:

### 3.1 Worth Keeping (Perhaps Simplified)

1. **`agents` section** - The concept of providing agent instructions is valuable, but:
   - Should be optional
   - Could be simplified to just `context`, `entryPoint`, and `hints`
   - `permissions` object is probably overengineered

2. **`repo` section** - Pointing to README, LICENSE is useful for standard files
   - v0.3.0 doesn't have this but it adds practical value
   - Keep it simple: just paths to well-known files

3. **`sha256` hashes** - The v0.3.0 spec includes this as optional
   - Good for cache validation
   - But NOT as part of a mandatory RID scheme

4. **`updated` timestamps** - Both specs have this; keep it

5. **`summary` and `description`** - Both specs have this; keep it

### 3.2 The "Dogfooding" Value

We've built working implementations (client, server, MCP plugin) that have:
- Validated the core concept works
- Identified what's actually needed vs. theoretical
- Proven that simpler is sufficient for real use cases

---

## 4. Recommendations

### 4.1 Overall Strategy: Adopt v0.3.0 as Base, With Selective Additions

**Approach:** Start with v0.3.0's simpler foundation and carefully add back only what's proven necessary.

**Rationale:**
- v0.3.0 captures the original vision better
- Easier to add features later than remove them
- Aligns with "convention over specification" philosophy

### 4.2 Specific Recommendations

#### Remove Entirely

1. **RID scheme (urn:rabit:)** - This is the biggest over-specification
   - Replace with optional `sha256` field for integrity checking
   - Use standard URIs for identification
   - No custom URN namespace

2. **Conformance levels** - Publisher/Client Minimal/Full
   - Replace with: "implementations SHOULD..." guidance
   - No formal conformance testing implied

3. **Normative traversal algorithm**
   - Move to "Implementation Notes" appendix if desired
   - Let implementers decide their traversal strategy

4. **Error categories and structured error reporting**
   - This is client implementation detail, not spec material
   - Remove entirely

5. **Transport protocol detection table**
   - Clients know how to handle URLs
   - Remove formal detection rules

6. **IANA considerations**
   - We're not submitting an RFC
   - Remove entirely

7. **FTP/FTPS/SFTP root descriptors**
   - Overengineered for a dotfile convention
   - Remove (clients can support them without spec blessing)

8. **HTTP with insecure option**
   - Client configuration detail, not spec material
   - Remove

9. **Pagination (children object)**
   - Complex for a "menu system"
   - Remove or move to "future considerations"

10. **Git provenance object**
    - Nice-to-have but adds weight
    - Remove from spec (tools can add it)

11. **Auth hints**
    - Out of scope per v0.3.0 non-goals
    - Remove

#### Simplify

1. **Root descriptors**
   - Keep simple: `uri` string OR object with `uri` and optional metadata
   - Remove specialized Git/HTTPS/File structures
   - Let the URI scheme speak for itself

2. **Entry schema**
   - Required: `id`, `kind`, `uri`
   - Optional: `title`, `summary`, `path`, `mediaType`, `sha256`, `sizeBytes`, `modified`, `tags`, `priority`
   - Remove: `rid`, `rel`, `lang`, `links`, `children`

3. **Relation types**
   - Remove normative vocabulary
   - If needed, use simple `tags` array

4. **Cache control**
   - Move to guidance section
   - Use HTTP cache headers where applicable

5. **Well-known discovery**
   - Optional mention in guidance
   - No normative format

#### Keep/Adopt

1. **`specVersion` format** from v0.3.0
   - `"rabit.dev/burrow-warren/v0.2"` style

2. **Entry `kind` values** from v0.3.0
   - `file`, `dir`, `burrow`, `link`

3. **`baseUri` at document level**
   - Cleaner resolution model

4. **`extensions` object**
   - Both specs have this; good for extensibility

5. **Markdown companions** (`.burrow.md`, `.warren.md`)
   - Keep with recommended headings from v0.3.0

6. **Non-goals section**
   - Explicitly states what we don't define
   - Prevents scope creep

7. **Selective `agents` section** (simplified)
   - `context`, `entryPoint`, `hints` only
   - Remove `permissions` and `ignore` complexity

8. **`repo` section** for standard files
   - Keep simple: `readme`, `license` paths

---

## 5. Proposed New Specification Outline

Based on the above analysis, here's a proposed outline for the revised spec:

```
# Rabit Burrow & Warren Specification (v0.3)

## 1. Purpose
   - Agent-friendly menu system
   - Convention over specification

## 2. Non-goals
   - No new URI schemes
   - No authentication
   - No transport protocols
   - No remote execution

## 3. Terminology
   - Burrow, Warren, Entry, Agent

## 4. Well-known Files
   - .burrow.json, .burrow.md
   - .warren.json, .warren.md
   - Placement rules

## 5. Discovery
   - Simple algorithm (try files, optionally walk up)

## 6. Warren Schema
   - specVersion, kind, title, description, updated
   - burrows array (id, title, uri, tags, priority)
   - Optional: warrens array for federation
   - extensions object

## 7. Burrow Schema
   - specVersion, kind, title, description, updated
   - baseUri (optional)
   - entries array
   - Optional: repo (readme, license paths)
   - Optional: agents (context, entryPoint, hints)
   - extensions object

## 8. Entry Schema
   - id (required)
   - kind (required): file | dir | burrow | link
   - uri (required)
   - Optional: title, summary, path, mediaType
   - Optional: sha256, sizeBytes, modified
   - Optional: tags, priority

## 9. Markdown Companions
   - Recommended headings
   - Relationship to JSON

## 10. Caching Guidance
    - Use sha256 for validation
    - Keep summaries concise

## 11. Security Considerations
    - Not access control
    - Operator responsibility

## 12. Extensibility
    - extensions object usage
    - Ignore unknown fields

## 13. References
    - RFC 3986, RFC 8615, etc.

## Appendix: Examples
```

---

## 6. Impact on Existing Implementation

### 6.1 What Changes in Packages

| Package | Impact | Changes Needed |
|---------|--------|----------------|
| `rabit-client` | Medium | Remove RID validation, simplify types, update parsing |
| `rabit-server` | Low | Update manifest generator output format |
| `opencode-rabit` | Low | Update tool descriptions, simplify types |
| `schemas/` | High | Rewrite both schemas to match v0.3.0 style |
| `examples/` | Medium | Update all .burrow.json files |

### 6.2 What Can Stay

- Core concept of traversal
- CLI structure
- MCP plugin integration model
- Docker-based server approach
- Example content (just update manifests)

### 6.3 Migration Path

1. **Phase 1:** Update spec document
2. **Phase 2:** Update JSON schemas
3. **Phase 3:** Update TypeScript types
4. **Phase 4:** Update client implementation
5. **Phase 5:** Update example manifests
6. **Phase 6:** Update server/generator
7. **Phase 7:** Update documentation

---

## 7. Open Questions

### 7.1 Decisions Needed

1. **Version numbering:** Should we adopt the `rabit.dev/burrow-warren/v0.3` format or keep short `"0.3"`?
   - Recommendation: Adopt the longer format—more self-documenting

2. **`kind` vs `rel`:** The v0.3.0 `kind` field (file/dir/burrow/link) is simpler than our `rel` array. Switch?
   - Recommendation: Yes, switch to `kind`

3. **`agents` section:** Keep our enhanced version or remove entirely?
   - Recommendation: Keep a simplified version (context, entryPoint, hints only)

4. **`repo` section:** Keep or remove?
   - Recommendation: Keep—it's useful and lightweight

5. **Git-first philosophy:** v0.3.0 is transport-agnostic. Pivot?
   - Recommendation: Yes, become transport-agnostic. Git is just another URI scheme.

6. **Root descriptors:** Keep structured objects or just use URI strings?
   - Recommendation: URI strings by default, optional object form for metadata

### 7.2 Community Considerations

- Existing implementations (if any outside this repo) would need migration
- Should we maintain backwards compatibility or clean break?
- Recommendation: **Clean break** at v0.3—we're pre-1.0 and this is the time to get it right

---

## 8. Conclusion

The v0.3.0 feedback is correct. We over-engineered the specification by:

1. Inventing a URN scheme we don't need
2. Defining conformance levels for a dotfile convention
3. Specifying traversal algorithms that clients will implement anyway
4. Adding transport protocol machinery that standard libraries handle

The path forward is to:

1. **Adopt v0.3.0 as the new baseline**
2. **Carefully add back only what's proven necessary**
3. **Keep the implementations working but simplify them**
4. **Embrace "convention over specification"**

The goal is a spec that someone can read in 10 minutes and implement in an afternoon—not something that looks like it belongs in the IETF archive.

---

## 9. Next Steps

1. [ ] Review this analysis document
2. [ ] Make decisions on open questions
3. [ ] Draft new v0.3.0 spec based on decisions
4. [ ] Update JSON schemas
5. [ ] Update TypeScript types
6. [ ] Update client implementation
7. [ ] Update example manifests
8. [ ] Update server/generator
9. [ ] Update README and documentation

---

## Appendix A: Side-by-Side Schema Examples

### Current (draft-rabit-rbt-04) Burrow Manifest

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
      }
    ],
    "repo": { "readme": "README.md" },
    "agents": { "context": "...", "entryPoint": "readme" }
  },
  "entries": [
    {
      "id": "readme",
      "rid": "urn:rabit:sha256:b2c3d4e5...",
      "href": "README.md",
      "type": "text/markdown",
      "rel": ["index", "about"],
      "title": "About"
    }
  ]
}
```

### Proposed (v0.3.0-style) Burrow Manifest

```json
{
  "specVersion": "rabit.dev/burrow-warren/v0.3",
  "kind": "burrow",
  "title": "Example Burrow",
  "description": "A simple content collection.",
  "updated": "2025-01-15T00:00:00Z",
  "baseUri": "https://example.com/docs/",
  "entries": [
    {
      "id": "readme",
      "title": "About",
      "kind": "file",
      "path": "README.md",
      "uri": "README.md",
      "mediaType": "text/markdown",
      "summary": "Introduction to this burrow."
    }
  ],
  "extensions": {}
}
```

**Observations:**
- Flatter structure (no nested `manifest` object)
- No RID—just optional sha256 for integrity
- `kind` instead of `rel` array
- `baseUri` at top level
- Simpler, cleaner, more readable

---

## Appendix B: Feature Disposition Summary

| Feature | Disposition | Notes |
|---------|-------------|-------|
| RID (urn:rabit:) | REMOVE | Use sha256 hash optionally |
| Conformance levels | REMOVE | Guidance only |
| Traversal algorithm | REMOVE | Implementation detail |
| Error categories | REMOVE | Implementation detail |
| Cache directives | SIMPLIFY | Guidance section |
| Pagination | REMOVE | Out of scope for v1 |
| Git provenance | REMOVE | Tool-generated if needed |
| Auth hints | REMOVE | Non-goal |
| Transport detection | REMOVE | Obvious from URI |
| FTP/SFTP roots | REMOVE | Just use URI |
| HTTP insecure | REMOVE | Client config |
| IANA registration | REMOVE | Not an RFC |
| rel vocabulary | SIMPLIFY | Use kind + tags |
| agents section | SIMPLIFY | context, entryPoint, hints |
| repo section | KEEP | Useful, lightweight |
| sha256 hashes | KEEP | Optional integrity |
| Markdown companions | KEEP | With recommended headings |
| baseUri | ADOPT | From v0.3.0 |
| kind field | ADOPT | From v0.3.0 |
| specVersion format | ADOPT | From v0.3.0 |
| priority field | ADOPT | From v0.3.0 |
| tags field | KEEP | Both specs have it |
