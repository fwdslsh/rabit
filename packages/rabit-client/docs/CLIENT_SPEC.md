# Rabit Client Implementation Specification

**Version:** 0.4.0
**Date:** 2026-01-13
**Status:** Implementation Guide
**Applies to:** rabit-client package

---

## 1. Overview

This document provides implementation guidance for the `rabit-client` package—a universal burrow browser that works across multiple transport protocols. While the core Rabit specification (v0.4.0) is transport-agnostic, this client aims to provide seamless access to burrows regardless of how they're hosted.

### 1.1 Design Philosophy

The rabit-client acts as a "universal burrow browser" similar to how a web browser handles multiple protocols (HTTP, HTTPS, file://, etc.). The client:

- Automatically detects transport protocols from URIs
- Provides a consistent API regardless of underlying transport
- Supports plugins for transport types not natively available
- Handles caching, error recovery, and traversal logic

---

## 2. Supported Transports

### 2.1 Native Transports (Built-in)

These transports are supported directly by the client using Bun.js native capabilities:

| Transport | URI Schemes | Description |
|-----------|-------------|-------------|
| HTTPS | `https://` | Secure HTTP fetch |
| HTTP | `http://` | Insecure HTTP (with warning) |
| File | `file://`, absolute paths | Local filesystem access |

### 2.2 Plugin Transports

These transports require additional plugins or dependencies:

| Transport | URI Schemes | Plugin Required |
|-----------|-------------|-----------------|
| Git | `git://`, `git@`, `https://*.git` | `@fwdslsh/rabit-transport-git` |
| SSH/SFTP | `ssh://`, `sftp://` | `@fwdslsh/rabit-transport-ssh` |
| FTP/FTPS | `ftp://`, `ftps://` | `@fwdslsh/rabit-transport-ftp` |

### 2.3 Transport Detection

The client automatically detects the appropriate transport based on URI patterns:

```typescript
function detectTransport(uri: string): TransportType {
  if (uri.startsWith('https://')) return 'https';
  if (uri.startsWith('http://')) return 'http';
  if (uri.startsWith('file://')) return 'file';
  if (uri.startsWith('/') || /^[A-Z]:\\/.test(uri)) return 'file';
  if (uri.startsWith('git://') || uri.startsWith('git@')) return 'git';
  if (uri.includes('.git')) return 'git';
  if (uri.startsWith('ssh://') || uri.startsWith('sftp://')) return 'ssh';
  if (uri.startsWith('ftp://') || uri.startsWith('ftps://')) return 'ftp';

  // Default to HTTPS for unrecognized schemes
  return 'https';
}
```

### 2.4 Transport Override

Clients should support explicit transport override for edge cases:

```typescript
interface FetchOptions {
  transport?: 'https' | 'http' | 'file' | 'git' | 'ssh' | 'ftp';
  insecure?: boolean;  // Skip TLS certificate validation
}
```

---

## 3. Discovery Implementation

### 3.1 Discovery Algorithm

The client implements the multi-convention discovery order defined in Rabit v0.4.0 §5:

```typescript
async function discover(uri: string, options?: DiscoverOptions): Promise<DiscoveryResult> {
  const maxDepth = options?.maxParentWalk ?? 2;
  let currentUri = normalizeUri(uri);

  for (let depth = 0; depth <= maxDepth; depth++) {
    // Try warren discovery (all conventions)
    const warren = await discoverWarren(currentUri);

    // Try burrow discovery (all conventions)
    const burrow = await discoverBurrow(currentUri);

    if (warren || burrow) {
      return {
        warren: warren ? parseWarren(warren) : null,
        burrow: burrow ? parseBurrow(burrow) : null,
        baseUri: currentUri,
        depth
      };
    }

    // Walk up to parent
    currentUri = getParentUri(currentUri);
  }

  return { warren: null, burrow: null, baseUri: uri, depth: -1 };
}

async function discoverWarren(baseUri: string): Promise<string | null> {
  // Try conventions in order (§4.0)
  const conventions = [
    '.warren.json',           // 1. Dotfile (git/filesystem friendly)
    'warren.json',            // 2. Non-dotfile (web server friendly)
    '.well-known/warren.json' // 3. RFC 8615 standard location
  ];

  for (const convention of conventions) {
    const uri = joinUri(baseUri, convention);
    const content = await tryFetch(uri);
    if (content) return content;
  }

  return null;
}

async function discoverBurrow(baseUri: string): Promise<string | null> {
  // Try conventions in order (§4.0)
  const conventions = [
    '.burrow.json',           // 1. Dotfile (git/filesystem friendly)
    'burrow.json',            // 2. Non-dotfile (web server friendly)
    '.well-known/burrow.json' // 3. RFC 8615 standard location
  ];

  for (const convention of conventions) {
    const uri = joinUri(baseUri, convention);
    const content = await tryFetch(uri);
    if (content) return content;
  }

  return null;
}
```

### 3.2 URI Normalization

Ensure consistent URI handling:

```typescript
function normalizeUri(uri: string): string {
  // Ensure trailing slash for directories
  if (!uri.endsWith('/') && !hasFileExtension(uri)) {
    uri = uri + '/';
  }

  // Resolve relative paths
  if (uri.startsWith('./') || uri.startsWith('../')) {
    uri = resolvePath(process.cwd(), uri);
  }

  return uri;
}
```

---

## 4. Traversal Implementation

### 4.1 Traversal Strategy

The client should support configurable traversal strategies:

```typescript
type TraversalStrategy = 'breadth-first' | 'depth-first' | 'priority';

interface TraversalOptions {
  strategy?: TraversalStrategy;
  maxDepth?: number;
  maxEntries?: number;
  filter?: (entry: Entry) => boolean;
}
```

### 4.2 Breadth-First Traversal (Default)

```typescript
async function* traverse(
  burrow: Burrow,
  options?: TraversalOptions
): AsyncGenerator<TraversalEvent> {
  const queue: TraversalItem[] = [];
  const visited = new Set<string>();
  const maxDepth = options?.maxDepth ?? 100;
  const maxEntries = options?.maxEntries ?? 100000;
  let entriesProcessed = 0;

  // Initialize queue with root entries
  for (const entry of sortByPriority(burrow.entries)) {
    queue.push({ entry, depth: 0, parentUri: burrow.baseUri });
  }

  while (queue.length > 0 && entriesProcessed < maxEntries) {
    const item = queue.shift()!;
    const entryKey = item.entry.uri || item.entry.id;

    // Cycle detection
    if (visited.has(entryKey)) {
      yield { type: 'cycle-detected', entry: item.entry };
      continue;
    }
    visited.add(entryKey);

    // Depth limit
    if (item.depth > maxDepth) {
      yield { type: 'depth-limit', entry: item.entry };
      continue;
    }

    // Apply filter
    if (options?.filter && !options.filter(item.entry)) {
      continue;
    }

    yield { type: 'entry', entry: item.entry, depth: item.depth };
    entriesProcessed++;

    // Queue children for burrow/dir/map entries
    if (item.entry.kind === 'burrow' || item.entry.kind === 'dir') {
      const childBurrow = await tryFetchBurrow(item.entry.uri);
      if (childBurrow) {
        for (const child of sortByPriority(childBurrow.entries)) {
          queue.push({
            entry: child,
            depth: item.depth + 1,
            parentUri: item.entry.uri
          });
        }
      }
    } else if (item.entry.kind === 'map') {
      // Map entries point directly to burrow JSON files
      const mapBurrow = await tryFetchBurrowFile(item.entry.uri);
      if (mapBurrow) {
        for (const child of sortByPriority(mapBurrow.entries)) {
          queue.push({
            entry: child,
            depth: item.depth + 1,
            parentUri: item.entry.uri
          });
        }
      }
    }
  }
}
```

### 4.3 Priority Sorting

When `priority` field is present, sort entries in descending order:

```typescript
function sortByPriority(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    const priorityA = a.priority ?? 0;
    const priorityB = b.priority ?? 0;
    return priorityB - priorityA;
  });
}
```

### 4.4 Map vs Burrow Entry Handling

**New in v0.4.0:** The client must distinguish between `burrow` and `map` entry kinds:

```typescript
async function tryFetchBurrow(uri: string): Promise<Burrow | null> {
  // For burrow entries: URI points to a directory
  // Try discovery conventions (.burrow.json, burrow.json, .well-known/burrow.json)
  const conventions = ['.burrow.json', 'burrow.json', '.well-known/burrow.json'];

  for (const convention of conventions) {
    const burrowUri = joinUri(uri, convention);
    const content = await tryFetch(burrowUri);
    if (content) {
      return parseBurrow(content);
    }
  }

  return null;
}

async function tryFetchBurrowFile(uri: string): Promise<Burrow | null> {
  // For map entries: URI points directly to a burrow JSON file
  const content = await tryFetch(uri);
  if (content) {
    return parseBurrow(content);
  }

  return null;
}
```

**Guidelines:**
- `kind: "burrow"` → Call `tryFetchBurrow()` with directory URI
- `kind: "map"` → Call `tryFetchBurrowFile()` with direct file URI
- `kind: "dir"` → Optional traversal (may or may not have burrow file)
- `kind: "file"` → Terminal node, fetch content directly
- `kind: "link"` → External reference, handle as appropriate

### 4.5 Burrow Granularity Best Practices

**New in v0.4.0:** Following the spec's guidance (§4.3), clients should:

1. **Prefer nested burrows** for large directory structures
2. **Use map files** for topic-based organization within a directory
3. **Load incrementally** - don't fetch all entries upfront
4. **Cache burrow files** separately from entry content

**Example navigation flow:**

```typescript
// 1. Start at root
const root = await client.fetchBurrow('https://example.com/docs/');

// 2. User selects "API Reference" (kind: "burrow")
const apiDocs = await client.fetchBurrow('https://example.com/docs/api/');

// 3. User selects "REST API" (kind: "map")
const restApi = await client.fetchBurrowFile('https://example.com/docs/api/rest-api.burrow.json');

// 4. User selects specific endpoint (kind: "file")
const content = await client.fetchEntry(restApi, 'auth-endpoint');
```

This incremental approach reduces initial load time and token usage for LLM agents.

---

## 5. Error Handling

### 5.1 Error Categories

```typescript
type ErrorCategory =
  | 'manifest-invalid'      // JSON parse error or schema violation
  | 'manifest-not-found'    // 404 or file not found
  | 'entry-not-found'       // Entry resource missing
  | 'transport-error'       // Network or protocol error
  | 'hash-mismatch'         // SHA256 verification failed
  | 'timeout'               // Request timeout
  | 'rate-limited';         // 429 or similar
```

### 5.2 Error Recovery

```typescript
interface ErrorRecovery {
  maxRetries: number;
  backoffMs: number[];      // e.g., [1000, 2000, 4000, 8000]
  skipOnError: boolean;     // Continue traversal on entry errors
}

const defaultRecovery: ErrorRecovery = {
  maxRetries: 3,
  backoffMs: [1000, 2000, 4000],
  skipOnError: true
};
```

### 5.3 Graceful Degradation

1. **Transport Fallback:** If a URI fails, try alternate schemes if applicable
2. **Partial Success:** Continue traversal even if some entries fail
3. **Error Aggregation:** Collect and report all errors after traversal

```typescript
interface TraversalResult {
  entriesProcessed: number;
  entriesSkipped: number;
  errors: TraversalError[];
  duration: number;
}
```

---

## 6. Caching

### 6.1 Cache Strategy

```typescript
interface CacheOptions {
  enabled: boolean;
  directory?: string;           // Cache storage location
  maxAge?: number;              // Default TTL in seconds
  validateSha256?: boolean;     // Verify sha256 on cache hit
}
```

### 6.2 Cache Key Generation

```typescript
function getCacheKey(uri: string): string {
  // Use SHA256 of URI as cache key
  return crypto.createHash('sha256').update(uri).digest('hex');
}
```

### 6.3 Cache Validation

When `sha256` field is present in an entry:

```typescript
async function validateCache(
  entry: Entry,
  cachedContent: Buffer
): Promise<boolean> {
  if (!entry.sha256) return true;  // No hash to validate

  const actualHash = crypto
    .createHash('sha256')
    .update(cachedContent)
    .digest('hex');

  return actualHash === entry.sha256;
}
```

---

## 7. Rate Limiting

### 7.1 Default Limits

```typescript
const defaultRateLimits = {
  maxConcurrent: 10,           // Max concurrent requests per host
  minDelayMs: 100,             // Min delay between requests to same host
  maxRequestsPerMinute: 120    // Rate limit ceiling
};
```

### 7.2 Backoff on 429

```typescript
async function handleRateLimit(response: Response): Promise<number> {
  const retryAfter = response.headers.get('Retry-After');
  if (retryAfter) {
    return parseInt(retryAfter, 10) * 1000;
  }
  return 60000;  // Default 1 minute backoff
}
```

---

## 8. Security

### 8.1 URL Validation

Before fetching any URI, validate it:

```typescript
function validateUri(uri: string, options?: SecurityOptions): void {
  const parsed = new URL(uri);

  // Block private IP ranges (unless explicitly allowed)
  if (!options?.allowPrivate) {
    if (isPrivateIP(parsed.hostname)) {
      throw new SecurityError('Private IP addresses not allowed');
    }
  }

  // Block localhost (unless explicitly allowed)
  if (!options?.allowLocalhost) {
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      throw new SecurityError('Localhost not allowed');
    }
  }

  // Warn on HTTP (non-TLS)
  if (parsed.protocol === 'http:' && !options?.allowInsecure) {
    console.warn(`Warning: Insecure HTTP connection to ${parsed.hostname}`);
  }
}
```

### 8.2 Content Handling

- Never execute code from burrow content
- Validate `mediaType` matches actual content when possible
- Sandbox any content rendering

### 8.3 Credential Security

- Never log credentials
- Use OS credential helpers when available
- Support environment variables for tokens

### 8.4 Logging and Redaction

Clients should implement logging with proper redaction to prevent credential leakage:

```typescript
interface LogRedactionRules {
  // Patterns to redact from logged URLs and messages
  patterns: RegExp[];
  replacement: string;
}

const defaultRedactionRules: LogRedactionRules = {
  patterns: [
    // Bearer tokens in URLs
    /([?&]token=)[^&]+/gi,
    /([?&]api_key=)[^&]+/gi,
    /([?&]access_token=)[^&]+/gi,
    // Basic auth in URLs
    /:\/\/[^:]+:[^@]+@/gi,
    // Authorization headers
    /(Authorization:\s*)(Bearer\s+)?\S+/gi,
    // Common secret patterns
    /([?&]secret=)[^&]+/gi,
    /([?&]password=)[^&]+/gi,
  ],
  replacement: '[REDACTED]'
};

function redactSensitive(message: string, rules: LogRedactionRules): string {
  let result = message;
  for (const pattern of rules.patterns) {
    result = result.replace(pattern, '$1[REDACTED]');
  }
  return result;
}
```

**Logging Guidelines:**

1. **Always redact credentials** before logging URLs or error messages
2. **Never log response bodies** that might contain secrets
3. **Log at appropriate levels:**
   - ERROR: Failed operations, security violations
   - WARN: Insecure connections, rate limiting
   - INFO: Discovery results, traversal progress
   - DEBUG: Individual fetch operations, cache hits/misses
4. **Include correlation IDs** for tracing requests across operations

### 8.5 TLS and Certificate Handling

```typescript
interface TlsOptions {
  // Require valid TLS certificates (default: true)
  rejectUnauthorized: boolean;
  // Allow self-signed certificates (requires explicit opt-in)
  allowSelfSigned: boolean;
  // Minimum TLS version (default: TLSv1.2)
  minVersion: 'TLSv1.2' | 'TLSv1.3';
}

const defaultTlsOptions: TlsOptions = {
  rejectUnauthorized: true,
  allowSelfSigned: false,
  minVersion: 'TLSv1.2'
};
```

**TLS Guidelines:**

1. **Require valid certificates by default** - Never skip validation silently
2. **Explicit opt-in for insecure** - Require `insecure: true` flag, log a warning
3. **Warn on HTTP** - Log when falling back to plaintext HTTP
4. **Document exceptions** - If insecure mode is used, explain why in configuration

### 8.6 SSRF Prevention

Prevent Server-Side Request Forgery attacks:

```typescript
function isBlockedHost(hostname: string): boolean {
  // Block metadata endpoints
  if (hostname === '169.254.169.254') return true;  // AWS/GCP metadata
  if (hostname === 'metadata.google.internal') return true;

  // Block private ranges
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^0\./,
    /^localhost$/i,
  ];

  return privateRanges.some(range => range.test(hostname));
}
```

### 8.7 Resource Limits

Protect against resource exhaustion:

```typescript
const securityLimits = {
  maxManifestSize: 10 * 1024 * 1024,  // 10 MB
  maxEntryCount: 10000,
  maxTraversalDepth: 100,
  maxTotalEntries: 100000,
  maxRequestTimeout: 30000,  // 30 seconds
  maxRedirects: 5,
};
```

---

## 9. CLI Interface

### 9.1 Commands

```bash
# Discover burrows at a location
rabit discover <uri>

# List entries in a burrow
rabit list <uri> [--depth N] [--kind file|dir|burrow|map|link]

# Fetch a specific entry
rabit fetch <uri> <entry-id> [--output FILE]

# Traverse and index
rabit traverse <uri> [--strategy bfs|dfs|priority] [--max-depth N]

# Validate a manifest
rabit validate <file>
```

### 9.2 Output Formats

```bash
# JSON output (default for piping)
rabit list <uri> --format json

# Table output (default for terminal)
rabit list <uri> --format table

# Tree output
rabit list <uri> --format tree
```

---

## 10. TypeScript API

### 10.1 Core Types

```typescript
interface RabitClient {
  discover(uri: string, options?: DiscoverOptions): Promise<DiscoveryResult>;
  fetchBurrow(uri: string): Promise<Burrow>;
  fetchBurrowFile(uri: string): Promise<Burrow>;  // New in v0.4.0: Direct burrow file fetch
  fetchWarren(uri: string): Promise<Warren>;
  fetchEntry(burrow: Burrow, entryId: string): Promise<Buffer>;
  traverse(burrow: Burrow, options?: TraversalOptions): AsyncGenerator<TraversalEvent>;
}

interface DiscoverOptions {
  maxParentWalk?: number;
  timeout?: number;
}

interface DiscoveryResult {
  warren: Warren | null;
  burrow: Burrow | null;
  baseUri: string;
  depth: number;
}
```

**v0.4.0 API Changes:**

- Added `fetchBurrowFile()` method for direct burrow JSON file fetching (used with `kind: "map"`)
- `fetchBurrow()` continues to use discovery conventions for directory-based burrows

### 10.2 Plugin Interface

```typescript
interface TransportPlugin {
  name: string;
  schemes: string[];

  fetch(uri: string, options?: FetchOptions): Promise<Response>;
  exists(uri: string): Promise<boolean>;
  list?(uri: string): Promise<string[]>;  // Optional directory listing
}

// Register a plugin
client.registerTransport(gitTransportPlugin);
```

---

## 11. Testing

### 11.1 Test Fixtures

The client should include test fixtures for:

- Valid/invalid manifests
- Various transport types
- Error conditions
- Edge cases (cycles, deep nesting, large manifests)

### 11.2 Mock Transports

For testing, provide mock transport implementations:

```typescript
const mockTransport: TransportPlugin = {
  name: 'mock',
  schemes: ['mock://'],
  async fetch(uri) {
    return mockResponses.get(uri) ?? new Response(null, { status: 404 });
  }
};
```

---

## Appendix A: Transport-Specific Notes

### A.1 Git Transport

When using Git transport:

- Clone to a temporary directory or use sparse checkout
- Support ref specification (branch, tag, commit)
- Handle authentication via Git credential helpers
- Cache cloned repositories for efficiency

```typescript
interface GitOptions {
  ref?: string;           // Branch, tag, or commit SHA
  sparse?: boolean;       // Use sparse checkout
  depth?: number;         // Shallow clone depth
}
```

### A.2 SSH/SFTP Transport

When using SSH transport:

- Use OS SSH agent for authentication
- Support key file configuration
- Handle known_hosts verification

### A.3 HTTP(S) Transport

When using HTTP transport:

- Follow redirects (up to a limit)
- Handle compression (gzip, br)
- Support proxy configuration
- Respect Cache-Control headers

### A.4 Insecure Connections

For development/homelab environments:

```typescript
interface InsecureOptions {
  rejectUnauthorized?: boolean;  // Skip TLS cert validation
  allowHttp?: boolean;           // Allow plain HTTP
}
```

Always warn users when insecure options are enabled.

---

## Appendix B: Performance Recommendations

1. **Parallel Fetching:** Fetch multiple entries concurrently (respecting rate limits)
2. **Lazy Loading:** Don't fetch entry content until requested
3. **Incremental Caching:** Cache individual entries, not entire burrows
4. **SHA256 Validation:** Skip re-fetch if cached content hash matches
5. **Connection Pooling:** Reuse connections for same-host requests
6. **Map File Optimization:** Cache map files separately from burrow directories (v0.4.0)
7. **Incremental Navigation:** Load burrows and maps on-demand, not recursively upfront (v0.4.0)

---

## Appendix C: Migration from v0.3.0 to v0.4.0

### C.1 Breaking Changes

**None.** Version 0.4.0 is fully backward compatible with v0.3.0 clients.

### C.2 New Features to Implement

#### 1. Map Entry Kind Support

Add handling for the new `map` entry kind in your traversal logic:

```typescript
// Before (v0.3.0)
if (entry.kind === 'burrow' || entry.kind === 'dir') {
  const childBurrow = await fetchBurrow(entry.uri);
  // ...
}

// After (v0.4.0)
if (entry.kind === 'burrow' || entry.kind === 'dir') {
  const childBurrow = await fetchBurrow(entry.uri);
  // ...
} else if (entry.kind === 'map') {
  const mapBurrow = await fetchBurrowFile(entry.uri);  // Direct file fetch
  // ...
}
```

#### 2. Add fetchBurrowFile() Method

Implement a new method for fetching burrow JSON files directly:

```typescript
async fetchBurrowFile(uri: string): Promise<Burrow> {
  // Fetch the JSON file directly (no discovery conventions)
  const response = await this.transport.fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to fetch burrow file: ${response.statusText}`);
  }
  const content = await response.text();
  return parseBurrow(content);
}
```

#### 3. Update CLI --kind Filter

Add `map` to the allowed values for the `--kind` filter:

```bash
# Before (v0.3.0)
rabit list <uri> --kind file|dir|burrow|link

