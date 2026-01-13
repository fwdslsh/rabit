/**
 * Rabit Burrow & Warren Types
 * Based on Rabit Specification v0.4.0
 *
 * This file contains all type definitions for burrows and warrens.
 */

// ============================================================================
// Common Types
// ============================================================================

/**
 * Specification version string format
 * Example: "fwdslsh.dev/rabit/schemas/0.4.0/burrow"
 */
export type SpecVersion = string;

/**
 * Document kind
 */
export type DocumentKind = 'burrow' | 'warren';

/**
 * Entry kind - the type of menu item
 * @see Specification §9.2
 * - file: A single file
 * - dir: A directory without its own burrow file
 * - burrow: A directory with its own .burrow.json (points to directory)
 * - map: A reference to another burrow map file (points directly to JSON file)
 * - link: External URI
 */
export type EntryKind = 'file' | 'dir' | 'burrow' | 'map' | 'link';

/**
 * Metadata object for extensibility
 * Allows arbitrary key-value pairs for forward compatibility
 */
export type Metadata = Record<string, unknown>;

// ============================================================================
// Entry Schema (§9)
// ============================================================================

/**
 * Entry in a burrow - a menu item
 * @see Specification §9
 */
export interface Entry {
  /** Unique identifier within the burrow (required) */
  id: string;
  /** Entry type (required) */
  kind: EntryKind;
  /** URI to fetch or enter (required) */
  uri: string;
  /** Human-readable title */
  title?: string;
  /** Short description for agents */
  summary?: string;
  /** Relative path inside the burrow */
  path?: string;
  /** MIME type (e.g., text/markdown) */
  mediaType?: string;
  /** File size in bytes */
  sizeBytes?: number;
  /** RFC 3339 timestamp */
  modified?: string;
  /** Hex digest for cache validation */
  sha256?: string;
  /** Categorization tags */
  tags?: string[];
  /** Higher values = more prominent in menus */
  priority?: number;
  /** Custom metadata for this entry */
  metadata?: Metadata;
}

// ============================================================================
// Repository Metadata (§8.3)
// ============================================================================

/**
 * Standard repository files metadata
 * Allows additional properties for extensibility
 * @see Specification §8.3
 */
export interface RepoMetadata {
  /** Path to README file */
  readme?: string;
  /** Path to LICENSE file */
  license?: string;
  /** Path to CONTRIBUTING file */
  contributing?: string;
  /** Path to CHANGELOG file */
  changelog?: string;
  /** Additional custom properties */
  [key: string]: string | undefined;
}

// ============================================================================
// Agent Instructions (§8.4)
// ============================================================================

/**
 * Agent instructions for LLM-based clients
 * Allows additional properties for extensibility
 * @see Specification §8.4
 */
export interface AgentInstructions {
  /** Brief description for LLM context (recommended: <500 chars) */
  context?: string;
  /** Suggested starting entry ID */
  entryPoint?: string;
  /** Freeform processing hints */
  hints?: string[];
  /** Additional custom properties */
  [key: string]: string | string[] | undefined;
}

// ============================================================================
// Burrow Schema (§8)
// ============================================================================

/**
 * Burrow manifest (.burrow.json)
 * @see Specification §8
 */
export interface Burrow {
  /** JSON Schema URI for validation */
  $schema?: string;
  /** Specification version identifier (required) */
  specVersion: SpecVersion;
  /** Document type (required) */
  kind: 'burrow';
  /** Human-readable title */
  title?: string;
  /** Brief description of the burrow */
  description?: string;
  /** RFC 3339 timestamp of last update */
  updated?: string;
  /** Base URI for resolving relative paths */
  baseUri?: string;
  /** Standard repository file locations */
  repo?: RepoMetadata;
  /** Agent-specific guidance */
  agents?: AgentInstructions;
  /** Array of entry objects (required) */
  entries: Entry[];
  /** Custom metadata for forward compatibility and extensibility */
  metadata?: Metadata;
  /** @deprecated Use metadata instead */
  extensions?: Metadata;
}

