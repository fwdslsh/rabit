/**
 * Rabit Burrow Traversal (RBT) Types
 * Based on draft-rabit-rbt-02
 *
 * This file contains all type definitions for the RBT specification.
 */

// ============================================================================
// Root Descriptors (§5.2)
// ============================================================================

/**
 * Git root descriptor for accessing burrows via Git transport
 * @see Specification §5.2.1
 */
export interface GitRoot {
  git: {
    /** Git remote URL (HTTPS or SSH) */
    remote: string;
    /** Fully-qualified ref (refs/heads/main) or 40-char commit SHA */
    ref: string;
    /** Path within repository (default: /) */
    path?: string;
  };
}

/**
 * HTTPS root descriptor for accessing burrows via static hosting
 * @see Specification §5.2.2
 */
export interface HttpsRoot {
  https: {
    /** HTTPS URL to the burrow root (MUST end with /) */
    base: string;
  };
}

/**
 * Union type for all root descriptors
 */
export type Root = GitRoot | HttpsRoot;

// ============================================================================
// Entry Objects (§6.4)
// ============================================================================

/**
 * Pagination descriptor for collections with many children
 * @see Specification §6.7
 */
export interface PaginationDescriptor {
  /** URI to next page of entries */
  href: string;
  /** Starting index of next page */
  offset: number;
  /** Maximum entries per page */
  limit: number;
  /** Total number of children (optional) */
  total?: number;
}

/**
 * Entry in a burrow manifest
 * @see Specification §6.4
 */
export interface Entry {
  /** Stable identifier within this manifest */
  id: string;
  /** Cross-machine Resource Identifier (RID) */
  rid: string;
  /** URI-reference (relative or absolute) */
  href: string;
  /** Media type (e.g., text/markdown) */
  type: string;
  /** Array of relation types */
  rel: string[];
  /** Human-readable title (optional) */
  title?: string;
  /** Brief description (optional) */
  summary?: string;
  /** Content hash for verification (optional) */
  hash?: string;
  /** Size in bytes (optional) */
  size?: number;
  /** RFC 3339 timestamp (optional) */
  modified?: string;
  /** BCP 47 language tag (optional) */
  lang?: string;
  /** Related entry references (optional) */
  links?: string[];
  /** Pagination descriptor (optional) */
  children?: PaginationDescriptor;
}

// ============================================================================
// Relation Types (§6.5)
// ============================================================================

/**
 * Normative relation types defined by RBT
 * @see Specification §6.5
 */
export type RelationType =
  | 'item'        // Leaf resource
  | 'collection'  // Grouping of related entries
  | 'index'       // Primary entry point or TOC
  | 'about'       // Describes the burrow itself
  | 'alternate'   // Alternative representation
  | 'parent'      // Reference to parent collection
  | 'related'     // Semantically related resource
  | 'license'     // Licensing information
  | 'author';     // Author information

// ============================================================================
// Agent Instructions (§13.4)
// ============================================================================

/**
 * Permissions guidance for agent behavior
 * @see Specification §13.5
 */
export interface PermissionsGuidance {
  /** May agents summarize content? */
  summarize?: boolean;
  /** May agents quote content? */
  quote?: boolean | 'with-attribution';
  /** May agents index for search? */
  index?: boolean;
  /** May content be used for model training? */
  train?: boolean;
  /** Additional custom permissions */
  [key: string]: unknown;
}

/**
 * Agent instructions for processing burrow content
 * @see Specification §13.4
 */
export interface AgentInstructions {
  /** Brief description for LLM context (recommended: <500 chars) */
  context?: string;
  /** Suggested starting entry ID or href */
  entryPoint?: string;
  /** Freeform processing hints */
  hints?: string[];
  /** Glob patterns for entries agents may skip */
  ignore?: string[];
  /** Usage guidance (advisory, not enforced) */
  permissions?: PermissionsGuidance;
}

// ============================================================================
// Repository Metadata (§13.3)
// ============================================================================

/**
 * Standard repository files metadata
 * @see Specification §13.3
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
  /** Path to SECURITY file */
  security?: string;
}

// ============================================================================
// Authentication (§14)
// ============================================================================

/**
 * Authentication requirements metadata
 * @see Specification §14
 */
export interface AuthMetadata {
  /** Whether authentication is required */
  required?: boolean;
  /** URL to access documentation */
  documentation?: string;
}

// ============================================================================
// Cache Control (§8.5)
// ============================================================================

/**
 * Cache control directives for manifests
 * @see Specification §8.5
 */
export interface CacheDirectives {
  /** Seconds the manifest may be cached */
  maxAge?: number;
  /** Seconds stale content may be served while revalidating */
  staleWhileRevalidate?: number;
}

// ============================================================================
// Git Provenance (§12)
// ============================================================================

/**
 * Git provenance information for auditability
 * @see Specification §12
 */
export interface GitProvenance {
  /** Git remote URL */
  remote: string;
  /** Ref or commit */
  ref: string;
  /** 40-character commit SHA */
  commit?: string;
  /** Path within repository */
  path?: string;
  /** Author information */
  author?: string;
  /** RFC 3339 timestamp */
  timestamp?: string;
}

// ============================================================================
// Burrow Manifest (§6)
// ============================================================================

/**
 * Burrow manifest (.burrow.json)
 * @see Specification §6
 */
