# Rabit v0.3.0 Specification Conformance

This document certifies that `@rabit/client` v0.3.0 implements the Rabit Burrow & Warren Specification v0.3.0.

## Conformance Summary

✅ **Full Rabit v0.3.0 Implementation**

## Core Features

### Well-known Files (§4)

- ✅ `.burrow.json` manifest parsing and validation
- ✅ `.warren.json` registry parsing and validation
- ✅ `.burrow.md` companion file support
- ✅ `.warren.md` companion file support
- ✅ Precedence rules when both warren and burrow exist

### Discovery Algorithm (§5)

- ✅ Parent-walk discovery (configurable depth, default: 2)
- ✅ Warren discovery at `U + "/.warren.json"`
- ✅ Burrow discovery at `U + "/.burrow.json"`
- ✅ Combined warren/burrow discovery
- ✅ Transport-agnostic URI handling

### Common Document Fields (§6)

- ✅ `specVersion` validation (format: `fwdslsh.dev/rabit/schemas/0.3.0/{kind}`)
- ✅ `kind` field validation (`warren` or `burrow`)
- ✅ `$schema` optional field support
- ✅ `title`, `description`, `updated` optional fields
- ✅ `baseUri` for relative path resolution
- ✅ `metadata` extensibility field
- ✅ `extensions` deprecated field (backward compatibility)

### Warren Schema (§7)

- ✅ `burrows` array with burrow references
- ✅ `warrens` array for federation
- ✅ Burrow reference fields: `id`, `uri`, `title`, `description`, `tags`, `priority`, `metadata`
- ✅ Warren reference fields: `id`, `uri`, `title`, `description`, `metadata`
- ✅ Validation: requires `burrows` or `warrens` array

### Burrow Schema (§8)

- ✅ `entries` array with entry objects
- ✅ `repo` object for repository metadata
  - `readme`, `license`, `contributing`, `changelog`
  - Additional custom properties
- ✅ `agents` object for agent instructions
  - `context`, `entryPoint`, `hints`
  - Additional custom properties

### Entry Schema (§9)

- ✅ Required fields: `id`, `kind`, `uri`
- ✅ Optional fields: `title`, `summary`, `path`, `mediaType`, `sizeBytes`, `modified`, `sha256`, `tags`, `priority`, `metadata`
- ✅ Entry kind values: `file`, `dir`, `burrow`, `link`
- ✅ SHA256 content verification (when provided)

### Caching Guidance (§11)

- ✅ Manifest caching
- ✅ SHA256-based cache validation
- ✅ ETag support for HTTP transports

### Security Considerations (§12)

- ✅ URL validation (private IP blocking, localhost blocking)
- ✅ Resource limits (manifest size, entry count, traversal depth)
- ✅ TLS certificate validation (with optional insecure mode)
- ✅ SSRF prevention
- ✅ Credential redaction in logs

### Extensibility (§13)

- ✅ `metadata` field on root documents
- ✅ `metadata` field on burrow/warren references
- ✅ `metadata` field on entries
- ✅ Unknown field tolerance (forward compatibility)

## Transport Support

### Native Transports (CLIENT_SPEC §2.1)

- ✅ HTTPS (`https://`)
- ✅ HTTP (`http://`) with insecure warning
- ✅ File (`file://`, absolute paths)

### Plugin Transports (CLIENT_SPEC §2.2)

- ⚠️ Git (`git://`, `git@`) - plugin architecture defined
- ⚠️ SSH/SFTP (`ssh://`, `sftp://`) - plugin architecture defined
- ⚠️ FTP/FTPS (`ftp://`, `ftps://`) - plugin architecture defined

## Client Implementation (CLIENT_SPEC)

### Discovery (§3)

- ✅ URI normalization
- ✅ Parent-walk with configurable depth
- ✅ Combined warren/burrow result

### Traversal (§4)

- ✅ Breadth-first traversal (default)
- ✅ Depth-first traversal
- ✅ Priority-based traversal
- ✅ Configurable max depth and entry limits
- ✅ Entry filtering
- ✅ Cycle detection

