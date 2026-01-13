/**
 * Rabit Client Library - Core Implementation
 * Full RBT Client conformance per §3.2.2
 */

import type {
  BurrowManifest,
  WarrenRegistry,
  Entry,
  Root,
  GitRoot,
  TraversalOptions,
  TraversalResult,
  FetchResult,
  TraversalReport,
  RbtError,
  WellKnownBurrow,
  WellKnownWarren,
} from './types';
import {
  isGitRoot,
  isHttpsRoot,
  getBaseUrl,
} from './types';
import {
  validateUrl,
  validateManifestSize,
  validateEntryCount,
  verifyContent,
  createError,
  getRootBaseUrl,
  getRootDisplayName,
  RateLimiter,
  RESOURCE_LIMITS,
  sleep,
  canonicalJson,
} from './utils';
import {
  cloneRepository,
  readFileFromRepo,
  cleanupRepository,
  isGitAvailable,
} from './git';

// ============================================================================
// Cache Implementation (§8.5)
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  maxAge: number;
  staleWhileRevalidate: number;
}

class ManifestCache {
  private cache = new Map<string, CacheEntry<BurrowManifest | WarrenRegistry>>();

  set(
    url: string,
    data: BurrowManifest | WarrenRegistry,
    maxAge = 3600,
    staleWhileRevalidate = 86400
  ): void {
    this.cache.set(url, {
      data,
      timestamp: Date.now(),
      maxAge: maxAge * 1000, // Convert to milliseconds
      staleWhileRevalidate: staleWhileRevalidate * 1000,
    });
  }