// ============================================================================
// Warren Schema (§7)
// ============================================================================

/**
 * Reference to a burrow in a warren
 * @see Specification §7.3
 */
export interface BurrowReference {
  /** Stable identifier (required) */
  id: string;
  /** Location of the burrow root (required) */
  uri: string;
  /** Human-readable title */
  title?: string;
  /** Brief description */
  description?: string;
  /** Categorization tags */
  tags?: string[];
  /** Higher values = more prominent in menus */
  priority?: number;
  /** Custom metadata for this burrow reference */
  metadata?: Metadata;
}

/**
 * Reference to another warren (federation)
 * @see Specification §7.4
 */
export interface WarrenReference {
  /** Stable identifier (required) */
  id: string;
  /** Location of the warren (required) */
  uri: string;
  /** Human-readable title */
  title?: string;
  /** Brief description */
  description?: string;
  /** Custom metadata for this warren reference */
  metadata?: Metadata;
}

/**
 * Warren registry (.warren.json)
 * @see Specification §7
 */
export interface Warren {
  /** JSON Schema URI for validation */
  $schema?: string;
  /** Specification version identifier (required) */
  specVersion: SpecVersion;
  /** Document type (required) */
  kind: 'warren';
  /** Human-readable title */
  title?: string;
  /** Brief description of the warren */
  description?: string;
  /** RFC 3339 timestamp of last update */
  updated?: string;
  /** Base URI for resolving relative paths */
  baseUri?: string;
  /** Array of burrow references */
  burrows?: BurrowReference[];
  /** Array of warren references (federation) */
  warrens?: WarrenReference[];
  /** Custom metadata for forward compatibility and extensibility */
  metadata?: Metadata;
  /** @deprecated Use metadata instead */
  extensions?: Metadata;
}

// ============================================================================
// Discovery Types
// ============================================================================

/**
 * Result of discovering burrows/warrens at a location
 */
export interface DiscoveryResult {
  /** Discovered warren (if present) */
  warren: Warren | null;
  /** Discovered burrow (if present) */
  burrow: Burrow | null;
  /** Base URI where discovery occurred */
  baseUri: string;
  /** Depth from original URI (0 = found at original, -1 = not found) */
  depth: number;
}

// ============================================================================
// Client Types
// ============================================================================

/**
 * Supported transport protocols (client implementation detail)
 */
export type TransportType =
  | 'https'
  | 'http'
  | 'file'
  | 'git'
  | 'ssh'
  | 'ftp';

/**
 * Options for discovery
 */