# After (v0.4.0)
rabit list <uri> --kind file|dir|burrow|map|link
```

#### 4. Documentation Updates

Update client documentation to explain:
- When to use `burrow` vs `map` entry kinds
- Benefits of nested burrows and map files for large collections
- Best practices for incremental navigation

### C.3 Recommended Enhancements

While not required for v0.4.0 compatibility, consider these improvements:

1. **Burrow Size Warnings:** Warn users when creating burrows with >20 entries without nested burrows
2. **Map File Suggestions:** Suggest splitting large burrows into map files during validation
3. **Navigation Breadcrumbs:** Track burrow/map navigation paths for better UX
4. **Entry Kind Statistics:** Report distribution of entry kinds in traversal results

### C.4 Testing Checklist

Ensure your v0.4.0 client implementation passes these tests:

- [ ] Can discover and parse v0.4.0 burrow files with `specVersion: "fwdslsh.dev/rabit/schemas/0.4.0/burrow"`
- [ ] Handles `kind: "map"` entries and fetches burrow files directly
- [ ] Traverses nested burrows correctly (burrow → burrow → burrow)
- [ ] Traverses map chains correctly (burrow → map → entries)
- [ ] Mixed navigation works (burrow → map → burrow → file)
- [ ] Still compatible with v0.3.0 burrow files (backward compatibility)
- [ ] CLI `--kind` filter includes `map` option
- [ ] Error handling for missing map files
- [ ] Cycle detection works across burrow and map boundaries

### C.5 Migration Timeline

**Recommended approach:**

1. **Phase 1 (Immediate):** Add basic `map` kind support and `fetchBurrowFile()` method
2. **Phase 2 (Week 1):** Update CLI and documentation
3. **Phase 3 (Week 2):** Add validation warnings for large burrows
4. **Phase 4 (Ongoing):** Monitor usage and refine based on feedback