  get(url: string): { data: BurrowManifest | WarrenRegistry; stale: boolean } | null {
    const entry = this.cache.get(url);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const stale = age > entry.maxAge;
    const expired = age > entry.maxAge + entry.staleWhileRevalidate;

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

/**
 * Full RBT Client implementation
 * @see Specification §3.2.2
 */
export class RabitClient {
  private cache = new ManifestCache();
  private rateLimiter: RateLimiter;
  private gitAvailable?: boolean;

  constructor(
    private readonly options: {
      maxConcurrent?: number;
      minDelay?: number;
      enableCache?: boolean;
    } = {}
  ) {
    this.rateLimiter = new RateLimiter(
      options.maxConcurrent ?? RESOURCE_LIMITS.DEFAULT_MAX_CONCURRENT,
      options.minDelay ?? RESOURCE_LIMITS.DEFAULT_MIN_DELAY
    );
  }

  // ==========================================================================
  // Well-Known Discovery (§11)
  // ==========================================================================

  /**
   * Discover burrow via well-known endpoint
   * @see Specification §11.1
   */
  async discoverBurrow(origin: string): Promise<FetchResult<WellKnownBurrow>> {
    try {
      const url = new URL('/.well-known/rabit-burrow', origin);
      validateUrl(url.toString());

      const response = await this.fetchWithRateLimit(url.toString());

      if (!response.ok) {
        return {
          ok: false,
          error: createError(
            'manifest_not_found',
            `Well-known burrow endpoint not found: HTTP ${response.status}`
          ),
        };
      }

      const data = (await response.json()) as WellKnownBurrow;
      return { ok: true, data };
    } catch (error) {
      return {
        ok: false,
        error: createError('transport_error', `Failed to discover burrow: ${error}`),
      };
    }
  }

  /**
   * Discover warren via well-known endpoint
   * @see Specification §11.2
   */
  async discoverWarren(origin: string): Promise<FetchResult<WellKnownWarren>> {
    try {
      const url = new URL('/.well-known/rabit-warren', origin);
      validateUrl(url.toString());

      const response = await this.fetchWithRateLimit(url.toString());

      if (!response.ok) {
        return {
          ok: false,
          error: createError(
            'manifest_not_found',
            `Well-known warren endpoint not found: HTTP ${response.status}`
          ),
        };
      }

      const data = (await response.json()) as WellKnownWarren;
      return { ok: true, data };
    } catch (error) {
      return {
        ok: false,
        error: createError('transport_error', `Failed to discover warren: ${error}`),
      };
    }
  }

  // ==========================================================================
  // Manifest Fetching
  // ==========================================================================

  /**
   * Fetch warren registry from URL
   * @see Specification §10
   */
  async fetchWarren(url: string): Promise<FetchResult<WarrenRegistry>> {
    const warrenUrl = url.endsWith('.warren.json')
      ? url
      : `${url.replace(/\/$/, '')}/.warren.json`;

    // Check cache
    if (this.options.enableCache !== false) {
      const cached = this.cache.get(warrenUrl);
      if (cached && !cached.stale) {
        return { ok: true, data: cached.data as WarrenRegistry };
      }
    }

    try {
      validateUrl(warrenUrl);

      const response = await this.fetchWithRateLimit(warrenUrl);

      if (!response.ok) {
        return {
          ok: false,
          error: createError(
            'manifest_not_found',
            `HTTP ${response.status}: ${response.statusText}`,
            undefined,
            warrenUrl
          ),
        };
      }

      // Validate size
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        validateManifestSize(parseInt(contentLength, 10));
      }

      const data = (await response.json()) as WarrenRegistry;

      // Validate required fields
      if (!data.rbt || !data.registry || !data.entries) {
        return {
          ok: false,
          error: createError(
            'manifest_invalid',
            'Invalid warren format: missing required fields'
          ),
        };
      }

      validateEntryCount(data.entries.length);

      // Cache the result
      if (this.options.enableCache !== false) {
        this.cache.set(warrenUrl, data);
      }

      return { ok: true, data };
    } catch (error) {
      if ((error as RbtError).category) {
        return { ok: false, error: error as RbtError };
      }
      return {
        ok: false,
        error: createError('transport_error', `Failed to fetch warren: ${error}`),
      };
    }
  }

  /**
   * Fetch burrow manifest from URL or Git root
   * Implements root selection and fallback per §5.3
   */
  async fetchBurrow(urlOrRoot: string | Root): Promise<FetchResult<BurrowManifest>> {
    // Handle string URL
    if (typeof urlOrRoot === 'string') {
      return this.fetchBurrowFromUrl(urlOrRoot);
    }

    // Handle Root descriptor
    const root = urlOrRoot;

    // Try Git root first (§5.3)
    if (isGitRoot(root)) {
      const result = await this.fetchBurrowFromGit(root.git);
      if (result.ok) return result;
    }

    // Try HTTPS root
    if (isHttpsRoot(root)) {
      return this.fetchBurrowFromUrl(root.https.base);
    }

    return {
      ok: false,
      error: createError('transport_error', 'No usable root available'),
    };
  }

  /**
   * Fetch burrow manifest from HTTPS URL
   */
  private async fetchBurrowFromUrl(url: string): Promise<FetchResult<BurrowManifest>> {
    const burrowUrl = url.endsWith('.burrow.json')
      ? url
      : `${url.replace(/\/$/, '')}/.burrow.json`;

    // Check cache
    if (this.options.enableCache !== false) {
      const cached = this.cache.get(burrowUrl);
      if (cached && !cached.stale) {
        return { ok: true, data: cached.data as BurrowManifest };
      }
    }

    try {
      validateUrl(burrowUrl);

      const response = await this.fetchWithRateLimit(burrowUrl);

      if (!response.ok) {
        return {
          ok: false,
          error: createError(
            'manifest_not_found',
            `HTTP ${response.status}: ${response.statusText}`,
            undefined,
            burrowUrl
          ),
        };
      }

      // Validate size
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        validateManifestSize(parseInt(contentLength, 10));
      }

      const data = (await response.json()) as BurrowManifest;

      // Validate required fields
      if (!data.rbt || !data.manifest || !data.entries) {
        return {
          ok: false,
          error: createError(
            'manifest_invalid',
            'Invalid burrow format: missing required fields'
          ),
        };
      }

      validateEntryCount(data.entries.length);

      // Cache the result
      if (this.options.enableCache !== false) {
        const maxAge = data.manifest.cache?.maxAge ?? 3600;
        const stale = data.manifest.cache?.staleWhileRevalidate ?? 86400;
        this.cache.set(burrowUrl, data, maxAge, stale);
      }

      return { ok: true, data };
    } catch (error) {
      if ((error as RbtError).category) {
        return { ok: false, error: error as RbtError };
      }
      return {
        ok: false,
        error: createError('transport_error', `Failed to fetch burrow: ${error}`),
      };
    }
  }

  /**
   * Fetch burrow manifest from Git repository
   */
  private async fetchBurrowFromGit(root: GitRoot['git']): Promise<FetchResult<BurrowManifest>> {
    // Check if Git is available
    if (this.gitAvailable === undefined) {
      this.gitAvailable = await isGitAvailable();
    }

    if (!this.gitAvailable) {
      return {
        ok: false,
        error: createError(
          'transport_error',
          'Git is not available on this system'
        ),
      };
    }

    const cloneResult = await cloneRepository({ git: root });
    if (!cloneResult.ok || !cloneResult.data) {
      return { ok: false, error: cloneResult.error! };
    }

    const repoPath = cloneResult.data;

    try {
      const manifestResult = await readFileFromRepo(repoPath, '.burrow.json');
      if (!manifestResult.ok || !manifestResult.data) {
        return { ok: false, error: manifestResult.error! };
      }

      const manifestText = new TextDecoder().decode(manifestResult.data);
      const data = JSON.parse(manifestText) as BurrowManifest;

      // Validate required fields
      if (!data.rbt || !data.manifest || !data.entries) {
        return {
          ok: false,
          error: createError(
            'manifest_invalid',
            'Invalid burrow format: missing required fields'
          ),
        };
      }

      validateEntryCount(data.entries.length);

      return { ok: true, data };
    } finally {
      await cleanupRepository(repoPath);
    }
  }

