/**
 * Utility functions for Rabit client
 * Based on Rabit Specification v0.3.0
 */

import type { Root, GitRoot, HttpsRoot, HttpRoot, FtpRoot, FileRoot, RbtError } from './types';
import { isGitRoot, isHttpsRoot, isHttpRoot, isFtpRoot, isFileRoot } from './types';

// ============================================================================
// RID Computation (§7)
// ============================================================================

/**
 * Compute SHA-256 hash of content
 * @see Specification §7.3
 */
export async function computeSha256(content: Uint8Array): Promise<string> {
  // Bun's crypto.subtle.digest expects BufferSource, convert properly
  const buffer = content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer as ArrayBuffer);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compute RID for file content
 * @see Specification §7.3.1
 */
export async function computeRid(content: Uint8Array): Promise<string> {
  const hash = await computeSha256(content);
  return `urn:rabit:sha256:${hash}`;
}

/**
 * Verify content against RID or hash
 * @returns true if verification passes or no verification data available
 */
export async function verifyContent(
  content: Uint8Array,
  rid?: string,
  hash?: string
): Promise<boolean> {
  // If neither RID nor hash provided, pass verification
  if (!rid && !hash) return true;

  const computedHash = await computeSha256(content);

  // Verify against hash if provided
  if (hash) {
    const hashValue = hash.startsWith('sha256:') ? hash.substring(7) : hash;
    if (computedHash !== hashValue) return false;
  }

  // Verify against RID if provided
  if (rid) {
    const ridHash = rid.replace('urn:rabit:sha256:', '');
    if (computedHash !== ridHash) return false;
  }

  return true;
}

// ============================================================================
// URL Validation (§15.2)
// ============================================================================

/**
 * Private/internal IP ranges that MUST be rejected
 */
const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

/**
 * Validate URL for security (§15.2)
 * @throws Error if URL is invalid or unsafe
 */
export function validateUrl(urlString: string, allowGit = false): URL {
  let url: URL;

  try {
    url = new URL(urlString);
  } catch {
    throw createError('transport_error', `Invalid URL: ${urlString}`);
  }

  // MUST reject non-HTTPS URLs (except git://)
  if (url.protocol !== 'https:' && !(allowGit && url.protocol === 'git:')) {
    throw createError('transport_error', `Insecure protocol: ${url.protocol}`);
  }

  // MUST reject localhost and loopback
  if (url.hostname === 'localhost' || url.hostname === '0.0.0.0') {
    throw createError('transport_error', `Localhost access forbidden: ${url.hostname}`);
  }

  // MUST reject private/internal IP ranges
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(url.hostname)) {
      throw createError('transport_error', `Private IP access forbidden: ${url.hostname}`);
    }
  }

  // SHOULD reject URLs with @ in hostname (potential SSRF)
  if (url.username || url.password) {
    throw createError('transport_error', `URL credentials not allowed: ${urlString}`);
  }

  return url;
}

// ============================================================================
// Root Resolution
// ============================================================================

/**
 * Get the base URL/path for resource access from a root
 * Returns file:// URL for file roots, HTTP/HTTPS URL for http/https roots, null for git roots
 * @see Specification §5.2
 */
export function getRootBaseUrl(root: Root): string | null {
  if (isFileRoot(root)) {
    // Return as file:// URL for consistency
    const path = root.file.path;
    if (path.startsWith('/')) {
      return `file://${path}`;
    } else if (/^[a-zA-Z]:/.test(path)) {
      return `file:///${path.replace(/\\/g, '/')}`;
    } else if (path.startsWith('\\\\')) {
      return `file:${path.replace(/\\/g, '/')}`;
    }
    return `file://${path}`;
  }
  if (isHttpsRoot(root)) {
    return root.https.base;
  }
  if (isHttpRoot(root)) {
    return root.http.base;
  }
  if (isFtpRoot(root)) {
    return root.ftp.url;
  }
  return null;
}

/**
 * Get display name for a root (for logging)
 * @see Specification §5.2
 */
