/**
 * Rabit Client Library - Core Implementation
 * Based on Rabit Specification v0.4.0
 */

import type {
  Burrow,
  Warren,
  Entry,
  BurrowReference,
  DiscoveryResult,
  DiscoverOptions,
  FetchOptions,
  TraversalOptions,
  TraversalEvent,
  TraversalSummary,
  RabitError,
  ErrorCategory,
  TransportType,
} from './types';
import {
  detectTransport,
  resolveUri,
  getParentUri,
  sortByPriority,
  isValidSpecVersion,
} from './types';
import { readFile } from 'fs/promises';
import { join, resolve, normalize } from 'path';
import * as crypto from 'crypto';

// ============================================================================
// Constants
// ============================================================================

export const RESOURCE_LIMITS = {
  MAX_MANIFEST_SIZE: 10 * 1024 * 1024, // 10 MB
  MAX_ENTRY_COUNT: 10_000,
  MAX_TRAVERSAL_DEPTH: 100,
  MAX_TOTAL_ENTRIES: 1_000_000,
  MAX_REQUEST_TIMEOUT: 30_000, // 30 seconds
  DEFAULT_MAX_CONCURRENT: 10,
  DEFAULT_MIN_DELAY: 100,
};

// ============================================================================
// Utility Functions
// ============================================================================

function createError(
  category: ErrorCategory,
  message: string,
  entryId?: string,
  uri?: string
): RabitError {
  return { category, message, entryId, uri };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verify content against sha256 hash
 */
async function verifySha256(content: Uint8Array, expectedHash?: string): Promise<boolean> {
  if (!expectedHash) return true;

  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return hash === expectedHash;
}

// ============================================================================
// Rate Limiter
// ============================================================================

class RateLimiter {
  private activeRequests = 0;
  private lastRequestTime = 0;

  constructor(
    private maxConcurrent: number,
    private minDelay: number
  ) {}

  async acquire(): Promise<void> {
    while (this.activeRequests >= this.maxConcurrent) {
      await sleep(50);
    }

    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.minDelay) {
      await sleep(this.minDelay - timeSinceLastRequest);
    }

    this.activeRequests++;
    this.lastRequestTime = Date.now();
  }

  release(): void {
    this.activeRequests--;
  }
}

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  maxAge: number;
}

class ManifestCache {
  private cache = new Map<string, CacheEntry<Burrow | Warren>>();
  private defaultMaxAge = 3600 * 1000; // 1 hour

  set(url: string, data: Burrow | Warren, maxAge?: number): void {
    this.cache.set(url, {
      data,
      timestamp: Date.now(),
      maxAge: (maxAge ?? 3600) * 1000,
    });
  }