  // ==========================================================================
  // Entry Fetching with Mirror Fallback (§7.4)
  // ==========================================================================

  /**
   * Fetch entry content with mirror fallback and RID verification
   * @see Specification §7.4
   */
  async fetchEntry(
    burrow: BurrowManifest,
    entry: Entry,
    options: { verifyRid?: boolean; useMirrors?: boolean } = {}
  ): Promise<FetchResult<Uint8Array>> {
    const { verifyRid = true, useMirrors = true } = options;

    const attempts: Array<{ root: string; error: string; status?: number }> = [];

    // Try primary roots first
    for (const root of burrow.manifest.roots) {
      const result = await this.fetchEntryFromRoot(burrow, entry, root, verifyRid);

      if (result.ok) return result;

      attempts.push({
        root: getRootDisplayName(root),
        error: result.error?.message ?? 'Unknown error',
      });
    }

    // Try mirrors if enabled (§7.4)
    if (useMirrors && burrow.manifest.mirrors) {
      for (const mirror of burrow.manifest.mirrors) {
        const result = await this.fetchEntryFromRoot(burrow, entry, mirror, verifyRid);

        if (result.ok) {
          return result;
        }

        attempts.push({
          root: `mirror:${getRootDisplayName(mirror)}`,
          error: result.error?.message ?? 'Unknown error',
        });
      }
    }

    // All attempts failed
    return {
      ok: false,
      error: {
        category: 'entry_not_found',
        message: `Failed to fetch entry from all available roots`,
        entryId: entry.id,
        href: entry.href,
        attempts,
      },
    };
  }

  /**
   * Fetch entry from a specific root
   */
  private async fetchEntryFromRoot(
    burrow: BurrowManifest,
    entry: Entry,
    root: Root,
    verifyRid: boolean
  ): Promise<FetchResult<Uint8Array>> {
    if (isHttpsRoot(root)) {
      return this.fetchEntryFromHttps(root.https.base, entry, verifyRid);
    }

    if (isGitRoot(root)) {
      return this.fetchEntryFromGit(root.git, entry, verifyRid);
    }

    return {
      ok: false,
      error: createError('transport_error', 'Unsupported root type'),
    };
  }

  /**
   * Fetch entry via HTTPS
   */
  private async fetchEntryFromHttps(
    baseUrl: string,
    entry: Entry,
    verifyRid: boolean
  ): Promise<FetchResult<Uint8Array>> {
    try {
      const entryUrl = new URL(entry.href, baseUrl).toString();
      validateUrl(entryUrl);

      const response = await this.fetchWithRateLimit(entryUrl);

      if (!response.ok) {
        return {
          ok: false,
          error: createError(
            'entry_not_found',
            `HTTP ${response.status}: ${response.statusText}`,
            entry.id,
            entry.href
          ),
        };
      }

      const content = new Uint8Array(await response.arrayBuffer());

      // Verify RID if requested (§7.4)
      if (verifyRid && (entry.rid || entry.hash)) {
        const valid = await verifyContent(content, entry.rid, entry.hash);
        if (!valid) {
          return {
            ok: false,
            error: createError(
              'verification_failed',
              'Content hash verification failed',
              entry.id,
              entry.href
            ),
          };
        }
      }

      return { ok: true, data: content };
    } catch (error) {
      if ((error as RbtError).category) {
        return { ok: false, error: error as RbtError };
      }
      return {
        ok: false,
        error: createError(
          'transport_error',
          `Failed to fetch entry: ${error}`,
          entry.id,
          entry.href
        ),
      };
    }
  }

