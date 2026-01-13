# RBT Specification Conformance

This document certifies that `@rabit/client` v0.2.0 implements **Full RBT Client** conformance as defined in the Rabit Burrow Traversal Specification draft-rabit-rbt-03.

## Conformance Level

✅ **RBT Client (Full)** - Specification §3.2.2

## Required Features

All required features for Full Client conformance have been implemented:

### Core Functionality (§3.2.1 - Minimal Client)

- ✅ **Parse `.burrow.json`** per §5
  - Implementation: `src/client.ts:fetchBurrowFromUrl()`, `src/client.ts:fetchBurrowFromGit()`
  - Validates required fields: `rbt`, `manifest`, `entries`
  - Validates manifest size limits (10 MB max)
  - Validates entry count limits (10,000 max per manifest)

- ✅ **Resolve entries via HTTPS roots**
  - Implementation: `src/client.ts:fetchEntryFromHttps()`
  - Supports relative and absolute href resolution
  - Proper URL validation and security checks

- ✅ **Implement traversal algorithm** per §8
  - Implementation: `src/client.ts:traverseBurrow()`
  - Breadth-first traversal (default)
  - Configurable depth and entry limits
  - Supports filtering and pagination

- ✅ **Handle errors** per §9
  - Implementation: `src/utils.ts:createError()`, `src/types.ts:RbtError`
  - All error categories implemented: `manifest_invalid`, `manifest_not_found`, `entry_not_found`, `verification_failed`, `transport_error`, `rate_limited`
  - Structured error reporting with retry attempts
  - Graceful degradation and partial success support

### Advanced Features (§3.2.2 - Full Client)

- ✅ **Support Git transports** (HTTPS and SSH remotes)
  - Implementation: `src/git.ts`
  - HTTPS Git remotes: `https://github.com/org/repo.git`
  - SSH Git remotes: `git@github.com:org/repo.git`
  - Supports fully-qualified refs and commit SHAs
  - Supports path within repository
  - Uses Bun subprocess for Git operations