  get(url: string): { data: Burrow | Warren; stale: boolean } | null {
    const entry = this.cache.get(url);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const stale = age > entry.maxAge;
    const expired = age > entry.maxAge * 2;

    if (expired) {
      this.cache.delete(url);
      return null;
    }

    return { data: entry.data, stale };
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// RabitClient Class
// ============================================================================

export interface RabitClientOptions {
  maxConcurrent?: number;
  minDelay?: number;
  enableCache?: boolean;
  timeout?: number;
}

/**
 * Rabit Client for discovering and traversing burrows
 */
export class RabitClient {
  private cache = new ManifestCache();
  private rateLimiter: RateLimiter;
  private timeout: number;

  constructor(private readonly options: RabitClientOptions = {}) {
    this.rateLimiter = new RateLimiter(
      options.maxConcurrent ?? RESOURCE_LIMITS.DEFAULT_MAX_CONCURRENT,
      options.minDelay ?? RESOURCE_LIMITS.DEFAULT_MIN_DELAY
    );
    this.timeout = options.timeout ?? RESOURCE_LIMITS.MAX_REQUEST_TIMEOUT;
  }

  // ==========================================================================
  // Discovery (§5)
  // ==========================================================================

  /**
   * Discover burrows and warrens at a location
   * @see Specification §5
   */
  async discover(uri: string, options: DiscoverOptions = {}): Promise<DiscoveryResult> {
    const maxParentWalk = options.maxParentWalk ?? 2;
    let currentUri = this.normalizeUri(uri);

    for (let depth = 0; depth <= maxParentWalk; depth++) {
      const warren = await this.tryFetchWarren(currentUri);
      const burrow = await this.tryFetchBurrow(currentUri);

      if (warren || burrow) {
        return {
          warren,
          burrow,
          baseUri: currentUri,
          depth,
        };
      }

      currentUri = getParentUri(currentUri);
    }

    return {
      warren: null,
      burrow: null,
      baseUri: uri,
      depth: -1,
    };
  }

  /**
   * Try to fetch a warren, returning null on failure
   */
  private async tryFetchWarren(baseUri: string): Promise<Warren | null> {
    const result = await this.fetchWarren(baseUri);
    return result.ok ? result.data! : null;
  }

  /**
   * Try to fetch a burrow, returning null on failure
   */
  private async tryFetchBurrow(baseUri: string): Promise<Burrow | null> {
    const result = await this.fetchBurrow(baseUri);
    return result.ok ? result.data! : null;
  }

  // ==========================================================================
  // Warren Fetching
  // ==========================================================================

  /**
   * Fetch warren from URL or path
   */
  async fetchWarren(uri: string): Promise<{ ok: boolean; data?: Warren; error?: RabitError }> {
    const warrenUri = uri.endsWith('.warren.json')
      ? uri
      : `${uri.replace(/\/$/, '')}/.warren.json`;

    // Check cache
    if (this.options.enableCache !== false) {
      const cached = this.cache.get(warrenUri);
      if (cached && !cached.stale && cached.data.kind === 'warren') {
        return { ok: true, data: cached.data as Warren };
      }
    }

    try {
      const transport = detectTransport(warrenUri);

      let content: string;
      if (transport === 'file') {
        content = await this.readLocalFile(warrenUri);
      } else {
        content = await this.fetchRemoteJson(warrenUri);
      }

      const data = JSON.parse(content) as Warren;

      // Validate required fields
      if (!data.specVersion || data.kind !== 'warren' || (!data.burrows && !data.warrens)) {
        return {
          ok: false,
          error: createError(
            'manifest-invalid',
            'Invalid warren format: missing required fields (specVersion, kind, burrows/warrens)'
          ),
        };
      }

      // Cache the result
      if (this.options.enableCache !== false) {
        this.cache.set(warrenUri, data);
      }

      return { ok: true, data };
    } catch (error) {
      if ((error as RabitError).category) {
        return { ok: false, error: error as RabitError };
      }
      return {
        ok: false,
        error: createError('transport-error', `Failed to fetch warren: ${error}`),
      };
    }
  }

  // ==========================================================================
  // Burrow Fetching
  // ==========================================================================

  /**
   * Fetch burrow from URL or path (uses discovery conventions)
   * For directory-based burrows - tries .burrow.json, burrow.json, .well-known/burrow.json
   * @see Specification §5
   */
  async fetchBurrow(uri: string): Promise<{ ok: boolean; data?: Burrow; error?: RabitError }> {
    const burrowUri = uri.endsWith('.burrow.json')
      ? uri
      : `${uri.replace(/\/$/, '')}/.burrow.json`;

    // Check cache
    if (this.options.enableCache !== false) {
      const cached = this.cache.get(burrowUri);
      if (cached && !cached.stale && cached.data.kind === 'burrow') {
        return { ok: true, data: cached.data as Burrow };
      }
    }

    try {
      const transport = detectTransport(burrowUri);

      let content: string;
      if (transport === 'file') {
        content = await this.readLocalFile(burrowUri);
      } else {
        content = await this.fetchRemoteJson(burrowUri);
      }

      const data = JSON.parse(content) as Burrow;

      // Validate required fields
      if (!data.specVersion || data.kind !== 'burrow' || !data.entries) {
        return {
          ok: false,
          error: createError(
            'manifest-invalid',
            'Invalid burrow format: missing required fields (specVersion, kind, entries)'
          ),
        };
      }

      // Validate entry count
      if (data.entries.length > RESOURCE_LIMITS.MAX_ENTRY_COUNT) {
        return {
          ok: false,
          error: createError(
            'manifest-invalid',
            `Entry count ${data.entries.length} exceeds limit ${RESOURCE_LIMITS.MAX_ENTRY_COUNT}`
          ),
        };
      }

      // Cache the result
      if (this.options.enableCache !== false) {
        this.cache.set(burrowUri, data);
      }

      return { ok: true, data };
    } catch (error) {
      if ((error as RabitError).category) {
        return { ok: false, error: error as RabitError };
      }
      return {
        ok: false,
        error: createError('transport-error', `Failed to fetch burrow: ${error}`),
      };
    }
  }

  /**
   * Fetch burrow file directly (no discovery conventions)
   * For map entries - fetches the burrow JSON file directly from the specified URI
   * @see Specification §9.2 (v0.4.0)
   */
  async fetchBurrowFile(uri: string): Promise<{ ok: boolean; data?: Burrow; error?: RabitError }> {
    // Check cache
    if (this.options.enableCache !== false) {
      const cached = this.cache.get(uri);
      if (cached && !cached.stale && cached.data.kind === 'burrow') {
        return { ok: true, data: cached.data as Burrow };
      }
    }

    try {
      const transport = detectTransport(uri);

      let content: string;
      if (transport === 'file') {
        content = await this.readLocalFile(uri);
      } else {
        content = await this.fetchRemoteJson(uri);
      }

      const data = JSON.parse(content) as Burrow;

      // Validate required fields
      if (!data.specVersion || data.kind !== 'burrow' || !data.entries) {
        return {
          ok: false,
          error: createError(
            'manifest-invalid',
            'Invalid burrow format: missing required fields (specVersion, kind, entries)'
          ),
        };
      }

      // Validate entry count
      if (data.entries.length > RESOURCE_LIMITS.MAX_ENTRY_COUNT) {
        return {
          ok: false,
          error: createError(
            'manifest-invalid',
            `Entry count ${data.entries.length} exceeds limit ${RESOURCE_LIMITS.MAX_ENTRY_COUNT}`
          ),
        };
      }

      // Cache the result
      if (this.options.enableCache !== false) {
        this.cache.set(uri, data);
      }

      return { ok: true, data };
    } catch (error) {
      if ((error as RabitError).category) {
        return { ok: false, error: error as RabitError };
      }
      return {
        ok: false,
        error: createError('transport-error', `Failed to fetch burrow file: ${error}`),
      };
    }
  }

  // ==========================================================================
  // Entry Fetching
  // ==========================================================================

  /**
   * Fetch entry content
   */
  async fetchEntry(
    burrow: Burrow,
    entry: Entry,
    options: { verifySha256?: boolean } = {}
  ): Promise<{ ok: boolean; data?: Uint8Array; error?: RabitError }> {
    const { verifySha256: verify = true } = options;

    try {
      const entryUri = resolveUri(burrow.baseUri, entry.uri);
      const transport = detectTransport(entryUri);

      let content: Uint8Array;
      if (transport === 'file') {
        content = await this.readLocalFileBytes(entryUri);
      } else {
        content = await this.fetchRemoteBytes(entryUri);
      }

      // Verify sha256 if requested and available
      if (verify && entry.sha256) {
        const valid = await verifySha256(content, entry.sha256);
        if (!valid) {
          return {
            ok: false,
            error: createError(
              'hash-mismatch',
              'Content sha256 verification failed',
              entry.id,
              entry.uri
            ),
          };
        }
      }

      return { ok: true, data: content };
    } catch (error) {
      if ((error as RabitError).category) {
        return { ok: false, error: error as RabitError };
      }
      return {
        ok: false,
        error: createError(
          'transport-error',
          `Failed to fetch entry: ${error}`,
          entry.id,
          entry.uri
        ),
      };
    }
  }

  // ==========================================================================
  // Traversal
  // ==========================================================================

  /**
   * Traverse a burrow, yielding events for each entry
   */
  async *traverse(
    burrow: Burrow,
    options: TraversalOptions = {}
  ): AsyncGenerator<TraversalEvent> {
    const {
      strategy = 'breadth-first',
      maxDepth = RESOURCE_LIMITS.MAX_TRAVERSAL_DEPTH,
      maxEntries = RESOURCE_LIMITS.MAX_TOTAL_ENTRIES,
      filter = () => true,
    } = options;

    const visited = new Set<string>();
    const queue: { entry: Entry; depth: number }[] = [];
    let processedCount = 0;

    // Sort entries by priority if using priority strategy
    const entries = strategy === 'priority' ? sortByPriority(burrow.entries) : burrow.entries;

    // Initialize queue
    for (const entry of entries) {
      if (filter(entry)) {
        queue.push({ entry, depth: 0 });
      }
    }

    while (queue.length > 0 && processedCount < maxEntries) {
      const item = strategy === 'depth-first' ? queue.pop()! : queue.shift()!;
      const { entry, depth } = item;

      // Cycle detection using entry id + uri as key
      const entryKey = `${entry.id}:${entry.uri}`;
      if (visited.has(entryKey)) {
        yield { type: 'cycle-detected', entry, depth };
        continue;
      }
      visited.add(entryKey);

      // Depth limit
      if (depth > maxDepth) {
        yield { type: 'depth-limit', entry, depth };
        continue;
      }

      yield { type: 'entry', entry, depth };
      processedCount++;

      // Queue children for burrow/dir entries
      if ((entry.kind === 'burrow' || entry.kind === 'dir') && depth < maxDepth) {
        const childBurrowResult = await this.fetchBurrow(resolveUri(burrow.baseUri, entry.uri));
        if (childBurrowResult.ok && childBurrowResult.data) {
          const childEntries = strategy === 'priority'
            ? sortByPriority(childBurrowResult.data.entries)
            : childBurrowResult.data.entries;

          for (const child of childEntries) {
            if (filter(child)) {
              queue.push({ entry: child, depth: depth + 1 });
            }
          }
        }
      } else if (entry.kind === 'map' && depth < maxDepth) {
        // Handle map entries - fetch burrow file directly
        const mapBurrowResult = await this.fetchBurrowFile(resolveUri(burrow.baseUri, entry.uri));
        if (mapBurrowResult.ok && mapBurrowResult.data) {
          const mapEntries = strategy === 'priority'
            ? sortByPriority(mapBurrowResult.data.entries)
            : mapBurrowResult.data.entries;

          for (const child of mapEntries) {
            if (filter(child)) {
              queue.push({ entry: child, depth: depth + 1 });
            }
          }
        }
      }
    }
  }

  /**
   * Traverse and collect summary
   */
  async traverseAndSummarize(
    burrow: Burrow,
    options: TraversalOptions = {}
  ): Promise<TraversalSummary> {
    const startTime = Date.now();
    const errors: Array<{ entryId: string; uri: string; error: string }> = [];
    let entriesProcessed = 0;
    let entriesSkipped = 0;

    for await (const event of this.traverse(burrow, options)) {
      if (event.type === 'entry') {
        entriesProcessed++;
      } else if (event.type === 'error') {
        entriesSkipped++;
        errors.push({
          entryId: event.entry.id,
          uri: event.entry.uri,
          error: event.error ?? 'Unknown error',
        });
      } else {
        entriesSkipped++;
      }
    }

    return {
      entriesProcessed,
      entriesSkipped,
      errors,
      duration: Date.now() - startTime,
    };
  }

  // ==========================================================================
  // Internal Helpers
  // ==========================================================================

  /**
   * Normalize a URI for consistent handling
   */
  private normalizeUri(uri: string): string {
    // Ensure trailing slash for directory-like URIs
    if (!uri.endsWith('/') && !uri.includes('.')) {
      return uri + '/';
    }
    return uri;
  }

  /**
   * Read a local file as text
   */
  private async readLocalFile(pathOrUri: string): Promise<string> {
    let filePath = pathOrUri;

    // Convert file:// URL to path
    if (filePath.startsWith('file://')) {
      filePath = filePath.replace(/^file:\/\//, '');
      if (filePath.startsWith('/') && /^\/[a-zA-Z]:/.test(filePath)) {
        filePath = filePath.slice(1);
      }
    }

    filePath = normalize(filePath);

    try {
      return await readFile(filePath, 'utf-8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('ENOENT')) {
        throw createError('manifest-not-found', `File not found: ${filePath}`, undefined, filePath);
      }
      if (errorMessage.includes('EACCES') || errorMessage.includes('EPERM')) {
        throw createError('transport-error', `Permission denied: ${filePath}`, undefined, filePath);
      }
      throw createError('transport-error', `Failed to read file: ${error}`, undefined, filePath);
    }
  }

  /**
   * Read a local file as bytes
   */
  private async readLocalFileBytes(pathOrUri: string): Promise<Uint8Array> {
    let filePath = pathOrUri;

    if (filePath.startsWith('file://')) {
      filePath = filePath.replace(/^file:\/\//, '');
      if (filePath.startsWith('/') && /^\/[a-zA-Z]:/.test(filePath)) {
        filePath = filePath.slice(1);
      }
    }

    filePath = normalize(filePath);

    try {
      const buffer = await readFile(filePath);
      return new Uint8Array(buffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('ENOENT')) {
        throw createError('entry-not-found', `File not found: ${filePath}`, undefined, filePath);
      }
      throw createError('transport-error', `Failed to read file: ${error}`, undefined, filePath);
    }
  }

  /**
   * Fetch remote JSON content
   */
  private async fetchRemoteJson(url: string): Promise<string> {
    await this.rateLimiter.acquire();

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw createError('manifest-not-found', `HTTP 404: ${url}`, undefined, url);
        }
        if (response.status === 429) {
          throw createError('rate-limited', `HTTP 429: Rate limited`, undefined, url);
        }
        throw createError('transport-error', `HTTP ${response.status}: ${response.statusText}`, undefined, url);
      }

      // Validate size
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > RESOURCE_LIMITS.MAX_MANIFEST_SIZE) {
        throw createError('manifest-invalid', `Manifest too large: ${contentLength} bytes`, undefined, url);
      }

      return await response.text();
    } finally {
      this.rateLimiter.release();
    }
  }

