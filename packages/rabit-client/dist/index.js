// @bun
// src/types.ts
function isBurrow(doc) {
  return doc.kind === "burrow";
}
function isWarren(doc) {
  return doc.kind === "warren";
}
function isFileEntry(entry) {
  return entry.kind === "file";
}
function isDirEntry(entry) {
  return entry.kind === "dir";
}
function isBurrowEntry(entry) {
  return entry.kind === "burrow";
}
function isLinkEntry(entry) {
  return entry.kind === "link";
}
function detectTransport(uri) {
  if (uri.startsWith("https://"))
    return "https";
  if (uri.startsWith("http://"))
    return "http";
  if (uri.startsWith("file://"))
    return "file";
  if (uri.startsWith("/") || /^[A-Z]:\\/.test(uri))
    return "file";
  if (uri.startsWith("git://") || uri.startsWith("git@"))
    return "git";
  if (uri.includes(".git"))
    return "git";
  if (uri.startsWith("ssh://") || uri.startsWith("sftp://"))
    return "ssh";
  if (uri.startsWith("ftp://") || uri.startsWith("ftps://"))
    return "ftp";
  return "https";
}
function sortByPriority(entries) {
  return [...entries].sort((a, b) => {
    const priorityA = a.priority ?? 0;
    const priorityB = b.priority ?? 0;
    return priorityB - priorityA;
  });
}
function resolveUri(base, relative) {
  if (!base)
    return relative;
  if (relative.startsWith("http://") || relative.startsWith("https://") || relative.startsWith("file://")) {
    return relative;
  }
  const baseWithSlash = base.endsWith("/") ? base : base + "/";
  return baseWithSlash + relative;
}
function getParentUri(uri) {
  const trimmed = uri.endsWith("/") ? uri.slice(0, -1) : uri;
  const lastSlash = trimmed.lastIndexOf("/");
  if (lastSlash === -1)
    return uri;
  return trimmed.slice(0, lastSlash + 1);
}
function isValidSpecVersion(specVersion) {
  return specVersion.startsWith("fwdslsh.dev/rabit/schemas/");
}
function extractVersion(specVersion) {
  const match = specVersion.match(/fwdslsh\.dev\/rabit\/schemas\/([^/]+)\//);
  return match ? match[1] : null;
}
// src/helpers.ts
function findEntry(burrow, id) {
  return burrow.entries.find((e) => e.id === id);
}
function findEntriesByKind(burrow, kind) {
  return burrow.entries.filter((e) => e.kind === kind);
}
function findEntriesByTag(burrow, tag) {
  return burrow.entries.filter((e) => e.tags?.includes(tag));
}
function findEntriesByMediaType(burrow, mediaType) {
  return burrow.entries.filter((e) => e.mediaType === mediaType);
}
function searchEntries(burrow, query) {
  const lowerQuery = query.toLowerCase();
  return burrow.entries.filter((e) => e.title?.toLowerCase().includes(lowerQuery) || e.summary?.toLowerCase().includes(lowerQuery) || e.id.toLowerCase().includes(lowerQuery));
}
function getEntriesByPriority(burrow) {
  return sortByPriority(burrow.entries);
}
function groupEntriesByKind(burrow) {
  return {
    file: findEntriesByKind(burrow, "file"),
    dir: findEntriesByKind(burrow, "dir"),
    burrow: findEntriesByKind(burrow, "burrow"),
    link: findEntriesByKind(burrow, "link")
  };
}
function getAllTags(burrow) {
  const tags = new Set;
  for (const entry of burrow.entries) {
    if (entry.tags) {
      for (const tag of entry.tags) {
        tags.add(tag);
      }
    }
  }
  return Array.from(tags).sort();
}
function groupByMediaType(burrow) {
  const groups = new Map;
  for (const entry of burrow.entries) {
    if (entry.mediaType) {
      const existing = groups.get(entry.mediaType) ?? [];
      existing.push(entry);
      groups.set(entry.mediaType, existing);
    }
  }
  return groups;
}
function getEntryPoint(burrow) {
  const entryPointId = burrow.agents?.entryPoint;
  if (entryPointId) {
    return findEntry(burrow, entryPointId);
  }
  const sorted = getEntriesByPriority(burrow);
  return sorted[0];
}
function getAgentHints(burrow) {
  return burrow.agents?.hints ?? [];
}
function getAgentContext(burrow) {
  return burrow.agents?.context;
}
function listBurrows(warren) {
  return warren.burrows ?? [];
}
function findBurrow(warren, id) {
  return warren.burrows?.find((b) => b.id === id);
}
function findBurrowsByTag(warren, tag) {
  return warren.burrows?.filter((b) => b.tags?.includes(tag)) ?? [];
}
function getWarrenTags(warren) {
  const tags = new Set;
  for (const burrow of warren.burrows ?? []) {
    if (burrow.tags) {
      for (const tag of burrow.tags) {
        tags.add(tag);
      }
    }
  }
  return Array.from(tags).sort();
}
function getBurrowsByPriority(warren) {
  return [...warren.burrows ?? []].sort((a, b) => {
    const priorityA = a.priority ?? 0;
    const priorityB = b.priority ?? 0;
    return priorityB - priorityA;
  });
}
function getRepoFiles(burrow) {
  return burrow.repo ?? {};
}
function hasReadme(burrow) {
  return !!burrow.repo?.readme;
}
function getBurrowStats(burrow) {
  const grouped = groupEntriesByKind(burrow);
  let totalSize = 0;
  for (const entry of burrow.entries) {
    if (entry.sizeBytes) {
      totalSize += entry.sizeBytes;
    }
  }
  return {
    totalEntries: burrow.entries.length,
    fileCount: grouped.file.length,
    dirCount: grouped.dir.length,
    burrowCount: grouped.burrow.length,
    linkCount: grouped.link.length,
    tagCount: getAllTags(burrow).length,
    totalSizeBytes: totalSize
  };
}
// src/client.ts
import { readFile } from "fs/promises";
import { normalize } from "path";
import * as crypto from "crypto";
var RESOURCE_LIMITS = {
  MAX_MANIFEST_SIZE: 10 * 1024 * 1024,
  MAX_ENTRY_COUNT: 1e4,
  MAX_TRAVERSAL_DEPTH: 100,
  MAX_TOTAL_ENTRIES: 1e5,
  MAX_REQUEST_TIMEOUT: 30000,
  DEFAULT_MAX_CONCURRENT: 10,
  DEFAULT_MIN_DELAY: 100
};
function createError(category, message, entryId, uri) {
  return { category, message, entryId, uri };
}
function sleep(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}
async function verifySha256(content, expectedHash) {
  if (!expectedHash)
    return true;
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  return hash === expectedHash;
}

class RateLimiter {
  maxConcurrent;
  minDelay;
  activeRequests = 0;
  lastRequestTime = 0;
  constructor(maxConcurrent, minDelay) {
    this.maxConcurrent = maxConcurrent;
    this.minDelay = minDelay;
  }
  async acquire() {
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
  release() {
    this.activeRequests--;
  }
}

class ManifestCache {
  cache = new Map;
  defaultMaxAge = 3600 * 1000;
  set(url, data, maxAge) {
    this.cache.set(url, {
      data,
      timestamp: Date.now(),
      maxAge: (maxAge ?? 3600) * 1000
    });
  }
  get(url) {
    const entry = this.cache.get(url);
    if (!entry)
      return null;
    const age = Date.now() - entry.timestamp;
    const stale = age > entry.maxAge;
    const expired = age > entry.maxAge * 2;
    if (expired) {
      this.cache.delete(url);
      return null;
    }
    return { data: entry.data, stale };
  }
  clear() {
    this.cache.clear();
  }
}

class RabitClient {
  options;
  cache = new ManifestCache;
  rateLimiter;
  timeout;
  constructor(options = {}) {
    this.options = options;
    this.rateLimiter = new RateLimiter(options.maxConcurrent ?? RESOURCE_LIMITS.DEFAULT_MAX_CONCURRENT, options.minDelay ?? RESOURCE_LIMITS.DEFAULT_MIN_DELAY);
    this.timeout = options.timeout ?? RESOURCE_LIMITS.MAX_REQUEST_TIMEOUT;
  }
  async discover(uri, options = {}) {
    const maxParentWalk = options.maxParentWalk ?? 2;
    let currentUri = this.normalizeUri(uri);
    for (let depth = 0;depth <= maxParentWalk; depth++) {
      const warren = await this.tryFetchWarren(currentUri);
      const burrow = await this.tryFetchBurrow(currentUri);
      if (warren || burrow) {
        return {
          warren,
          burrow,
          baseUri: currentUri,
          depth
        };
      }
      currentUri = getParentUri(currentUri);
    }
    return {
      warren: null,
      burrow: null,
      baseUri: uri,
      depth: -1
    };
  }
  async tryFetchWarren(baseUri) {
    const result = await this.fetchWarren(baseUri);
    return result.ok ? result.data : null;
  }
  async tryFetchBurrow(baseUri) {
    const result = await this.fetchBurrow(baseUri);
    return result.ok ? result.data : null;
  }
  async fetchWarren(uri) {
    const warrenUri = uri.endsWith(".warren.json") ? uri : `${uri.replace(/\/$/, "")}/.warren.json`;
    if (this.options.enableCache !== false) {
      const cached = this.cache.get(warrenUri);
      if (cached && !cached.stale && cached.data.kind === "warren") {
        return { ok: true, data: cached.data };
      }
    }
    try {
      const transport = detectTransport(warrenUri);
      let content;
      if (transport === "file") {
        content = await this.readLocalFile(warrenUri);
      } else {
        content = await this.fetchRemoteJson(warrenUri);
      }
      const data = JSON.parse(content);
      if (!data.specVersion || data.kind !== "warren" || !data.burrows && !data.warrens) {
        return {
          ok: false,
          error: createError("manifest-invalid", "Invalid warren format: missing required fields (specVersion, kind, burrows/warrens)")
        };
      }
      if (this.options.enableCache !== false) {
        this.cache.set(warrenUri, data);
      }
      return { ok: true, data };
    } catch (error) {
      if (error.category) {
        return { ok: false, error };
      }
      return {
        ok: false,
        error: createError("transport-error", `Failed to fetch warren: ${error}`)
      };
    }
  }
  async fetchBurrow(uri) {
    const burrowUri = uri.endsWith(".burrow.json") ? uri : `${uri.replace(/\/$/, "")}/.burrow.json`;
    if (this.options.enableCache !== false) {
      const cached = this.cache.get(burrowUri);
      if (cached && !cached.stale && cached.data.kind === "burrow") {
        return { ok: true, data: cached.data };
      }
    }
    try {
      const transport = detectTransport(burrowUri);
      let content;
      if (transport === "file") {
        content = await this.readLocalFile(burrowUri);
      } else {
        content = await this.fetchRemoteJson(burrowUri);
      }
      const data = JSON.parse(content);
      if (!data.specVersion || data.kind !== "burrow" || !data.entries) {
        return {
          ok: false,
          error: createError("manifest-invalid", "Invalid burrow format: missing required fields (specVersion, kind, entries)")
        };
      }
      if (data.entries.length > RESOURCE_LIMITS.MAX_ENTRY_COUNT) {
        return {
          ok: false,
          error: createError("manifest-invalid", `Entry count ${data.entries.length} exceeds limit ${RESOURCE_LIMITS.MAX_ENTRY_COUNT}`)
        };
      }
      if (this.options.enableCache !== false) {
        this.cache.set(burrowUri, data);
      }
      return { ok: true, data };
    } catch (error) {
      if (error.category) {
        return { ok: false, error };
      }
      return {
        ok: false,
        error: createError("transport-error", `Failed to fetch burrow: ${error}`)
      };
    }
  }
  async fetchEntry(burrow, entry, options = {}) {
    const { verifySha256: verify = true } = options;
    try {
      const entryUri = resolveUri(burrow.baseUri, entry.uri);
      const transport = detectTransport(entryUri);
      let content;
      if (transport === "file") {
        content = await this.readLocalFileBytes(entryUri);
      } else {
        content = await this.fetchRemoteBytes(entryUri);
      }
      if (verify && entry.sha256) {
        const valid = await verifySha256(content, entry.sha256);
        if (!valid) {
          return {
            ok: false,
            error: createError("hash-mismatch", "Content sha256 verification failed", entry.id, entry.uri)
          };
        }
      }
      return { ok: true, data: content };
    } catch (error) {
      if (error.category) {
        return { ok: false, error };
      }
      return {
        ok: false,
        error: createError("transport-error", `Failed to fetch entry: ${error}`, entry.id, entry.uri)
      };
    }
  }
  async* traverse(burrow, options = {}) {
    const {
      strategy = "breadth-first",
      maxDepth = RESOURCE_LIMITS.MAX_TRAVERSAL_DEPTH,
      maxEntries = RESOURCE_LIMITS.MAX_TOTAL_ENTRIES,
      filter = () => true
    } = options;
    const visited = new Set;
    const queue = [];
    let processedCount = 0;
    const entries = strategy === "priority" ? sortByPriority(burrow.entries) : burrow.entries;
    for (const entry of entries) {
      if (filter(entry)) {
        queue.push({ entry, depth: 0 });
      }
    }
    while (queue.length > 0 && processedCount < maxEntries) {
      const item = strategy === "depth-first" ? queue.pop() : queue.shift();
      const { entry, depth } = item;
      const entryKey = `${entry.id}:${entry.uri}`;
      if (visited.has(entryKey)) {
        yield { type: "cycle-detected", entry, depth };
        continue;
      }
      visited.add(entryKey);
      if (depth > maxDepth) {
        yield { type: "depth-limit", entry, depth };
        continue;
      }
      yield { type: "entry", entry, depth };
      processedCount++;
      if ((entry.kind === "burrow" || entry.kind === "dir") && depth < maxDepth) {
        const childBurrowResult = await this.fetchBurrow(resolveUri(burrow.baseUri, entry.uri));
        if (childBurrowResult.ok && childBurrowResult.data) {
          const childEntries = strategy === "priority" ? sortByPriority(childBurrowResult.data.entries) : childBurrowResult.data.entries;
          for (const child of childEntries) {
            if (filter(child)) {
              queue.push({ entry: child, depth: depth + 1 });
            }
          }
        }
      }
    }
  }
  async traverseAndSummarize(burrow, options = {}) {
    const startTime = Date.now();
    const errors = [];
    let entriesProcessed = 0;
    let entriesSkipped = 0;
    for await (const event of this.traverse(burrow, options)) {
      if (event.type === "entry") {
        entriesProcessed++;
      } else if (event.type === "error") {
        entriesSkipped++;
        errors.push({
          entryId: event.entry.id,
          uri: event.entry.uri,
          error: event.error ?? "Unknown error"
        });
      } else {
        entriesSkipped++;
      }
    }
    return {
      entriesProcessed,
      entriesSkipped,
      errors,
      duration: Date.now() - startTime
    };
  }
  normalizeUri(uri) {
    if (!uri.endsWith("/") && !uri.includes(".")) {
      return uri + "/";
    }
    return uri;
  }
  async readLocalFile(pathOrUri) {
    let filePath = pathOrUri;
    if (filePath.startsWith("file://")) {
      filePath = filePath.replace(/^file:\/\//, "");
      if (filePath.startsWith("/") && /^\/[a-zA-Z]:/.test(filePath)) {
        filePath = filePath.slice(1);
      }
    }
    filePath = normalize(filePath);
    try {
      return await readFile(filePath, "utf-8");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("ENOENT")) {
        throw createError("manifest-not-found", `File not found: ${filePath}`, undefined, filePath);
      }
      if (errorMessage.includes("EACCES") || errorMessage.includes("EPERM")) {
        throw createError("transport-error", `Permission denied: ${filePath}`, undefined, filePath);
      }
      throw createError("transport-error", `Failed to read file: ${error}`, undefined, filePath);
    }
  }
  async readLocalFileBytes(pathOrUri) {
    let filePath = pathOrUri;
    if (filePath.startsWith("file://")) {
      filePath = filePath.replace(/^file:\/\//, "");
      if (filePath.startsWith("/") && /^\/[a-zA-Z]:/.test(filePath)) {
        filePath = filePath.slice(1);
      }
    }
    filePath = normalize(filePath);
    try {
      const buffer = await readFile(filePath);
      return new Uint8Array(buffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("ENOENT")) {
        throw createError("entry-not-found", `File not found: ${filePath}`, undefined, filePath);
      }
      throw createError("transport-error", `Failed to read file: ${error}`, undefined, filePath);
    }
  }
  async fetchRemoteJson(url) {
    await this.rateLimiter.acquire();
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeout)
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw createError("manifest-not-found", `HTTP 404: ${url}`, undefined, url);
        }
        if (response.status === 429) {
          throw createError("rate-limited", `HTTP 429: Rate limited`, undefined, url);
        }
        throw createError("transport-error", `HTTP ${response.status}: ${response.statusText}`, undefined, url);
      }
      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > RESOURCE_LIMITS.MAX_MANIFEST_SIZE) {
        throw createError("manifest-invalid", `Manifest too large: ${contentLength} bytes`, undefined, url);
      }
      return await response.text();
    } finally {
      this.rateLimiter.release();
    }
  }
  async fetchRemoteBytes(url) {
    await this.rateLimiter.acquire();
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeout)
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw createError("entry-not-found", `HTTP 404: ${url}`, undefined, url);
        }
        throw createError("transport-error", `HTTP ${response.status}: ${response.statusText}`, undefined, url);
      }
      return new Uint8Array(await response.arrayBuffer());
    } finally {
      this.rateLimiter.release();
    }
  }
  clearCache() {
    this.cache.clear();
  }
}
function createClient(options) {
  return new RabitClient(options);
}
async function discover(uri, options) {
  const client = createClient();
  return client.discover(uri, options);
}
async function fetchBurrow(uri) {
  const client = createClient();
  const result = await client.fetchBurrow(uri);
  return result.ok ? result.data : null;
}
async function fetchWarren(uri) {
  const client = createClient();
  const result = await client.fetchWarren(uri);
  return result.ok ? result.data : null;
}
export {
  sortByPriority,
  searchEntries,
  resolveUri,
  listBurrows,
  isWarren,
  isValidSpecVersion,
  isLinkEntry,
  isFileEntry,
  isDirEntry,
  isBurrowEntry,
  isBurrow,
  hasReadme,
  groupEntriesByKind,
  groupByMediaType,
  getWarrenTags,
  getRepoFiles,
  getParentUri,
  getEntryPoint,
  getEntriesByPriority,
  getBurrowsByPriority,
  getBurrowStats,
  getAllTags,
  getAgentHints,
  getAgentContext,
  findEntry,
  findEntriesByTag,
  findEntriesByMediaType,
  findEntriesByKind,
  findBurrowsByTag,
  findBurrow,
  fetchWarren,
  fetchBurrow,
  extractVersion,
  discover,
  detectTransport,
  createClient,
  RabitClient
};