- ✅ **Support file roots using native OS file access**
  - Implementation: `src/client.ts:fetchBurrowFromFile()`, `fetchEntryFromFile()`
  - Local file paths: `/home/user/docs/`
  - Windows paths: `C:\Documents\`
  - SMB/CIFS shares: `\\server\share\` (via OS mount)
  - NFS mounts: `/mnt/nfs/docs/` (via OS mount)
  - Uses native `fs` module for file access
  - Inherits authentication from OS-level mechanisms

- ✅ **Verify RIDs** when fetching resources
  - Implementation: `src/utils.ts:verifyContent()`, `src/utils.ts:computeRid()`
  - SHA-256 hash computation per §7.3
  - Verification against `entry.rid` and `entry.hash`
  - Automatic verification on fetch (configurable)

- ✅ **Support mirror fallback** per §6.4
  - Implementation: `src/client.ts:fetchEntry()`
  - Tries all primary roots in order
  - Falls back to mirrors on failure
  - Verifies content from mirrors
  - Tracks which root succeeded

- ✅ **Implement cycle detection** per §7.3
  - Implementation: `src/client.ts:traverseBurrow()`
  - Maintains set of visited RIDs
  - Skips entries with duplicate RIDs
  - Logs cycle detection for debugging

- ✅ **Respect cache directives** per §8.5
  - Implementation: `src/client.ts:ManifestCache`
  - Honors `manifest.cache.maxAge`
  - Honors `manifest.cache.staleWhileRevalidate`
  - Defaults to 1 hour cache for manifests without directives
  - Optional cache enable/disable

## Supported Specifications

### Root Descriptors (§5)

- ✅ Git Root (§5.2.1)
  - `remote`: Git remote URL
  - `ref`: Fully-qualified ref or commit SHA
  - `path`: Optional path within repository

- ✅ HTTPS Root (§5.2.2)
  - `base`: HTTPS URL ending with `/`
  - Manifest at `${base}.burrow.json`

- ✅ File Root (§5.2.3)
  - `path`: Absolute path to burrow root
  - Supports local paths, SMB/CIFS, NFS via native OS access
  - Path traversal prevention for security

- ✅ Root Selection (§5.3)
  - Prefers file roots for local/network access (lowest latency)
  - Then Git roots for versioning and integrity
  - Falls back to HTTPS roots for simplicity

### File Names and Discovery (§4)

- ✅ Required files (§4.1)
  - `.burrow.json` manifest parsing
  - `.warren.json` registry parsing

- ✅ Human-readable companions (§4.1.1)
  - `.burrow.md` discovery and display
  - `.warren.md` discovery and display

### Manifest Format (§6)

- ✅ Top-level structure (§6.2)
  - `rbt`, `$schema`, `manifest`, `entries`

- ✅ Manifest metadata (§6.3)
  - `title`, `updated`, `rid`, `roots`
  - Optional: `description`, `mirrors`, `repo`, `agents`, `auth`, `cache`, `git`

- ✅ Entry objects (§6.4)
  - Required: `id`, `rid`, `href`, `type`, `rel`
  - Optional: `title`, `summary`, `hash`, `size`, `modified`, `lang`, `links`, `children`

- ✅ Relation types (§6.5)
  - All normative relation types supported: `item`, `collection`, `index`, `about`, `alternate`, `parent`, `related`, `license`, `author`

- ✅ Pagination (§6.7)
  - `children` descriptor with `href`, `offset`, `limit`, `total`
  - Recursive child manifest fetching

### RID Computation (§7)

- ✅ RID scheme (§7.2)
  - `urn:rabit:sha256:{hex}`
  - 64-character lowercase hexadecimal SHA-256 digest

- ✅ RID computation (§7.3)
  - For regular files: SHA-256 over raw bytes
  - Uses file content, not Git blob format
  - Consistent between Git and HTTPS

- ✅ Mirror substitution (§7.4)
  - Verifies content against RID/hash
  - Falls back on verification failure
  - Logs verification failures

### Traversal (§8)

- ✅ Breadth-first traversal (§8.3)
  - Queue-based implementation
  - Configurable depth and entry limits
  - Optional filter function

- ✅ Cycle detection (§8.4)
  - RID-based visited tracking
  - Skips duplicate entries

- ✅ Cache control (§8.5)
  - Manifest-level cache directives
  - `maxAge` and `staleWhileRevalidate`
  - Conditional requests with ETag

- ✅ Rate limiting (§8.6)
  - Maximum 10 concurrent requests per host (configurable)
  - Minimum 100ms delay between requests (configurable)
  - Exponential backoff on 429 responses

### Error Handling (§9)

- ✅ Error categories (§9.1)
  - All categories implemented
  - Proper recovery strategies

- ✅ Graceful degradation (§9.2)
  - Root fallback
  - Mirror fallback
  - Partial success
  - Error aggregation

- ✅ Error reporting (§9.3)
  - Structured traversal reports
  - Timestamps and metrics
  - Detailed error information

### Warren Registry (§10)

- ✅ Registry format (§10.2, §10.3)
  - `.warren.json` and `.warren.md`
  - All required and optional fields

- ✅ Registry entries (§10.5)
  - `name`, `title`, `summary`, `roots`
  - Optional: `rid`, `tags`, `updated`

### Well-Known Discovery (§11)

- ✅ `/.well-known/rabit-burrow` (§11.1)
  - Implementation: `src/client.ts:discoverBurrow()`
  - Returns manifest location and roots

- ✅ `/.well-known/rabit-warren` (§11.2)
  - Implementation: `src/client.ts:discoverWarren()`
  - Returns registry locations (JSON and Markdown)

### Agent Instructions (§13)

- ✅ Standard repository files (§13.3)
  - `manifest.repo` metadata
  - README, LICENSE, CONTRIBUTING, CHANGELOG, SECURITY

- ✅ Manifest-based instructions (§13.4)
  - `manifest.agents` object
  - `context`, `entryPoint`, `hints`, `ignore`

- ✅ Permissions guidance (§13.5)
  - `manifest.agents.permissions`
  - Advisory hints (not enforced)

### Authentication (§14)

- ✅ Authentication metadata
  - `manifest.auth` object
  - `required` and `documentation` fields
  - Uses standard Git and HTTPS authentication

### Security (§15)

- ✅ URL validation (§15.2)
  - Implementation: `src/utils.ts:validateUrl()`
  - Rejects non-HTTPS URLs (except git://)
  - Rejects private IPs and localhost
  - Rejects URLs with credentials

- ✅ Resource limits (§15.3)
  - Implementation: `src/utils.ts:RESOURCE_LIMITS`
  - Maximum manifest size: 10 MB
  - Maximum entry count: 10,000
  - Maximum traversal depth: 100
  - Maximum total entries: 1,000,000
  - Maximum request timeout: 30 seconds

- ✅ Content handling (§15.4)
  - Treats content as untrusted
  - Validates media types
  - Implements resource limits

## API Coverage

### Core Client API

- ✅ `RabitClient` class
- ✅ `createClient()` factory function
- ✅ `fetchBurrow()` - manifest fetching
- ✅ `fetchWarren()` - registry fetching
- ✅ `fetchEntry()` - entry content fetching
- ✅ `traverseBurrow()` - burrow traversal
- ✅ `discoverBurrow()` - well-known discovery
- ✅ `discoverWarren()` - well-known discovery
- ✅ `generateTraversalReport()` - error reporting

### Helper Functions

- ✅ Entry discovery: `findEntry()`, `findEntriesByRel()`, `findEntriesByType()`, `searchEntries()`
- ✅ Agent helpers: `getEntryPoint()`, `getAgentHints()`, `getAgentContext()`, `checkPermission()`, `getIgnorePatterns()`
- ✅ Warren helpers: `listBurrows()`, `findBurrow()`, `findBurrowsByTag()`, `getBurrowUrl()`, `getAllTags()`
- ✅ Burrow metadata: `getBurrowBaseUrl()`, `getRepoFiles()`, `requiresAuth()`, `getCacheDirectives()`, `getBurrowStats()`
- ✅ Entry helpers: `isCollection()`, `isIndex()`, `hasPagination()`, `getEntriesByRelation()`, `groupByMediaType()`

### Utility Functions

- ✅ RID computation: `computeSha256()`, `computeRid()`, `verifyContent()`
- ✅ Validation: `validateUrl()`, `validateManifestSize()`, `validateEntryCount()`
- ✅ Error handling: `createError()`
- ✅ Type guards: `isGitRoot()`, `isHttpsRoot()`, `getBaseUrl()`

### Git Functions

- ✅ `cloneRepository()` - Git repository cloning
- ✅ `readFileFromRepo()` - File reading from cloned repo
- ✅ `cleanupRepository()` - Cleanup after use
- ✅ `isGitAvailable()` - Git availability check

## Testing

- ✅ Comprehensive test suite (`src/client.test.ts`)
- ✅ Unit tests for core functionality
- ✅ Type guards and utilities tested
- ✅ Helper functions tested
- ✅ All tests passing

## TypeScript Support

- ✅ Full TypeScript type definitions
- ✅ Exported types for all interfaces
- ✅ Type guards for runtime checks
- ✅ Declaration files generated

## CLI Tool

- ✅ Full-featured CLI (`src/cli.ts`)
- ✅ All major operations supported
- ✅ Comprehensive help and examples
- ✅ Rich terminal output with colors

## Documentation

- ✅ Comprehensive README with API reference
- ✅ Implementor's guide with practical examples
- ✅ Example code (`examples/basic-usage.ts`)
- ✅ Inline documentation and JSDoc comments

## Specification Compliance Summary

| Section | Feature | Status |
|---------|---------|--------|
| §3.2.1 | Minimal Client | ✅ Fully Implemented |
| §3.2.2 | Full Client | ✅ Fully Implemented |
| §4.1 | File Names (.burrow.json, .warren.json) | ✅ Fully Implemented |
| §4.1.1 | Human-readable companions (.burrow.md, .warren.md) | ✅ Fully Implemented |
| §5 | Git, HTTPS, and File Roots | ✅ Fully Implemented |
| §5.2.3 | File Roots (local/SMB/NFS) | ✅ Fully Implemented |
| §6 | Manifest Format | ✅ Fully Implemented |
| §7 | RID Verification | ✅ Fully Implemented |
| §8 | Traversal Algorithm | ✅ Fully Implemented |
| §9 | Error Handling | ✅ Fully Implemented |
| §10 | Warren Registry | ✅ Fully Implemented |
| §11 | Well-Known Discovery | ✅ Fully Implemented |
| §13 | Agent Instructions | ✅ Fully Implemented |
| §14 | Authentication | ✅ Fully Implemented |
| §15 | Security | ✅ Fully Implemented |

## Certification

This implementation has been verified to meet all requirements for **RBT Client (Full)** conformance as defined in:

**Rabit Burrow Traversal Specification**
draft-rabit-rbt-03
Version 0.2
Date: 2026-01-13

**Implementation Version:** @rabit/client v0.2.0
**Certification Date:** 2026-01-12
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

# Test against specification examples
rabit burrow https://rabit.dev/examples/
rabit warren https://rabit.dev/registry/
```

## Future Enhancements

While this implementation achieves Full Client conformance, future versions may add:

- [ ] Manifest signing verification (§15.6 - reserved for future)
- [ ] Enhanced caching strategies
- [ ] Additional security hardening
- [ ] Performance optimizations
- [ ] Browser support (currently Bun-only)

---

**Certified by:** Rabit Development Team
**Contact:** https://github.com/itlackey/rabit/issues
