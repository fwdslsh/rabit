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
  const result = await client.fetchBurrow(uri);
  if (!result.ok || !result.data) {
    error(result.error?.message || "Failed to fetch burrow");
    process.exit(1);
  }
  const burrow = result.data;
  let entries = burrow.entries;
  if (options.kind) {
    entries = entries.filter((e) => e.kind === options.kind);
  }
  const format = options.format || (process.stdout.isTTY ? "table" : "json");
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
    for (let i = 0;i < entries.length; i++) {
      const entry = entries[i];
      const isLast = i === entries.length - 1;
      const prefix = isLast ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 ";
      log(`${prefix}${entry.title || entry.id} (${entry.kind})`);
    }
  }
}
async function cmdFetch(uri, entryId, options) {
  const burrowResult = await client.fetchBurrow(uri);
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
  const burrowResult = await client.fetchBurrow(uri);
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
  const { join: join2, relative, basename: pathBasename } = await import("path");
  const { resolve: resolvePath } = await import("path");
  const targetDir = resolvePath(inputDir);
  const outputFile = options.output || join2(targetDir, ".burrow.json");
  const maxDepth = options.maxDepth || 3;
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
  function scanDirectory(dir, depth, rootDir) {
    if (depth > maxDepth)
      return [];
    const entries = [];
    try {
      const items = readdirSync(dir).sort();
      for (const item of items) {
        const itemPath = join2(dir, item);
        const relativePath = relative(rootDir, itemPath);
        if (shouldExclude(item))
          continue;
        try {
          const stats = statSync(itemPath);
          const isDir = stats.isDirectory();
          const entry = {
            id: generateId(item),
            kind: isDir ? "dir" : "file",
            uri: isDir ? relativePath + "/" : relativePath,
            title: item,
            priority: getPriority(item, isDir)
          };
          if (!isDir) {
            entry.mediaType = getMimeType(item);
            entry.sizeBytes = stats.size;
          }
          entries.push(entry);
          if (isDir && depth < maxDepth) {
            const subEntries = scanDirectory(itemPath, depth + 1, rootDir);
            entries.push(...subEntries);
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
    const entries = scanDirectory(targetDir, 0, targetDir);
    const burrow = {
      specVersion: "fwdslsh.dev/rabit/schemas/0.3.0/burrow",
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
    success(`Generated burrow with ${entries.length} entries`);
    label("Output", outputFile);
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
${colors.dim}Rabit Specification v0.3.0${colors.reset}

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
    --depth N                           Max traversal depth
    --kind <file|dir|burrow|link>       Filter by entry kind
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
        log("Usage: rabit list <uri> [--depth N] [--kind <type>] [--format <json|table|tree>]");
        process.exit(1);
      }
      const options = {};
      for (let i = 2;i < args.length; i++) {
        if (args[i] === "--depth" && args[i + 1]) {
          options.depth = parseInt(args[i + 1], 10);
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