  /**
   * Fetch remote binary content
   */
  private async fetchRemoteBytes(url: string): Promise<Uint8Array> {
    await this.rateLimiter.acquire();

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw createError('entry-not-found', `HTTP 404: ${url}`, undefined, url);
        }
        throw createError('transport-error', `HTTP ${response.status}: ${response.statusText}`, undefined, url);
      }

      return new Uint8Array(await response.arrayBuffer());
    } finally {
      this.rateLimiter.release();
    }
  }

  /**
   * Clear the manifest cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a default RabitClient instance
 */
export function createClient(options?: RabitClientOptions): RabitClient {
  return new RabitClient(options);
}

/**
 * Quick discover function
 */
export async function discover(uri: string, options?: DiscoverOptions): Promise<DiscoveryResult> {
  const client = createClient();
  return client.discover(uri, options);
}

/**
 * Quick fetch burrow function
 */
export async function fetchBurrow(uri: string): Promise<Burrow | null> {
  const client = createClient();
  const result = await client.fetchBurrow(uri);
  return result.ok ? result.data! : null;
}

/**
 * Quick fetch warren function
 */
export async function fetchWarren(uri: string): Promise<Warren | null> {
  const client = createClient();
  const result = await client.fetchWarren(uri);
  return result.ok ? result.data! : null;
}
