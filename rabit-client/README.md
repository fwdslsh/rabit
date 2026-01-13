# @rabit/client

> **Reference implementation of Rabit Burrow Traversal (RBT) - Full Client Conformance**

A production-ready TypeScript/Bun client for traversing and consuming Rabit burrows and warrens. Implements the complete RBT specification v0.2 with full Git support, RID verification, mirror fallback, caching, and comprehensive error handling.

[![License](https://img.shields.io/badge/License-CC--BY--4.0-blue.svg)](LICENSE)
[![RBT Spec](https://img.shields.io/badge/RBT-v0.2-green.svg)](../rabit-spec-draft-2026-01-12.md)

## Features

✅ **Full RBT Client Conformance** (Specification §3.2.2)
- ✅ Git transport support (HTTPS and SSH remotes)
- ✅ HTTPS static hosting support
- ✅ File path support (local, SMB/CIFS, NFS via native OS access)
- ✅ RID verification for content integrity
- ✅ Automatic mirror fallback on failure
- ✅ Cycle detection during traversal
- ✅ Comprehensive error handling and recovery
- ✅ Cache control directives
- ✅ Resource limits and security validations
- ✅ Rate limiting and exponential backoff
- ✅ Well-known endpoint discovery
- ✅ `.burrow.md` and `.warren.md` companion file support

## Installation

### Using Bun (Recommended)

```bash
bun add @rabit/client
```

### From Source

```bash
git clone https://github.com/itlackey/rabit.git
cd rabit/rabit-client
bun install
bun run build
```

## Quick Start

### Library Usage

```typescript
import { createClient, fetchBurrow, fetchEntry } from '@rabit/client';

// Use default client instance
const result = await fetchBurrow('https://example.org/burrow/');
if (result.ok) {
  const burrow = result.data;
  console.log(burrow.manifest.title);

  // Fetch an entry
  const entry = burrow.entries[0];
  const content = await fetchEntry(burrow, entry);
  if (content.ok) {
    console.log(new TextDecoder().decode(content.data));
  }
}

// Or create a custom client
const client = createClient({
  maxConcurrent: 10,
  minDelay: 100,
  enableCache: true,
});

const burrow = await client.fetchBurrow('https://example.org/burrow/');
```

### CLI Usage

```bash
# Install globally
bun install -g @rabit/client

# Or run directly
bunx @rabit/client <command> [options]

# List burrows in a warren
rabit warren https://example.org/

# Show burrow information
rabit burrow https://example.org/burrow/

# List all entries
rabit entries https://example.org/burrow/

# Fetch specific entry
rabit fetch https://example.org/burrow/ readme

# Traverse entire burrow
rabit traverse https://example.org/burrow/

# Search entries
rabit search https://example.org/burrow/ kubernetes

# Show agent instructions
rabit agent-info https://example.org/burrow/

# Discover via well-known endpoints
rabit discover-burrow https://example.org
rabit discover-warren https://example.org

# Generate traversal report
rabit report https://example.org/burrow/

# Show statistics
rabit stats https://example.org/burrow/
```

## API Reference

### Core Functions

#### `fetchBurrow(url: string | Root): Promise<FetchResult<BurrowManifest>>`

Fetch a burrow manifest from a URL or Root descriptor. Supports Git and HTTPS roots with automatic fallback.

```typescript
// From HTTPS URL
const result = await fetchBurrow('https://example.org/burrow/');

// From local file path
const result = await fetchBurrow('/home/user/documentation/');

// From network share (SMB/NFS - uses native OS access)
const result = await fetchBurrow('/mnt/shared/docs/');

// From Git root
const result = await fetchBurrow({
  git: {
    remote: 'https://github.com/org/repo.git',
    ref: 'refs/heads/main',
    path: '/',
  },
});

// From HTTPS root descriptor
const result = await fetchBurrow({
  https: {
    base: 'https://example.org/burrow/',
  },
});

// From file root descriptor (local or network path)
const result = await fetchBurrow({
  file: {
    path: '/mnt/nfs/documentation/',  // NFS mount
  },
});
```

#### `fetchWarren(url: string): Promise<FetchResult<WarrenRegistry>>`

Fetch a warren registry listing multiple burrows.

```typescript
const result = await fetchWarren('https://example.org/');
if (result.ok) {
  for (const burrow of result.data.entries) {
    console.log(`${burrow.name}: ${burrow.title}`);
  }
}
```

#### `fetchEntry(burrow: BurrowManifest, entry: Entry, options?): Promise<FetchResult<Uint8Array>>`

Fetch an entry's content with optional RID verification and mirror fallback.

```typescript
const content = await fetchEntry(burrow, entry, {
  verifyRid: true,    // Verify content integrity (default: true)
  useMirrors: true,   // Use mirrors on failure (default: true)
});

if (content.ok) {
  const text = new TextDecoder().decode(content.data);
  console.log(text);
}
```

#### `traverseBurrow(burrow: BurrowManifest, options?): AsyncGenerator<TraversalResult>`

Traverse a burrow using breadth-first search with configurable options.

```typescript
for await (const result of traverseBurrow(burrow, {
  maxDepth: 100,
  maxEntries: 1000,
  followChildren: true,
  verifyRids: true,
  useMirrors: true,
  filter: (entry) => entry.type === 'text/markdown',
})) {
  if (result.error) {
    console.error(`Failed: ${result.entry.id}`, result.error);
  } else {
    console.log(`Success: ${result.entry.id}`);
  }
}
```

#### `discoverBurrow(origin: string): Promise<FetchResult<WellKnownBurrow>>`

Discover a burrow via `/.well-known/rabit-burrow` endpoint.

```typescript
const discovery = await discoverBurrow('https://example.org');
if (discovery.ok) {
  console.log('Manifest:', discovery.data.manifest);
}
```

#### `discoverWarren(origin: string): Promise<FetchResult<WellKnownWarren>>`

Discover a warren via `/.well-known/rabit-warren` endpoint.

```typescript
const discovery = await discoverWarren('https://example.org');
if (discovery.ok) {
  console.log('Registry:', discovery.data.registry.json);
}
```

### Helper Functions

#### Entry Discovery

```typescript
import {
  findEntry,
  findEntriesByRel,
  findEntriesByType,
  searchEntries,
} from '@rabit/client';

// Find by ID
const entry = findEntry(burrow, 'readme');

// Find by relation type
const indices = findEntriesByRel(burrow, 'index');

// Find by media type
const markdownFiles = findEntriesByType(burrow, 'text/markdown');

// Search by text
const results = searchEntries(burrow, 'kubernetes');
```

#### Agent Helpers

```typescript
import {
  getEntryPoint,
  getAgentHints,
  getAgentContext,
  checkPermission,
  getIgnorePatterns,
} from '@rabit/client';

// Get recommended entry point
const start = getEntryPoint(burrow);

// Get agent instructions
const context = getAgentContext(burrow);
const hints = getAgentHints(burrow);
const ignore = getIgnorePatterns(burrow);

// Check permissions
const canIndex = checkPermission(burrow, 'index');
const canTrain = checkPermission(burrow, 'train');
```

#### Warren Helpers

```typescript
import {
  listBurrows,
  findBurrow,
  findBurrowsByTag,
  getBurrowUrl,
  getAllTags,
} from '@rabit/client';

// List all burrows
const burrows = listBurrows(warren);

// Find specific burrow
const burrow = findBurrow(warren, 'my-docs');

// Find by tag
const apiBurrows = findBurrowsByTag(warren, 'api');

// Get burrow URL
const url = getBurrowUrl(burrow);

// Get all tags
const tags = getAllTags(warren);
```

#### Burrow Metadata

```typescript
import {
  getBurrowBaseUrl,
  getRepoFiles,
  requiresAuth,
  getCacheDirectives,
  getBurrowStats,
} from '@rabit/client';

// Get base URL
const baseUrl = getBurrowBaseUrl(burrow);

// Get repository files
const repo = getRepoFiles(burrow);
console.log('README:', repo.readme);
console.log('LICENSE:', repo.license);

// Check auth requirements
if (requiresAuth(burrow)) {
  console.log('Authentication required');
}

// Get cache directives
const cache = getCacheDirectives(burrow);

// Get statistics
const stats = getBurrowStats(burrow);
console.log('Total entries:', stats.totalEntries);
console.log('By relation:', stats.byRelation);
console.log('By media type:', stats.byMediaType);
```

### RabitClient Class

For more control, use the `RabitClient` class:

```typescript
import { RabitClient } from '@rabit/client';

const client = new RabitClient({
  maxConcurrent: 10,      // Max concurrent requests per host
  minDelay: 100,          // Min delay between requests (ms)
  enableCache: true,      // Enable manifest caching
});

// All methods available
const warren = await client.fetchWarren(url);
const burrow = await client.fetchBurrow(url);
const entry = await client.fetchEntry(burrow, entry);
const discovery = await client.discoverBurrow(origin);
const report = await client.generateTraversalReport(burrow);

// Control cache
client.clearCache();
```

## Advanced Usage

### File Transport (Local and Network Paths)

The client supports local file paths and network file shares using the operating system's native file access. This means SMB/CIFS and NFS shares work automatically when mounted:

```typescript
// Local file system
const result = await fetchBurrow('/home/user/docs/');

// NFS mount
const result = await fetchBurrow('/mnt/nfs/shared-docs/');

// Windows UNC path (when running on Windows)
const result = await fetchBurrow('\\\\fileserver\\docs\\');

// Using file root descriptor
const result = await fetchBurrow({
  file: {
    path: '/mnt/shared/documentation/',
  },
});
```

**Important:** The client does not implement SMB or NFS protocols directly. It relies on the operating system having access to these paths (via mount points, mapped drives, or direct UNC path access on Windows). This ensures:
- Proper authentication through OS-level mechanisms (Kerberos, NTLM)
- Consistent behavior with other applications
- Access control managed at the OS/network level

### Git Transport

The client automatically uses Git transport when available:

```typescript
const result = await fetchBurrow({
  git: {
    remote: 'git@github.com:org/repo.git',  // SSH format
    ref: 'refs/heads/main',
    path: '/docs',
  },
});
```

### RID Verification

Content integrity is verified automatically when RIDs are available:

```typescript
const result = await fetchEntry(burrow, entry, {
  verifyRid: true,  // Verify against entry.rid and entry.hash
});

if (!result.ok && result.error?.category === 'verification_failed') {
  console.error('Content integrity check failed!');
}
```

### Mirror Fallback

Mirrors are tried automatically when primary roots fail:

```typescript
const result = await fetchEntry(burrow, entry, {
  useMirrors: true,  // Try mirrors on failure (default: true)
});

// Check if content came from a mirror
if (result.ok && result.fromMirror) {
  console.log('Fetched from mirror');
}
```

### Error Handling

Comprehensive error handling with structured error types:

```typescript
const result = await fetchBurrow(url);

if (!result.ok) {
  const error = result.error!;

  switch (error.category) {
    case 'manifest_invalid':
      console.error('Invalid manifest format');
      break;
    case 'manifest_not_found':
      console.error('Manifest not found');
      break;
    case 'transport_error':
      console.error('Network error:', error.message);
      break;
    case 'verification_failed':
      console.error('Content verification failed');
      break;
    case 'rate_limited':
      console.error('Rate limited, retry later');
      break;
  }

  // Check retry attempts
  if (error.attempts) {
    for (const attempt of error.attempts) {
      console.log(`Tried ${attempt.root}: ${attempt.error}`);
    }
  }
}
```

### Traversal Reports

Generate detailed reports of traversal operations:

```typescript
const report = await generateTraversalReport(burrow, {
  maxDepth: 100,
  maxEntries: 1000,
  followChildren: true,
});

console.log('Duration:', report.completed - report.started);
console.log('Processed:', report.entriesProcessed);
console.log('Skipped:', report.entriesSkipped);

for (const error of report.errors) {
  console.error(`${error.category}: ${error.message}`);
}
```

## Security

The client implements security best practices per RBT Specification §15:

- **URL Validation**: Rejects private IPs, localhost, and non-HTTPS URLs
- **Resource Limits**: Enforces max manifest size, entry count, and traversal depth
- **Content Verification**: Validates content against RIDs when available
- **Rate Limiting**: Prevents resource exhaustion
- **Timeout Handling**: 30-second max request timeout

```typescript
import { RESOURCE_LIMITS } from '@rabit/client';

console.log('Max manifest size:', RESOURCE_LIMITS.MAX_MANIFEST_SIZE);
console.log('Max entry count:', RESOURCE_LIMITS.MAX_ENTRY_COUNT);
console.log('Max traversal depth:', RESOURCE_LIMITS.MAX_TRAVERSAL_DEPTH);
console.log('Max request timeout:', RESOURCE_LIMITS.MAX_REQUEST_TIMEOUT);
```

## Testing

```bash
# Run tests
bun test

# Watch mode
bun test --watch

# Type checking
bun run typecheck
```

## Building

```bash
# Build for distribution
bun run build

# Clean build artifacts
bun run clean
```

## Contributing

Contributions are welcome! Please see the main [Rabit repository](https://github.com/itlackey/rabit) for contribution guidelines.

## License

This project is licensed under [CC-BY-4.0](LICENSE).

## Links

- **Specification**: [rabit-spec-draft-2026-01-12.md](../rabit-spec-draft-2026-01-12.md)
- **Repository**: https://github.com/itlackey/rabit
- **Issues**: https://github.com/itlackey/rabit/issues

## Specification Compliance

This implementation conforms to:
- ✅ RBT Client (Full) - Specification §3.2.2
- ✅ Git Transport - Specification §5.1
- ✅ File Transport (local/SMB/NFS) - Specification §5.2.3
- ✅ RID Verification - Specification §7.3, §7.4
- ✅ Traversal Algorithm - Specification §8
- ✅ Error Handling - Specification §9
- ✅ Well-Known Discovery - Specification §11
- ✅ Security Considerations - Specification §15
- ✅ Human-readable companions (.burrow.md, .warren.md) - Specification §4.1.1