export interface BurrowManifest {
  /** Specification version (e.g., "0.2") */
  rbt: string;
  /** JSON Schema URI for validation (recommended) */
  $schema?: string;
  /** Manifest metadata */
  manifest: {
    /** Human-readable title */
    title: string;
    /** Brief description (optional) */
    description?: string;
    /** RFC 3339 timestamp of last update */
    updated: string;
    /** RID of this manifest */
    rid: string;
    /** Array of root descriptors */
    roots: Root[];
    /** Array of mirror root descriptors (optional) */
    mirrors?: Root[];
    /** Standard repository files (optional) */
    repo?: RepoMetadata;
    /** Agent instructions (optional) */
    agents?: AgentInstructions;
    /** Authentication metadata (optional) */
    auth?: AuthMetadata;
    /** Cache control directives (optional) */
    cache?: CacheDirectives;
    /** Git provenance (optional) */
    git?: GitProvenance;
  };
  /** Array of entry objects */
  entries: Entry[];
}

// ============================================================================
// Warren Registry (§10)
// ============================================================================

/**
 * Entry in a warren registry
 * @see Specification §10.5
 */
export interface WarrenEntry {
  /** Short identifier (slug) */
  name: string;
  /** Human-readable title */
  title: string;
  /** 1-3 sentence description */
  summary: string;
  /** Array of root descriptors */
  roots: Root[];
  /** RID of the burrow's manifest (optional) */
  rid?: string;
  /** Categorization tags (optional) */
  tags?: string[];
  /** Last update timestamp (optional) */
  updated?: string;
}

/**
 * Warren registry (.warren.json)
 * @see Specification §10
 */
export interface WarrenRegistry {
  /** Specification version */
  rbt: string;
  /** JSON Schema URI (recommended) */
  $schema?: string;
  /** Registry metadata */
  registry: {
    /** Human-readable title */
    title: string;
    /** Brief description (optional) */
    description?: string;
    /** RFC 3339 timestamp */
    updated: string;
    /** RID of this registry (optional) */
    rid?: string;
  };
  /** Array of burrow entries */
  entries: WarrenEntry[];
}

// ============================================================================
// Well-Known Discovery (§11)
// ============================================================================

/**
 * Well-known burrow discovery endpoint
 * @see Specification §11.1
 */
export interface WellKnownBurrow {
  /** Specification version */
  rbt: string;
  /** URL to manifest */
  manifest: string;
  /** Array of root descriptors (optional) */
  roots?: Root[];
}

/**
 * Well-known warren discovery endpoint
 * @see Specification §11.2
 */
export interface WellKnownWarren {
  /** Specification version */
  rbt: string;
  /** Registry files */
  registry: {
    /** URL to .warren.json */
    json: string;
    /** URL to .warren.md (optional) */
    md?: string;
  };
}

// ============================================================================
// Error Handling (§9)
// ============================================================================

/**
 * Error categories defined by the specification
 * @see Specification §9.1
 */
export type ErrorCategory =
  | 'manifest_invalid'      // Malformed or missing required fields
  | 'manifest_not_found'    // Manifest not found at expected location
  | 'entry_not_found'       // Entry resource not found
  | 'verification_failed'   // RID/hash mismatch
  | 'transport_error'       // Network or Git transport failure
  | 'rate_limited';         // Server returned 429

/**
 * Error details for a failed operation
 */
export interface RbtError {
  /** Error category */
  category: ErrorCategory;
  /** Human-readable error message */
  message: string;
  /** Entry ID if applicable */
  entryId?: string;
  /** URL/href that failed if applicable */
  href?: string;
  /** Retry attempts made */
  attempts?: Array<{
    root: string;
    error: string;
    status?: number;
  }>;
}

/**
 * Traversal report structure
 * @see Specification §9.3
 */
export interface TraversalReport {
  /** URL to manifest */
  manifest: string;
  /** Start timestamp (RFC 3339) */
  started: string;
  /** Completion timestamp (RFC 3339) */
  completed: string;
  /** Number of entries successfully processed */
  entriesProcessed: number;
  /** Number of entries skipped */
  entriesSkipped: number;
  /** Array of errors encountered */
  errors: RbtError[];
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for GitRoot
 */
export function isGitRoot(root: Root): root is GitRoot {
  return 'git' in root;
}

/**
 * Type guard for HttpsRoot
 */
export function isHttpsRoot(root: Root): root is HttpsRoot {
  return 'https' in root;
}

/**
 * Get base URL from a root descriptor
 * Returns null for Git roots (requires cloning)
 */
export function getBaseUrl(root: Root): string | null {
  if (isHttpsRoot(root)) {
    return root.https.base;
  }
  return null;
}

// ============================================================================
// Client Options
// ============================================================================

/**
 * Options for burrow traversal
 */
export interface TraversalOptions {
  /** Maximum traversal depth (default: 100) */
  maxDepth?: number;
  /** Maximum total entries to process (default: 1000000) */
  maxEntries?: number;
  /** Follow child manifests (default: false) */
  followChildren?: boolean;
  /** Filter function for entries */
  filter?: (entry: Entry) => boolean;
  /** Verify RIDs when fetching (default: true) */
  verifyRids?: boolean;
  /** Use mirrors on failure (default: true) */
  useMirrors?: boolean;
  /** Rate limit: max concurrent requests per host (default: 10) */
  maxConcurrent?: number;
  /** Rate limit: min delay between requests in ms (default: 100) */
  minDelay?: number;
}

/**
 * Result from fetching a single entry
 */
export interface TraversalResult {
  /** The entry object */
  entry: Entry;
  /** Fetched content (if successful) */
  content?: Uint8Array;
  /** Error (if failed) */
  error?: RbtError;
  /** Whether content was fetched from a mirror */
  fromMirror?: boolean;
}

/**
 * Result wrapper for fetch operations
 */
export interface FetchResult<T> {
  /** Whether the operation succeeded */
  ok: boolean;
  /** The fetched data (if successful) */
  data?: T;
  /** Error details (if failed) */
  error?: RbtError;
}
