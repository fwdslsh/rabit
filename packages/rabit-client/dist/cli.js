#!/usr/bin/env bun
// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __require = import.meta.require;

// src/types.ts
function detectTransport(uri) {
  if (uri.startsWith("https://"))
    return "https";
  if (uri.startsWith("http://"))
    return "http";
  if (uri.startsWith("file://"))
    return "file";
  if (uri.startsWith("/") || /^[A-Z]:\\/.test(uri))
    return "file";
  if (uri.startsWith("./") || uri.startsWith("../") || uri === "." || uri === "..")
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
function parseGitHubUrl(uri, defaultBranch = "main") {
  const githubRepoMatch = uri.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(\/.*)?$/);
  if (!githubRepoMatch) {
    return null;
  }
  const [, owner, repo, path = ""] = githubRepoMatch;
  const treeBranchMatch = path.match(/^\/tree\/([^/]+)(\/.*)?$/);
  let branch = defaultBranch;
  let subPath = path;
  if (treeBranchMatch) {
    branch = treeBranchMatch[1];
    subPath = treeBranchMatch[2] || "";
  }
  return {
    owner,
    repo,
    branch,
    path: subPath,
    repoUrl: `https://github.com/${owner}/${repo}`
  };
}
function isGitHubUrl(uri) {
  return /^https:\/\/(github\.com|raw\.githubusercontent\.com)\/[^/]+\/[^/]+/.test(uri);
}
function normalizeGitHubUrl(uri, defaultBranch = "main") {
  const info = parseGitHubUrl(uri, defaultBranch);
  if (!info) {
    return uri;
  }
  return `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.branch}${info.path}`;
}
// src/utils.ts
function createError(category, message, entryId, uri) {
  return {
    category,
    message,
    entryId,
    uri
  };
}
var RESOURCE_LIMITS = {
  MAX_MANIFEST_SIZE: 10 * 1024 * 1024,
  MAX_ENTRY_COUNT: 1e4,
  MAX_TRAVERSAL_DEPTH: 100,
  MAX_TOTAL_ENTRIES: 1e6,
  MAX_REQUEST_TIMEOUT: 30000,
  DEFAULT_MAX_CONCURRENT: 10,
  DEFAULT_MIN_DELAY: 100
};
// src/git.ts
var {spawn } = globalThis.Bun;
import { join } from "path";
import { mkdtemp, rm, mkdir, access, stat } from "fs/promises";
import { tmpdir, homedir } from "os";
import * as crypto2 from "crypto";
function getRabitCacheDir() {
  const xdgStateHome = process.env.XDG_STATE_HOME;
  const baseDir = xdgStateHome || join(homedir(), ".local", "state");
  return join(baseDir, "rabit", "repos");
}
function getRepoCachePath(repoUrl) {
  const githubMatch = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+?)(?:\.git)?$/);
  if (githubMatch) {
    const [, owner, repo] = githubMatch;
    return join(getRabitCacheDir(), "github.com", owner, repo);
  }
  const hash = crypto2.createHash("sha256").update(repoUrl).digest("hex").slice(0, 16);
  const sanitized = repoUrl.replace(/^https?:\/\//, "").replace(/\.git$/, "").replace(/[^a-zA-Z0-9-_.]/g, "_").slice(0, 100);
  return join(getRabitCacheDir(), "other", `${sanitized}_${hash}`);
}
async function isCachedRepo(repoPath) {
  try {
    const gitDir = join(repoPath, ".git");
    await access(gitDir);
    const stats = await stat(gitDir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
async function cloneOrUpdateCached(repoUrl, branch = "main") {
  const cachePath = getRepoCachePath(repoUrl);
  try {
    if (await isCachedRepo(cachePath)) {
      const fetchProc = spawn(["git", "fetch", "--depth=1", "origin", branch], {
        cwd: cachePath,
        stderr: "pipe",
        stdout: "pipe"
      });
      const fetchExit = await fetchProc.exited;
      if (fetchExit !== 0) {
        const stderr = await new Response(fetchProc.stderr).text();
        console.warn(`Git fetch failed, using cached version: ${stderr}`);
        return { ok: true, data: cachePath };
      }
      const resetProc = spawn(["git", "reset", "--hard", `origin/${branch}`], {
        cwd: cachePath,
        stderr: "pipe",
        stdout: "pipe"
      });
      const resetExit = await resetProc.exited;
      if (resetExit !== 0) {
        const stderr = await new Response(resetProc.stderr).text();
        console.warn(`Git reset failed, using cached version: ${stderr}`);
      }
      return { ok: true, data: cachePath };
    }
    const parentDir = join(cachePath, "..");
    await mkdir(parentDir, { recursive: true });
    const cloneProc = spawn(["git", "clone", "--depth=1", "--branch", branch, "--single-branch", repoUrl, cachePath], {
      stderr: "pipe",
      stdout: "pipe"
    });
    const cloneExit = await cloneProc.exited;
    if (cloneExit !== 0) {
      const stderr = await new Response(cloneProc.stderr).text();
      return {
        ok: false,
        error: createError("transport_error", `Git clone failed: ${stderr}`, undefined, repoUrl)
      };
    }
    return { ok: true, data: cachePath };
  } catch (error) {
    return {
      ok: false,
      error: createError("transport_error", `Failed to clone or update repository: ${error}`, undefined, repoUrl)
    };
  }
}

// src/client.ts
import { readFile } from "fs/promises";
import { join as join2, normalize } from "path";
import * as crypto3 from "crypto";
var RESOURCE_LIMITS2 = {
  MAX_MANIFEST_SIZE: 10 * 1024 * 1024,
  MAX_ENTRY_COUNT: 1e4,
  MAX_TRAVERSAL_DEPTH: 100,
  MAX_TOTAL_ENTRIES: 1e6,
  MAX_REQUEST_TIMEOUT: 30000,
  DEFAULT_MAX_CONCURRENT: 10,
  DEFAULT_MIN_DELAY: 100
};
function createError2(category, message, entryId, uri) {
  return { category, message, entryId, uri };
}
function sleep(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}
async function verifySha256(content, expectedHash) {
  if (!expectedHash)
    return true;
  const hash = crypto3.createHash("sha256").update(content).digest("hex");
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
    this.rateLimiter = new RateLimiter(options.maxConcurrent ?? RESOURCE_LIMITS2.DEFAULT_MAX_CONCURRENT, options.minDelay ?? RESOURCE_LIMITS2.DEFAULT_MIN_DELAY);
    this.timeout = options.timeout ?? RESOURCE_LIMITS2.MAX_REQUEST_TIMEOUT;
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
  async fetchBurrowWithDiscovery(uri) {
    const directResult = await this.fetchBurrow(uri);
    if (directResult.ok) {
      return directResult;
    }
    const discoveryResult = await this.discover(uri);
    if (discoveryResult.burrow) {
      return { ok: true, data: discoveryResult.burrow };
    }
    return directResult;
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
          error: createError2("manifest-invalid", "Invalid warren format: missing required fields (specVersion, kind, burrows/warrens)")
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
        error: createError2("transport-error", `Failed to fetch warren: ${error}`)
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
          error: createError2("manifest-invalid", "Invalid burrow format: missing required fields (specVersion, kind, entries)")
        };
      }
      if (data.entries.length > RESOURCE_LIMITS2.MAX_ENTRY_COUNT) {
        return {
          ok: false,
          error: createError2("manifest-invalid", `Entry count ${data.entries.length} exceeds limit ${RESOURCE_LIMITS2.MAX_ENTRY_COUNT}`)
        };
      }
      if (!data.baseUri) {
        const dirUri = burrowUri.endsWith(".burrow.json") ? burrowUri.slice(0, -".burrow.json".length) : burrowUri;
        data.baseUri = dirUri;
      }
      if (data.baseUri && isGitHubUrl(data.baseUri)) {
        data.baseUri = normalizeGitHubUrl(data.baseUri);
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
        error: createError2("transport-error", `Failed to fetch burrow: ${error}`)
      };
    }
  }
  async fetchBurrowFile(uri) {
    if (this.options.enableCache !== false) {
      const cached = this.cache.get(uri);
      if (cached && !cached.stale && cached.data.kind === "burrow") {
        return { ok: true, data: cached.data };
      }
    }
    try {
      const transport = detectTransport(uri);
      let content;
      if (transport === "file") {
        content = await this.readLocalFile(uri);
      } else {
        content = await this.fetchRemoteJson(uri);
      }
      const data = JSON.parse(content);
      if (!data.specVersion || data.kind !== "burrow" || !data.entries) {
        return {
          ok: false,
          error: createError2("manifest-invalid", "Invalid burrow format: missing required fields (specVersion, kind, entries)")
        };
      }
      if (data.entries.length > RESOURCE_LIMITS2.MAX_ENTRY_COUNT) {
        return {
          ok: false,
          error: createError2("manifest-invalid", `Entry count ${data.entries.length} exceeds limit ${RESOURCE_LIMITS2.MAX_ENTRY_COUNT}`)
        };
      }
      if (!data.baseUri) {
        const dirUri = uri.endsWith(".burrow.json") ? uri.slice(0, -".burrow.json".length) : uri.substring(0, uri.lastIndexOf("/") + 1);
        data.baseUri = dirUri;
      }
      if (data.baseUri && isGitHubUrl(data.baseUri)) {
        data.baseUri = normalizeGitHubUrl(data.baseUri);
      }
      if (this.options.enableCache !== false) {
        this.cache.set(uri, data);
      }
      return { ok: true, data };
    } catch (error) {
      if (error.category) {
        return { ok: false, error };
      }
      return {
        ok: false,
        error: createError2("transport-error", `Failed to fetch burrow file: ${error}`)
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
            error: createError2("hash-mismatch", "Content sha256 verification failed", entry.id, entry.uri)
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
        error: createError2("transport-error", `Failed to fetch entry: ${error}`, entry.id, entry.uri)
      };
    }
  }
  async* traverse(burrow, options = {}) {
    const {
      strategy = "breadth-first",
      maxDepth = RESOURCE_LIMITS2.MAX_TRAVERSAL_DEPTH,
      maxEntries = RESOURCE_LIMITS2.MAX_TOTAL_ENTRIES,
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
      } else if (entry.kind === "map" && depth < maxDepth) {
        const mapBurrowResult = await this.fetchBurrowFile(resolveUri(burrow.baseUri, entry.uri));
        if (mapBurrowResult.ok && mapBurrowResult.data) {
          const mapEntries = strategy === "priority" ? sortByPriority(mapBurrowResult.data.entries) : mapBurrowResult.data.entries;
          for (const child of mapEntries) {
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
    let normalizedUri = normalizeGitHubUrl(uri);
    const lastSegment = normalizedUri.split("/").pop() || "";
    const hasFileExtension = lastSegment.includes(".") && !lastSegment.startsWith(".") && lastSegment !== "." && lastSegment !== "..";
    if (!normalizedUri.endsWith("/") && !hasFileExtension) {
      return normalizedUri + "/";
    }
    return normalizedUri;
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
        throw createError2("manifest-not-found", `File not found: ${filePath}`, undefined, filePath);
      }
      if (errorMessage.includes("EACCES") || errorMessage.includes("EPERM")) {
        throw createError2("transport-error", `Permission denied: ${filePath}`, undefined, filePath);
      }
      throw createError2("transport-error", `Failed to read file: ${error}`, undefined, filePath);
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
        throw createError2("entry-not-found", `File not found: ${filePath}`, undefined, filePath);
      }
      throw createError2("transport-error", `Failed to read file: ${error}`, undefined, filePath);
    }
  }
  async fetchRemoteJson(url) {
    const httpResult = await this.tryFetchRemoteJson(url);
    if (httpResult.ok) {
      return httpResult.data;
    }
    if (isGitHubUrl(url)) {
      const gitResult = await this.tryFetchViaGit(url);
      if (gitResult.ok) {
        return gitResult.data;
      }
      throw gitResult.error;
    }
    throw httpResult.error;
  }
  async tryFetchRemoteJson(url) {
    await this.rateLimiter.acquire();
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeout)
      });
      if (!response.ok) {
        if (response.status === 404) {
          return { ok: false, error: createError2("manifest-not-found", `HTTP 404: ${url}`, undefined, url) };
        }
        if (response.status === 429) {
          return { ok: false, error: createError2("rate-limited", `HTTP 429: Rate limited`, undefined, url) };
        }
        return { ok: false, error: createError2("transport-error", `HTTP ${response.status}: ${response.statusText}`, undefined, url) };
      }
      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > RESOURCE_LIMITS2.MAX_MANIFEST_SIZE) {
        return { ok: false, error: createError2("manifest-invalid", `Manifest too large: ${contentLength} bytes`, undefined, url) };
      }
      const text = await response.text();
      return { ok: true, data: text };
    } catch (error) {
      return { ok: false, error: createError2("transport-error", `Fetch failed: ${error}`, undefined, url) };
    } finally {
      this.rateLimiter.release();
    }
  }
  async tryFetchViaGit(url) {
    const originalUrl = url.replace(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)(.*)$/, "https://github.com/$1/$2$4");
    const repoInfo = parseGitHubUrl(originalUrl);
    if (!repoInfo) {
      return { ok: false, error: createError2("transport-error", "Invalid GitHub URL", undefined, url) };
    }
    const cloneResult = await cloneOrUpdateCached(repoInfo.repoUrl, repoInfo.branch);
    if (!cloneResult.ok) {
      return { ok: false, error: cloneResult.error };
    }
    const rawUrlMatch = url.match(/^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+(.*)$/);
    let filePath = rawUrlMatch ? rawUrlMatch[1] : "";
    if (filePath === "" || filePath === "/") {
      filePath = "/.burrow.json";
    } else if (!filePath.includes(".")) {
      filePath = filePath.replace(/\/$/, "") + "/.burrow.json";
    }
    const fullPath = join2(cloneResult.data, filePath.replace(/^\//, ""));
    try {
      const content = await readFile(fullPath, "utf-8");
      return { ok: true, data: content };
    } catch (error) {
      return { ok: false, error: createError2("manifest-not-found", `File not found in git repo: ${filePath}`, undefined, fullPath) };
    }
  }
  async fetchRemoteBytes(url) {
    const httpResult = await this.tryFetchRemoteBytes(url);
    if (httpResult.ok) {
      return httpResult.data;
    }
    if (isGitHubUrl(url)) {
      const gitResult = await this.tryFetchBytesViaGit(url);
      if (gitResult.ok) {
        return gitResult.data;
      }
      throw gitResult.error;
    }
    throw httpResult.error;
  }
  async tryFetchRemoteBytes(url) {
    await this.rateLimiter.acquire();
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeout)
      });
      if (!response.ok) {
        if (response.status === 404) {
          return { ok: false, error: createError2("entry-not-found", `HTTP 404: ${url}`, undefined, url) };
        }
        return { ok: false, error: createError2("transport-error", `HTTP ${response.status}: ${response.statusText}`, undefined, url) };
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      return { ok: true, data: bytes };
    } catch (error) {
      return { ok: false, error: createError2("transport-error", `Fetch failed: ${error}`, undefined, url) };
    } finally {
      this.rateLimiter.release();
    }
  }
  async tryFetchBytesViaGit(url) {
    const originalUrl = url.replace(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)(.*)$/, "https://github.com/$1/$2$4");
    const repoInfo = parseGitHubUrl(originalUrl);
    if (!repoInfo) {
      return { ok: false, error: createError2("transport-error", "Invalid GitHub URL", undefined, url) };
    }
    const cloneResult = await cloneOrUpdateCached(repoInfo.repoUrl, repoInfo.branch);
    if (!cloneResult.ok) {
      return { ok: false, error: cloneResult.error };
    }
    const rawUrlMatch = url.match(/^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+(.*)$/);
    let filePath = rawUrlMatch ? rawUrlMatch[1] : "";
    filePath = filePath.replace(/^\//, "");
    const fullPath = join2(cloneResult.data, filePath);
    try {
      const buffer = await readFile(fullPath);
      return { ok: true, data: new Uint8Array(buffer) };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { ok: false, error: createError2("entry-not-found", `File not found in git repo: ${filePath} (${errorMessage})`, undefined, fullPath) };
    }
  }
  clearCache() {
    this.cache.clear();
  }
}
function createClient(options) {
  return new RabitClient(options);
}
// src/cli.ts
var colors = {
  reset: "\x1B[0m",
  bold: "\x1B[1m",
  dim: "\x1B[2m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  cyan: "\x1B[36m",
  red: "\x1B[31m",
  magenta: "\x1B[35m"
};
function log(msg) {
  console.log(msg);
}
function error(msg) {
  console.error(`${colors.red}Error:${colors.reset} ${msg}`);
}
function success(msg) {
  console.log(`${colors.green}\u2713${colors.reset} ${msg}`);
}
function warning(msg) {
  console.log(`${colors.yellow}\u26A0${colors.reset} ${msg}`);
}
function header(msg) {
  console.log(`
${colors.bold}${colors.cyan}${msg}${colors.reset}`);
}
function label(name, value) {
  console.log(`  ${colors.dim}${name}:${colors.reset} ${value}`);
}
function formatBytes(bytes) {
  if (bytes < 1024)
    return `${bytes}B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
var client = createClient();
async function cmdDiscover(uri) {
  header(`Discovering burrows at: ${uri}`);
  const result = await client.discover(uri);
  if (result.depth === -1) {
    error("No burrow or warren found");
    process.exit(1);
  }
  success(`Found at depth ${result.depth}`);
  label("Base URI", result.baseUri);
  if (result.warren) {
    header("Warren Found:");
    label("Title", result.warren.title || "(untitled)");
    if (result.warren.description) {
      label("Description", result.warren.description);
    }
    label("Spec Version", result.warren.specVersion);
    label("Burrows", (result.warren.burrows?.length || 0).toString());
    if (result.warren.burrows && result.warren.burrows.length > 0) {
      log(`
  Burrows:`);
      for (const ref of result.warren.burrows) {
        log(`    \u2022 ${colors.bold}${ref.id}${colors.reset}: ${ref.title || "(untitled)"}`);
        log(`      ${colors.dim}${ref.uri}${colors.reset}`);
      }
    }
  }
  if (result.burrow) {
    header("Burrow Found:");
    label("Title", result.burrow.title || "(untitled)");
    if (result.burrow.description) {
      label("Description", result.burrow.description);
    }
    label("Spec Version", result.burrow.specVersion);
    label("Entries", result.burrow.entries.length.toString());
  }
  log("");
}
async function cmdList(uri, options) {
  const result = await client.fetchBurrowWithDiscovery(uri);
  if (!result.ok || !result.data) {
    error(result.error?.message || "Failed to fetch burrow");
    process.exit(1);
  }
  const burrow = result.data;
  const maxDepth = options.maxDepth ?? 1;
  const format = options.format || (process.stdout.isTTY ? "table" : "json");
  if (maxDepth === 1) {
    let entries = burrow.entries;
    if (options.kind) {
      entries = entries.filter((e) => e.kind === options.kind);
    }
    if (format === "json") {
      console.log(JSON.stringify(entries, null, 2));
    } else if (format === "table") {
      header(`Entries in ${burrow.title || uri}`);
      log("");
      for (const entry of entries) {
        const kindIcon = {
          file: "\uD83D\uDCC4",
          dir: "\uD83D\uDCC1",
          burrow: "\uD83D\uDC30",
          map: "\uD83D\uDDFA\uFE0F",
          link: "\uD83D\uDD17"
        }[entry.kind];
        log(`${kindIcon} ${colors.bold}${entry.title || entry.id}${colors.reset}`);
        log(`   ${colors.dim}ID:${colors.reset} ${entry.id}`);
        log(`   ${colors.dim}URI:${colors.reset} ${entry.uri}`);
        if (entry.mediaType) {
          log(`   ${colors.dim}Type:${colors.reset} ${entry.mediaType}`);
        }
        if (entry.sizeBytes) {
          log(`   ${colors.dim}Size:${colors.reset} ${formatBytes(entry.sizeBytes)}`);
        }
        if (entry.summary) {
          log(`   ${colors.dim}${entry.summary}${colors.reset}`);
        }
        log("");
      }
    } else if (format === "tree") {
      log(burrow.title || uri);
      const tree = buildFileTree(entries);
      const sortedKeys = Array.from(tree.keys()).sort();
      const rootEntries = [];
      const dirMap = new Map;
      for (const key of sortedKeys) {
        if (key.endsWith("/")) {
          if (!dirMap.has(key)) {
            dirMap.set(key, []);
          }
        } else if (!key.includes("/")) {
          rootEntries.push(key);
        } else {
          const topDir = key.split("/")[0] + "/";
          if (!dirMap.has(topDir)) {
            dirMap.set(topDir, []);
          }
          dirMap.get(topDir).push(key);
        }
      }
      const allTopLevel = [...rootEntries];
      for (const dir of dirMap.keys()) {
        allTopLevel.push(dir);
      }
      allTopLevel.sort();
      for (let i = 0;i < allTopLevel.length; i++) {
        const item = allTopLevel[i];
        const isLastTopLevel = i === allTopLevel.length - 1;
        const connector = isLastTopLevel ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
        if (item.endsWith("/")) {
          log(`${connector}${item}`);
          const dirContents = dirMap.get(item) || [];
          const dirContents2 = [];
          for (const content of dirContents) {
            if (!content.includes("/", item.length)) {
              dirContents2.push(content);
            }
          }
          dirContents2.sort();
          for (let j = 0;j < dirContents2.length; j++) {
            const file = dirContents2[j];
            const isLastFile = j === dirContents2.length - 1;
            const fileConnector = isLastFile ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
            const filePrefix = isLastTopLevel ? "    " : "\u2502   ";
            const fileName = file.substring(item.length);
            log(`${filePrefix}${fileConnector}${fileName}`);
          }
        } else {
          log(`${connector}${item}`);
        }
      }
    }
  } else {
    if (format === "json") {
      const nestedEntries = await collectEntriesNested(burrow, 0, maxDepth, options.kind);
      console.log(JSON.stringify(nestedEntries, null, 2));
    } else {
      header(`Entries in ${burrow.title || uri} (max-depth: ${maxDepth})`);
      log("");
      await displayEntriesRecursive(burrow, 0, maxDepth, options.kind, "", format === "tree");
    }
  }
}
async function collectEntriesNested(burrow, currentDepth, maxDepth, kindFilter) {
  let entries = burrow.entries;
  if (kindFilter) {
    entries = entries.filter((e) => e.kind === kindFilter);
  }
  const result = [];
  for (const entry of entries) {
    const entryWithChildren = { ...entry };
    if (currentDepth < maxDepth - 1 && (entry.kind === "burrow" || entry.kind === "dir")) {
      const childUri = resolveUri(burrow.baseUri, entry.uri);
      const childResult = await client.fetchBurrowWithDiscovery(childUri);
      if (childResult.ok && childResult.data) {
        entryWithChildren.children = await collectEntriesNested(childResult.data, currentDepth + 1, maxDepth, kindFilter);
      }
    }
    result.push(entryWithChildren);
  }
  return result;
}
function buildFileTree(entries) {
  const tree = new Map;
  for (const entry of entries) {
    const parts = entry.uri.split("/").filter((p) => p);
    if (parts.length === 1) {
      tree.set(entry.uri, { ...entry, isLeaf: true });
    } else {
      let currentPath = "";
      for (let i = 0;i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        if (!currentPath) {
          currentPath = part;
        } else {
          currentPath += "/" + part;
        }
        if (isLast) {
          tree.set(currentPath, { ...entry, isLeaf: true });
        } else {
          const dirKey = currentPath + "/";
          if (!tree.has(dirKey)) {
            tree.set(dirKey, {
              id: part,
              kind: "dir",
              uri: dirKey,
              title: part,
              isDir: true,
              children: []
            });
          }
        }
      }
    }
  }
  return tree;
}
async function displayEntriesRecursive(burrow, currentDepth, maxDepth, kindFilter, prefix, isTree, currentPath = "", visitedUris = new Set) {
  let entries = burrow.entries;
  if (kindFilter) {
    entries = entries.filter((e) => e.kind === kindFilter);
  }
  if (isTree) {
    const tree = buildFileTree(entries);
    const sortedKeys = Array.from(tree.keys()).sort();
    const rootEntries = [];
    const dirMap = new Map;
    for (const key of sortedKeys) {
      if (key.endsWith("/")) {
        if (!dirMap.has(key)) {
          dirMap.set(key, []);
        }
      } else if (!key.includes("/")) {
        rootEntries.push(key);
      } else {
        const topDir = key.split("/")[0] + "/";
        if (!dirMap.has(topDir)) {
          dirMap.set(topDir, []);
        }
        dirMap.get(topDir).push(key);
      }
    }
    const allTopLevel = [...rootEntries];
    for (const dir of dirMap.keys()) {
      allTopLevel.push(dir);
    }
    allTopLevel.sort();
    for (let i = 0;i < allTopLevel.length; i++) {
      const item = allTopLevel[i];
      const isLastTopLevel = i === allTopLevel.length - 1;
      const connector = isLastTopLevel ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
      if (item.endsWith("/")) {
        log(`${prefix}${connector}${item}`);
        const dirContents = dirMap.get(item) || [];
        const dirContents2 = [];
        for (const content of dirContents) {
          if (!content.includes("/", item.length)) {
            dirContents2.push(content);
          }
        }
        dirContents2.sort();
        for (let j = 0;j < dirContents2.length; j++) {
          const file = dirContents2[j];
          const isLastFile = j === dirContents2.length - 1;
          const fileConnector = isLastFile ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
          const filePrefix = isLastTopLevel ? "    " : "\u2502   ";
          const fileName = file.substring(item.length);
          log(`${prefix}${filePrefix}${fileConnector}${fileName}`);
        }
      } else {
        log(`${prefix}${connector}${item}`);
      }
    }
  } else {
    for (let i = 0;i < entries.length; i++) {
      const entry = entries[i];
      const kindIcon = {
        file: "\uD83D\uDCC4",
        dir: "\uD83D\uDCC1",
        burrow: "\uD83D\uDC30",
        map: "\uD83D\uDDFA\uFE0F",
        link: "\uD83D\uDD17"
      }[entry.kind];
      const indent = "  ".repeat(currentDepth);
      log(`${indent}${kindIcon} ${colors.bold}${entry.title || entry.id}${colors.reset}`);
      log(`${indent}   ${colors.dim}ID:${colors.reset} ${entry.id}`);
      log(`${indent}   ${colors.dim}URI:${colors.reset} ${entry.uri}`);
      if (entry.mediaType) {
        log(`${indent}   ${colors.dim}Type:${colors.reset} ${entry.mediaType}`);
      }
      if (entry.sizeBytes) {
        log(`${indent}   ${colors.dim}Size:${colors.reset} ${formatBytes(entry.sizeBytes)}`);
      }
      if (entry.summary) {
        log(`${indent}   ${colors.dim}${entry.summary}${colors.reset}`);
      }
      log("");
      if (currentDepth < maxDepth - 1 && (entry.kind === "burrow" || entry.kind === "dir")) {
        const childUri = resolveUri(burrow.baseUri, entry.uri);
        if (!visitedUris.has(childUri)) {
          const newVisitedUris = new Set(visitedUris);
          newVisitedUris.add(childUri);
          const childResult = await client.fetchBurrowWithDiscovery(childUri);
          if (childResult.ok && childResult.data) {
            await displayEntriesRecursive(childResult.data, currentDepth + 1, maxDepth, kindFilter, "", isTree, "", newVisitedUris);
          }
        }
      }
    }
  }
}
async function cmdFetch(uri, entryId, options) {
  const burrowResult = await client.fetchBurrowWithDiscovery(uri);
  if (!burrowResult.ok || !burrowResult.data) {
    error(burrowResult.error?.message || "Failed to fetch burrow");
    process.exit(1);
  }
  const burrow = burrowResult.data;
  const entry = burrow.entries.find((e) => e.id === entryId);
  if (!entry) {
    error(`Entry not found: ${entryId}`);
    log(`
Available entries:`);
    for (const e of burrow.entries) {
      log(`  - ${e.id}`);
    }
    process.exit(1);
  }
  header(`Fetching: ${entry.title || entry.id}`);
  label("ID", entry.id);
  label("URI", entry.uri);
  label("Kind", entry.kind);
  if (entry.mediaType) {
    label("Media Type", entry.mediaType);
  }
  log("");
  const contentResult = await client.fetchEntry(burrow, entry);
  if (!contentResult.ok || !contentResult.data) {
    error(contentResult.error?.message || "Failed to fetch entry");
    process.exit(1);
  }
  const content = contentResult.data;
  if (options.output) {
    await Bun.write(options.output, content);
    success(`Saved to ${options.output}`);
  } else {
    success("Content fetched");
    log(colors.dim + "\u2500".repeat(60) + colors.reset);
    log(new TextDecoder().decode(content));
    log(colors.dim + "\u2500".repeat(60) + colors.reset);
  }
}
async function cmdTraverse(uri, options) {
  const burrowResult = await client.fetchBurrowWithDiscovery(uri);
  if (!burrowResult.ok || !burrowResult.data) {
    error(burrowResult.error?.message || "Failed to fetch burrow");
    process.exit(1);
  }
  const burrow = burrowResult.data;
  header(`Traversing: ${burrow.title || uri}`);
  label("Strategy", options.strategy || "breadth-first");
  if (options.maxDepth) {
    label("Max Depth", options.maxDepth.toString());
  }
  log("");
  const startTime = Date.now();
  let count = 0;
  let cycleDetected = 0;
  let depthLimited = 0;
  for await (const event of client.traverse(burrow, {
    strategy: options.strategy,
    maxDepth: options.maxDepth,
    maxEntries: options.maxEntries
  })) {
    if (event.type === "entry") {
      count++;
      const depth = event.depth || 0;
      const indent = "  ".repeat(depth);
      log(`${indent}${colors.green}\u2713${colors.reset} ${event.entry.title || event.entry.id} (${event.entry.kind})`);
    } else if (event.type === "cycle-detected") {
      cycleDetected++;
      log(`${colors.yellow}\u21BB${colors.reset} Cycle detected: ${event.entry.id}`);
    } else if (event.type === "depth-limit") {
      depthLimited++;
    }
  }
  const duration = Date.now() - startTime;
  log("");
  success(`Traversed ${count} entries in ${duration}ms`);
  if (cycleDetected > 0) {
    warning(`${cycleDetected} cycles detected`);
  }
  if (depthLimited > 0) {
    warning(`${depthLimited} entries skipped (depth limit)`);
  }
}
async function cmdMap(inputDir, options) {
  const { readdirSync, statSync } = await import("fs");
  const { join: join3, relative, basename: pathBasename } = await import("path");
  const { resolve: resolvePath } = await import("path");
  const targetDir = resolvePath(inputDir);
  const outputFile = options.output || join3(targetDir, ".burrow.json");
  const maxDepth = options.maxDepth || 1;
  const excludePatterns = options.exclude || ["node_modules", "dist", ".git", ".burrow.json"];
  header(`Generating burrow map for: ${targetDir}`);
  label("Output", outputFile);
  label("Max Depth", maxDepth.toString());
  log("");
  function getMimeType(filename) {
    const ext = filename.split(".").pop()?.toLowerCase();
    const mimeMap = {
      md: "text/markdown",
      markdown: "text/markdown",
      json: "application/json",
      yaml: "application/x-yaml",
      yml: "application/x-yaml",
      html: "text/html",
      htm: "text/html",
      txt: "text/plain",
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      svg: "image/svg+xml",
      js: "application/javascript",
      ts: "application/typescript",
      css: "text/css",
      xml: "application/xml",
      zip: "application/zip",
      tar: "application/x-tar",
      gz: "application/gzip"
    };
    return mimeMap[ext || ""] || "application/octet-stream";
  }
  function generateId(name) {
    let id = name.replace(/\.[^/.]+$/, "");
    id = id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    id = id.replace(/^[0-9]+-/, "");
    return id || "entry";
  }
  function getPriority(name, isDir) {
    if (/^readme/i.test(name))
      return 100;
    if (/^index\./i.test(name))
      return 95;
    if (isDir)
      return 70;
    return 80;
  }
  function shouldExclude(name) {
    if (!options.includeHidden && name.startsWith("."))
      return true;
    return excludePatterns.some((pattern) => {
      if (pattern.includes("*")) {
        const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
        return regex.test(name);
      }
      return name === pattern;
    });
  }
  function countDirEntries(dir) {
    try {
      const items = readdirSync(dir);
      return items.filter((item) => !shouldExclude(item)).length;
    } catch {
      return 0;
    }
  }
  async function scanDirectoryAndCreateBurrow(dir, depth, rootDir) {
    if (depth > maxDepth)
      return [];
    const entries = [];
    try {
      const items = readdirSync(dir).sort();
      for (const item of items) {
        const itemPath = join3(dir, item);
        const relativePath = relative(rootDir, itemPath);
        if (shouldExclude(item))
          continue;
        try {
          const stats = statSync(itemPath);
          const isDir = stats.isDirectory();
          if (isDir) {
            if (depth < maxDepth) {
              const subEntryCount = countDirEntries(itemPath);
              const shouldCreateSeparateBurrow = subEntryCount >= 10;
              if (shouldCreateSeparateBurrow) {
                const subBurrowPath = join3(itemPath, ".burrow.json");
                const subEntries = await scanDirectoryAndCreateBurrow(itemPath, depth + 1, itemPath);
                const subBurrow = {
                  specVersion: "fwdslsh.dev/rabit/schemas/0.4.0/burrow",
                  kind: "burrow",
                  title: item,
                  description: `Auto-generated burrow for ${item}`,
                  updated: new Date().toISOString(),
                  entries: subEntries
                };
                await Bun.write(subBurrowPath, JSON.stringify(subBurrow, null, 2) + `
`);
                log(`  Created: ${relative(targetDir, subBurrowPath)} (${subEntries.length} entries)`);
                const entry = {
                  id: generateId(item),
                  kind: "burrow",
                  uri: relativePath + "/",
                  title: item,
                  summary: `Burrow containing ${subEntries.length} entries`,
                  priority: getPriority(item, true)
                };
                entries.push(entry);
              } else {
                const subEntries = await scanDirectoryAndCreateBurrow(itemPath, depth + 1, rootDir);
                for (const subEntry of subEntries) {
                  const consolidatedEntry = {
                    ...subEntry,
                    id: `${generateId(item)}-${subEntry.id}`
                  };
                  entries.push(consolidatedEntry);
                }
                log(`  Consolidated: ${item}/ (${subEntries.length} entries merged into parent)`);
              }
            } else {
              const entry = {
                id: generateId(item),
                kind: "dir",
                uri: relativePath + "/",
                title: item,
                priority: getPriority(item, true)
              };
              entries.push(entry);
            }
          } else {
            const entry = {
              id: generateId(item),
              kind: "file",
              uri: relativePath,
              title: item,
              mediaType: getMimeType(item),
              sizeBytes: stats.size,
              priority: getPriority(item, false)
            };
            entries.push(entry);
          }
        } catch (err) {
          warning(`Failed to process ${item}: ${err}`);
        }
      }
    } catch (err) {
      error(`Failed to read directory ${dir}: ${err}`);
    }
    return entries;
  }
  try {
    const entries = await scanDirectoryAndCreateBurrow(targetDir, 0, targetDir);
    const burrow = {
      specVersion: "fwdslsh.dev/rabit/schemas/0.4.0/burrow",
      kind: "burrow",
      title: options.title || pathBasename(targetDir),
      description: options.description || `Auto-generated burrow from ${targetDir}`,
      updated: new Date().toISOString(),
      entries
    };
    if (options.baseUri) {
      burrow.baseUri = options.baseUri;
    }
    await Bun.write(outputFile, JSON.stringify(burrow, null, 2) + `
`);
    success(`Generated burrow map with ${entries.length} entries`);
    label("Output", outputFile);
    const burrowCount = entries.filter((e) => e.kind === "burrow").length;
    const consolidatedCount = entries.filter((e) => e.id.includes("-")).length;
    if (burrowCount > 0) {
      log(`  ${colors.green}\u2713${colors.reset} Created ${burrowCount} nested burrow(s)`);
    }
    if (consolidatedCount > 0) {
      log(`  ${colors.yellow}\u2193${colors.reset} Consolidated ${consolidatedCount} entries from small directories`);
    }
    log("");
    label("Smart Consolidation", "Enabled (< 10 entries merged into parent)");
  } catch (err) {
    error(`Failed to generate burrow: ${err}`);
    process.exit(1);
  }
}
async function cmdValidate(file) {
  header(`Validating: ${file}`);
  try {
    const content = await Bun.file(file).text();
    const data = JSON.parse(content);
    if (!data.specVersion) {
      error("Missing required field: specVersion");
      process.exit(1);
    }
    if (!data.kind) {
      error("Missing required field: kind");
      process.exit(1);
    }
    if (data.kind !== "burrow" && data.kind !== "warren") {
      error(`Invalid kind: ${data.kind} (expected "burrow" or "warren")`);
      process.exit(1);
    }
    if (data.kind === "burrow" && !data.entries) {
      error("Burrow missing required field: entries");
      process.exit(1);
    }
    if (data.kind === "burrow") {
      for (let i = 0;i < data.entries.length; i++) {
        const entry = data.entries[i];
        if (!entry.id) {
          error(`Entry ${i} missing required field: id`);
          process.exit(1);
        }
        if (!entry.kind) {
          error(`Entry ${i} (${entry.id}) missing required field: kind`);
          process.exit(1);
        }
        if (!entry.uri) {
          error(`Entry ${i} (${entry.id}) missing required field: uri`);
          process.exit(1);
        }
      }
    }
    success("Valid manifest");
    label("Kind", data.kind);
    label("Spec Version", data.specVersion);
    if (data.title) {
      label("Title", data.title);
    }
    if (data.kind === "burrow") {
      label("Entries", data.entries.length.toString());
    }
    if (data.kind === "warren") {
      label("Burrows", (data.burrows?.length || 0).toString());
    }
  } catch (err) {
    error(`Validation failed: ${err}`);
    process.exit(1);
  }
}
function showHelp() {
  log(`
${colors.bold}Rabit CLI${colors.reset} - Universal Burrow Browser
${colors.dim}Rabit Specification v0.4.0${colors.reset}

${colors.bold}Usage:${colors.reset}
  rabit <command> [options]

${colors.bold}Commands:${colors.reset}
  discover <uri>                        Discover burrows at a location
  list <uri> [options]                  List entries in a burrow
  fetch <uri> <entry-id> [options]      Fetch a specific entry
  traverse <uri> [options]              Traverse all entries
  map <dir> [options]                   Generate burrow from directory
  validate <file>                       Validate a manifest file

${colors.bold}Options:${colors.reset}
  list:
    --max-depth N                       Max traversal depth (default: 1)
    --kind <file|dir|burrow|map|link>   Filter by entry kind
    --format <json|table|tree>          Output format

  fetch:
    --output FILE                       Save to file instead of stdout

  traverse:
    --strategy <bfs|dfs|priority>       Traversal strategy
    --max-depth N                       Maximum depth
    --max-entries N                     Maximum entries to process

  map:
    --output FILE                       Output file (default: .burrow.json)
    --title TEXT                        Burrow title
    --description TEXT                  Burrow description
    --base-uri URI                      Base URI for entries
    --max-depth N                       Max directory depth (default: 3)
    --include-hidden                    Include hidden files
    --exclude PATTERN                   Exclude patterns (comma-separated)

${colors.bold}Examples:${colors.reset}
  rabit discover https://example.com/repo
  rabit list https://example.com/repo --format table
  rabit fetch https://example.com/repo readme
  rabit traverse https://example.com/repo --strategy priority
  rabit map ./my-docs --title "My Documentation"
  rabit validate .burrow.json

${colors.bold}More Info:${colors.reset}
  https://github.com/fwdslsh/rabit
`);
}
var args = process.argv.slice(2);
var command = args[0];
if (!command || command === "--help" || command === "-h") {
  showHelp();
  process.exit(0);
}
try {
  switch (command) {
    case "discover":
      if (!args[1]) {
        error("Missing URI argument");
        log("Usage: rabit discover <uri>");
        process.exit(1);
      }
      await cmdDiscover(args[1]);
      break;
    case "list": {
      if (!args[1]) {
        error("Missing URI argument");
        log("Usage: rabit list <uri> [--max-depth N] [--kind <type>] [--format <json|table|tree>]");
        process.exit(1);
      }
      const options = {};
      for (let i = 2;i < args.length; i++) {
        if (args[i] === "--max-depth" && args[i + 1]) {
          options.maxDepth = parseInt(args[i + 1], 10);
          i++;
        } else if (args[i] === "--kind" && args[i + 1]) {
          options.kind = args[i + 1];
          i++;
        } else if (args[i] === "--format" && args[i + 1]) {
          options.format = args[i + 1];
          i++;
        }
      }
      await cmdList(args[1], options);
      break;
    }
    case "fetch": {
      if (!args[1] || !args[2]) {
        error("Missing required arguments");
        log("Usage: rabit fetch <uri> <entry-id> [--output FILE]");
        process.exit(1);
      }
      const options = {};
      for (let i = 3;i < args.length; i++) {
        if (args[i] === "--output" && args[i + 1]) {
          options.output = args[i + 1];
          i++;
        }
      }
      await cmdFetch(args[1], args[2], options);
      break;
    }
    case "traverse": {
      if (!args[1]) {
        error("Missing URI argument");
        log("Usage: rabit traverse <uri> [--strategy <bfs|dfs|priority>] [--max-depth N]");
        process.exit(1);
      }
      const options = {};
      for (let i = 2;i < args.length; i++) {
        if (args[i] === "--strategy" && args[i + 1]) {
          const strategy = args[i + 1];
          if (strategy === "bfs")
            options.strategy = "breadth-first";
          else if (strategy === "dfs")
            options.strategy = "depth-first";
          else
            options.strategy = strategy;
          i++;
        } else if (args[i] === "--max-depth" && args[i + 1]) {
          options.maxDepth = parseInt(args[i + 1], 10);
          i++;
        } else if (args[i] === "--max-entries" && args[i + 1]) {
          options.maxEntries = parseInt(args[i + 1], 10);
          i++;
        }
      }
      await cmdTraverse(args[1], options);
      break;
    }
    case "map": {
      if (!args[1]) {
        error("Missing directory argument");
        log("Usage: rabit map <dir> [--output FILE] [--title TEXT] [--description TEXT]");
        process.exit(1);
      }
      const options = {};
      for (let i = 2;i < args.length; i++) {
        if (args[i] === "--output" && args[i + 1]) {
          options.output = args[i + 1];
          i++;
        } else if (args[i] === "--title" && args[i + 1]) {
          options.title = args[i + 1];
          i++;
        } else if (args[i] === "--description" && args[i + 1]) {
          options.description = args[i + 1];
          i++;
        } else if (args[i] === "--base-uri" && args[i + 1]) {
          options.baseUri = args[i + 1];
          i++;
        } else if (args[i] === "--max-depth" && args[i + 1]) {
          options.maxDepth = parseInt(args[i + 1], 10);
          i++;
        } else if (args[i] === "--include-hidden") {
          options.includeHidden = true;
        } else if (args[i] === "--exclude" && args[i + 1]) {
          options.exclude = args[i + 1].split(",").map((s) => s.trim());
          i++;
        }
      }
      await cmdMap(args[1], options);
      break;
    }
    case "validate":
      if (!args[1]) {
        error("Missing file argument");
        log("Usage: rabit validate <file>");
        process.exit(1);
      }
      await cmdValidate(args[1]);
      break;
    default:
      error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
} catch (err) {
  error(`Fatal error: ${err}`);
  process.exit(1);
}