export interface DiscoverOptions {
  /** Maximum parent directories to walk (default: 2) */
  maxParentWalk?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Options for fetching
 */
export interface FetchOptions {
  /** Force specific transport */
  transport?: TransportType;
  /** Skip TLS certificate validation */
  insecure?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Traversal strategy
 */
export type TraversalStrategy = 'breadth-first' | 'depth-first' | 'priority';

/**
 * Options for burrow traversal
 */
export interface TraversalOptions {
  /** Traversal strategy (default: breadth-first) */
  strategy?: TraversalStrategy;
  /** Maximum traversal depth (default: 100) */
  maxDepth?: number;
  /** Maximum total entries to process (default: 100000) */
  maxEntries?: number;
  /** Filter function for entries */
  filter?: (entry: Entry) => boolean;
}

/**
 * Event types emitted during traversal
 */
export type TraversalEventType =
  | 'entry'           // Normal entry found
  | 'cycle-detected'  // Cycle detected, skipping
  | 'depth-limit'     // Max depth reached
  | 'error';          // Error fetching entry

/**
 * Event emitted during traversal
 */
export interface TraversalEvent {
  /** Event type */
  type: TraversalEventType;
  /** The entry */
  entry: Entry;
  /** Current depth in traversal */
  depth?: number;
  /** Error message (if type is 'error') */
  error?: string;
}

/**
 * Summary of a completed traversal
 */
export interface TraversalSummary {
  /** Number of entries successfully processed */
  entriesProcessed: number;
  /** Number of entries skipped */
  entriesSkipped: number;
  /** Errors encountered */
  errors: Array<{
    entryId: string;
    uri: string;
    error: string;
  }>;
  /** Duration in milliseconds */
  duration: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error categories (client implementation detail)
 */
export type ErrorCategory =
  | 'manifest-invalid'    // JSON parse error or schema violation
  | 'manifest-not-found'  // 404 or file not found
  | 'entry-not-found'     // Entry resource missing
  | 'transport-error'     // Network or protocol error
  | 'hash-mismatch'       // SHA256 verification failed
  | 'timeout'             // Request timeout
  | 'rate-limited';       // 429 or similar

/**
 * Rabit client error
 */
export interface RabitError {
  /** Error category */
  category: ErrorCategory;
  /** Human-readable message */
  message: string;
  /** URI that failed */
  uri?: string;
  /** Entry ID if applicable */
  entryId?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for Burrow
 */
export function isBurrow(doc: Burrow | Warren): doc is Burrow {
  return doc.kind === 'burrow';
}

/**
 * Type guard for Warren
 */
export function isWarren(doc: Burrow | Warren): doc is Warren {
  return doc.kind === 'warren';
}

/**
 * Type guard for file entries
 */
export function isFileEntry(entry: Entry): boolean {
  return entry.kind === 'file';
}

/**
 * Type guard for directory entries
 */
export function isDirEntry(entry: Entry): boolean {
  return entry.kind === 'dir';
}

/**
 * Type guard for burrow entries (sub-burrows)
 */
export function isBurrowEntry(entry: Entry): boolean {
  return entry.kind === 'burrow';
}

/**
 * Type guard for map entries (direct burrow file references)
 * @see Specification §9.2 (v0.4.0)
 */
export function isMapEntry(entry: Entry): boolean {
  return entry.kind === 'map';
}

/**
 * Type guard for link entries
 */
export function isLinkEntry(entry: Entry): boolean {
  return entry.kind === 'link';
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Detect transport type from URI
 */
export function detectTransport(uri: string): TransportType {
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

/**
 * Sort entries by priority (descending)
 */
export function sortByPriority(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    const priorityA = a.priority ?? 0;
    const priorityB = b.priority ?? 0;
    return priorityB - priorityA;
  });
}

/**
 * Resolve a relative URI against a base URI
 */
export function resolveUri(base: string | undefined, relative: string): string {
  if (!base) return relative;
  if (relative.startsWith('http://') || relative.startsWith('https://') || relative.startsWith('file://')) {
    return relative;
  }
  // Simple resolution - append relative to base
  const baseWithSlash = base.endsWith('/') ? base : base + '/';
  return baseWithSlash + relative;
}

/**
 * Get the parent URI (go up one directory level)
 */
export function getParentUri(uri: string): string {
  // Remove trailing slash if present
  const trimmed = uri.endsWith('/') ? uri.slice(0, -1) : uri;
  const lastSlash = trimmed.lastIndexOf('/');
  if (lastSlash === -1) return uri;
  return trimmed.slice(0, lastSlash + 1);
}

/**
 * Validate specVersion format
 */
export function isValidSpecVersion(specVersion: string): boolean {
  return specVersion.startsWith('fwdslsh.dev/rabit/schemas/');
}

/**
 * Extract version number from specVersion
 * Example: "fwdslsh.dev/rabit/schemas/0.4.0/burrow" -> "0.4.0"
 */
export function extractVersion(specVersion: string): string | null {
  const match = specVersion.match(/fwdslsh\.dev\/rabit\/schemas\/([^/]+)\//);
  return match ? match[1] : null;
}