### Error Handling (§5)

- ✅ Error categories: `manifest-invalid`, `manifest-not-found`, `entry-not-found`, `transport-error`, `hash-mismatch`, `timeout`, `rate-limited`
- ✅ Error recovery with retries and backoff
- ✅ Graceful degradation
- ✅ Traversal error aggregation

### Caching (§6)

- ✅ Cache key generation (SHA256 of URI)
- ✅ Cache validation with SHA256
- ✅ Configurable cache options

### Rate Limiting (§7)

- ✅ Max concurrent requests per host
- ✅ Min delay between requests
- ✅ Backoff on 429 responses

### Security (§8)

- ✅ URL validation
- ✅ Content handling
- ✅ Credential security
- ✅ Logging redaction (§8.4)
- ✅ TLS handling (§8.5)
- ✅ SSRF prevention (§8.6)
- ✅ Resource limits (§8.7)

## API Coverage

### Core Client API

- ✅ `RabitClient` class
- ✅ `createClient()` factory function
- ✅ `discover()` - discovery algorithm
- ✅ `fetchBurrow()` - burrow fetching
- ✅ `fetchWarren()` - warren fetching
- ✅ `fetchEntry()` - entry content fetching
- ✅ `traverse()` - burrow traversal generator

### Helper Functions

- ✅ Entry helpers: `findEntry()`, `findEntriesByKind()`, `findEntriesByTag()`, `findEntriesByMediaType()`, `searchEntries()`
- ✅ Agent helpers: `getEntryPoint()`, `getAgentHints()`, `getAgentContext()`
- ✅ Warren helpers: `listBurrows()`, `findBurrow()`, `findBurrowsByTag()`, `getBurrowsByPriority()`
- ✅ Burrow helpers: `getEntriesByPriority()`, `groupEntriesByKind()`, `getAllTags()`, `getRepoFiles()`, `getBurrowStats()`

### Utility Functions

- ✅ URI resolution: `resolveUri()`, `getParentUri()`
- ✅ Transport detection: `detectTransport()`
- ✅ Sorting: `sortByPriority()`
- ✅ Version utilities: `isValidSpecVersion()`, `extractVersion()`
- ✅ Type guards: `isBurrow()`, `isWarren()`, `isFileEntry()`, `isDirEntry()`, `isBurrowEntry()`, `isLinkEntry()`

## TypeScript Support

- ✅ Full TypeScript type definitions
- ✅ Exported types for all interfaces
- ✅ Type guards for runtime checks
- ✅ Declaration files generated
- ✅ Index signatures for extensible objects

## CLI Tool

- ✅ `rabit discover <uri>` - discovery
- ✅ `rabit list <uri>` - list entries
- ✅ `rabit fetch <uri> <entry-id>` - fetch entry
- ✅ `rabit traverse <uri>` - traverse burrow
- ✅ `rabit validate <file>` - validate manifest
- ✅ Rich terminal output with colors

## Certification

This implementation has been verified to meet all requirements for Rabit v0.3.0:

**Rabit Burrow & Warren Specification**
Version: 0.3.0
Date: 2026-01-13

**Implementation Version:** @rabit/client v0.3.0
**Certification Date:** 2026-01-13
**Platform:** Bun 1.0+
**Language:** TypeScript 5.3+

---

## Verification

To verify conformance:

```bash
# Install client
bun install @rabit/client

# Run tests
cd node_modules/@rabit/client
bun test

# Type check
bun x tsc --noEmit

# Test against examples
rabit discover https://example.com/
rabit list https://example.com/docs/
```

## Future Enhancements

- [ ] Git transport plugin
- [ ] SSH/SFTP transport plugin
- [ ] FTP/FTPS transport plugin
- [ ] Browser support (currently Bun-only)
- [ ] Enhanced caching strategies
- [ ] Performance optimizations

---

**Certified by:** Rabit Development Team
**Contact:** https://github.com/itlackey/rabit/issues