  /**
   * Fetch entry from Git repository
   */
  private async fetchEntryFromGit(
    root: GitRoot['git'],
    entry: Entry,
    verifyRid: boolean
  ): Promise<FetchResult<Uint8Array>> {
    const cloneResult = await cloneRepository({ git: root });
    if (!cloneResult.ok || !cloneResult.data) {
      return { ok: false, error: cloneResult.error! };
    }

    const repoPath = cloneResult.data;

    try {
      const fileResult = await readFileFromRepo(repoPath, entry.href);
      if (!fileResult.ok || !fileResult.data) {
        return { ok: false, error: fileResult.error! };
      }

      const content = fileResult.data;

      // Verify RID if requested
      if (verifyRid && (entry.rid || entry.hash)) {
        const valid = await verifyContent(content, entry.rid, entry.hash);
        if (!valid) {
          return {
            ok: false,
            error: createError(
              'verification_failed',
              'Content hash verification failed',
              entry.id,
              entry.href
            ),
          };
        }
      }

      return { ok: true, data: content };
    } finally {
      await cleanupRepository(repoPath);
    }
  }

  // ==========================================================================
  // Traversal (§8)
  // ==========================================================================

  /**
   * Traverse a burrow using breadth-first search
   * @see Specification §8
   */
  async *traverseBurrow(
    burrow: BurrowManifest,
    options: TraversalOptions = {}
  ): AsyncGenerator<TraversalResult> {
    const {
      maxDepth = RESOURCE_LIMITS.MAX_TRAVERSAL_DEPTH,
      maxEntries = RESOURCE_LIMITS.MAX_TOTAL_ENTRIES,
      followChildren = false,
      filter = () => true,
      verifyRids = true,
      useMirrors = true,
    } = options;

    const visited = new Set<string>();
    const queue: { entry: Entry; depth: number }[] = [];
    let processedCount = 0;

    // Initialize queue with top-level entries
    for (const entry of burrow.entries) {
      if (filter(entry)) {
        queue.push({ entry, depth: 0 });
      }
    }

    while (queue.length > 0 && processedCount < maxEntries) {
      const item = queue.shift()!;
      const { entry, depth } = item;

      // Skip if already visited (cycle detection per §8.4)
      if (visited.has(entry.rid)) {
        continue;
      }
      visited.add(entry.rid);
      processedCount++;

      // Fetch content
      const result = await this.fetchEntry(burrow, entry, { verifyRid: verifyRids, useMirrors });

      yield {
        entry,
        content: result.data,
        error: result.error,
        fromMirror: false, // TODO: track if fetched from mirror
      };

      // Follow children if enabled and within depth limit (§6.7)
      if (followChildren && entry.children && depth < maxDepth) {
        // Fetch child manifest
        const childManifestUrl = new URL(
          entry.children.href,
          burrow.manifest.roots[0] && isHttpsRoot(burrow.manifest.roots[0])
            ? burrow.manifest.roots[0].https.base
            : undefined
        ).toString();

        const childResult = await this.fetchBurrow(childManifestUrl);
        if (childResult.ok && childResult.data) {
          for (const childEntry of childResult.data.entries) {
            if (filter(childEntry)) {
              queue.push({ entry: childEntry, depth: depth + 1 });
            }
          }
        }
      }
    }
  }

  /**
   * Generate a traversal report
   * @see Specification §9.3
   */
  async generateTraversalReport(
    burrow: BurrowManifest,
    options: TraversalOptions = {}
  ): Promise<TraversalReport> {
    const startTime = new Date().toISOString();
    const errors: RbtError[] = [];
    let entriesProcessed = 0;
    let entriesSkipped = 0;

    for await (const result of this.traverseBurrow(burrow, options)) {
      if (result.error) {
        errors.push(result.error);
        entriesSkipped++;
      } else {
        entriesProcessed++;
      }
    }

    return {
      manifest: burrow.manifest.roots[0]
        ? getRootDisplayName(burrow.manifest.roots[0])
        : 'unknown',
      started: startTime,
      completed: new Date().toISOString(),
      entriesProcessed,
      entriesSkipped,
      errors,
    };
  }

  // ==========================================================================
  // Rate Limiting and HTTP
  // ==========================================================================

  /**
   * Fetch with rate limiting and retry logic
   */
  private async fetchWithRateLimit(
    url: string,
    retries = 3
  ): Promise<Response> {
    for (let attempt = 0; attempt < retries; attempt++) {
      await this.rateLimiter.acquire();

      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(RESOURCE_LIMITS.MAX_REQUEST_TIMEOUT),
        });

        // Handle rate limiting (§8.6)
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000 * (attempt + 1);
          await sleep(delay);
          continue;
        }

        return response;
      } finally {
        this.rateLimiter.release();
      }
    }

    throw createError('rate_limited', `Rate limited after ${retries} attempts`, undefined, url);
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
export function createClient(options?: ConstructorParameters<typeof RabitClient>[0]): RabitClient {
  return new RabitClient(options);
}