export function getRootDisplayName(root: Root): string {
  if (isFileRoot(root)) {
    return `file:${root.file.path}`;
  }
  if (isGitRoot(root)) {
    return `git:${root.git.remote}@${root.git.ref}`;
  }
  if (isHttpsRoot(root)) {
    return `https:${root.https.base}`;
  }
  if (isHttpRoot(root)) {
    const protocol = root.http.base.startsWith('https') ? 'https' : 'http';
    const suffix = root.http.insecure ? ' (insecure)' : '';
    return `${protocol}:${root.http.base}${suffix}`;
  }
  if (isFtpRoot(root)) {
    const protocol = root.ftp.protocol || 'ftp';
    const suffix = root.ftp.insecure ? ' (insecure)' : '';
    return `${protocol}:${root.ftp.url}${suffix}`;
  }
  return 'unknown';
}

// ============================================================================
// Error Creation
// ============================================================================

/**
 * Create a standardized RBT error
 */
export function createError(
  category: RbtError['category'],
  message: string,
  entryId?: string,
  href?: string
): RbtError {
  return {
    category,
    message,
    entryId,
    href,
  };
}

// ============================================================================
// Resource Limits (§15.3)
// ============================================================================

export const RESOURCE_LIMITS = {
  /** Maximum manifest size in bytes (10 MB) */
  MAX_MANIFEST_SIZE: 10 * 1024 * 1024,
  /** Maximum entry count per manifest */
  MAX_ENTRY_COUNT: 10_000,
  /** Maximum traversal depth */
  MAX_TRAVERSAL_DEPTH: 100,
  /** Maximum total entries */
  MAX_TOTAL_ENTRIES: 1_000_000,
  /** Maximum request timeout in milliseconds */
  MAX_REQUEST_TIMEOUT: 30_000,
  /** Default maximum concurrent requests per host */
  DEFAULT_MAX_CONCURRENT: 10,
  /** Default minimum delay between requests in milliseconds */
  DEFAULT_MIN_DELAY: 100,
} as const;

/**
 * Validate manifest size
 * @throws Error if manifest exceeds size limit
 */
export function validateManifestSize(size: number): void {
  if (size > RESOURCE_LIMITS.MAX_MANIFEST_SIZE) {
    throw createError(
      'manifest_invalid',
      `Manifest size ${size} exceeds maximum ${RESOURCE_LIMITS.MAX_MANIFEST_SIZE}`
    );
  }
}

/**
 * Validate entry count
 * @throws Error if entry count exceeds limit
 */
export function validateEntryCount(count: number): void {
  if (count > RESOURCE_LIMITS.MAX_ENTRY_COUNT) {
    throw createError(
      'manifest_invalid',
      `Entry count ${count} exceeds maximum ${RESOURCE_LIMITS.MAX_ENTRY_COUNT}`
    );
  }
}

// ============================================================================
// Timing and Rate Limiting
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a rate limiter for HTTP requests
 */
export class RateLimiter {
  private lastRequestTime = 0;
  private activeRequests = 0;

  constructor(
    private readonly maxConcurrent: number = RESOURCE_LIMITS.DEFAULT_MAX_CONCURRENT,
    private readonly minDelay: number = RESOURCE_LIMITS.DEFAULT_MIN_DELAY
  ) {}

  /**
   * Wait until a request slot is available
   */
  async acquire(): Promise<void> {
    // Wait for concurrent request slot
    while (this.activeRequests >= this.maxConcurrent) {
      await sleep(50);
    }

    // Wait for minimum delay since last request
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minDelay) {
      await sleep(this.minDelay - elapsed);
    }

    this.activeRequests++;
    this.lastRequestTime = Date.now();
  }

  /**
   * Release a request slot
   */
  release(): void {
    this.activeRequests--;
  }
}

// ============================================================================
// Canonical JSON (§7.3.2)
// ============================================================================

/**
 * Serialize object to canonical JSON (RFC 8785: JCS)
 * This is a simplified implementation - for production use a proper JCS library
 */
export function canonicalJson(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj === 'boolean') return obj ? 'true' : 'false';
  if (typeof obj === 'number') {
    // RFC 8785 number serialization
    return String(obj);
  }
  if (typeof obj === 'string') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    const items = obj.map(item => canonicalJson(item));
    return `[${items.join(',')}]`;
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj as object).sort();
    const pairs = keys.map(key => {
      const value = (obj as Record<string, unknown>)[key];
      return `${JSON.stringify(key)}:${canonicalJson(value)}`;
    });
    return `{${pairs.join(',')}}`;
  }
  return 'null';
}
