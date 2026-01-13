/**
 * Rabit Client Library
 * Proof-of-concept implementation for traversing burrows and warrens
 */

import {
  type BurrowManifest,
  type WarrenRegistry,
  type Entry,
  type Root,
  type WarrenEntry,
  isHttpsRoot,
  getBaseUrl,
} from './types';

export interface TraversalOptions {
  maxDepth?: number;
  maxEntries?: number;
  followChildren?: boolean;
  filter?: (entry: Entry) => boolean;
}

export interface TraversalResult {
  entry: Entry;
  content?: string;
  error?: string;
}

export interface FetchResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetch and parse a warren registry
 */
export async function fetchWarren(url: string): Promise<FetchResult<WarrenRegistry>> {
  try {
    const warrenUrl = url.endsWith('.warren.json') ? url : `${url.replace(/\/$/, '')}/.warren.json`;
    const response = await fetch(warrenUrl);
    
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    const data = await response.json() as WarrenRegistry;
    
    if (!data.rbt || !data.registry || !data.entries) {
      return { ok: false, error: 'Invalid warren format: missing required fields' };
    }
    
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: `Failed to fetch warren: ${error}` };
  }
}

/**
 * Fetch and parse a burrow manifest
 */
export async function fetchBurrow(url: string): Promise<FetchResult<BurrowManifest>> {
  try {
    const burrowUrl = url.endsWith('.burrow.json') ? url : `${url.replace(/\/$/, '')}/.burrow.json`;
    const response = await fetch(burrowUrl);
    
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    const data = await response.json() as BurrowManifest;
    
    if (!data.rbt || !data.manifest || !data.entries) {
      return { ok: false, error: 'Invalid burrow format: missing required fields' };
    }
    
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: `Failed to fetch burrow: ${error}` };
  }
}

/**
 * Get the base URL for a burrow from its roots
 */
export function getBurrowBaseUrl(burrow: BurrowManifest): string | null {
  for (const root of burrow.manifest.roots) {
    const baseUrl = getBaseUrl(root);
    if (baseUrl) return baseUrl;
  }
  return null;
}

/**
 * Fetch an entry's content from a burrow
 */
export async function fetchEntry(burrow: BurrowManifest, entry: Entry): Promise<FetchResult<string>> {
  const baseUrl = getBurrowBaseUrl(burrow);
  if (!baseUrl) {
    return { ok: false, error: 'No HTTPS root available' };
  }
  
  try {
    const entryUrl = new URL(entry.href, baseUrl).toString();
    const response = await fetch(entryUrl);
    
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    const content = await response.text();
    return { ok: true, data: content };
  } catch (error) {
    return { ok: false, error: `Failed to fetch entry: ${error}` };
  }
}

/**
 * Traverse a burrow using breadth-first search
 */
export async function* traverseBurrow(
  burrow: BurrowManifest,
  options: TraversalOptions = {}
): AsyncGenerator<TraversalResult> {
  const {
    maxDepth = 10,
    maxEntries = 1000,
    followChildren = false,
    filter = () => true,
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
    
    // Skip if already visited (cycle detection)
    if (visited.has(entry.rid)) {
      continue;
    }
    visited.add(entry.rid);
    processedCount++;
    
    // Fetch content
    const result = await fetchEntry(burrow, entry);
    
    yield {
      entry,
      content: result.data,
      error: result.error,
    };
    
    // Follow children if enabled and within depth limit
    if (followChildren && entry.children && depth < maxDepth) {
      // Would fetch child manifest here
      // For this POC, we skip child traversal
    }
  }
}

/**
 * Find an entry by ID in a burrow
 */
export function findEntry(burrow: BurrowManifest, id: string): Entry | undefined {
  return burrow.entries.find((e) => e.id === id);
}

/**
 * Find entries by relation type
 */
export function findEntriesByRel(burrow: BurrowManifest, rel: string): Entry[] {
  return burrow.entries.filter((e) => e.rel.includes(rel));
}

/**
 * Get the entry point for a burrow (for agents)
 */
export function getEntryPoint(burrow: BurrowManifest): Entry | undefined {
  const entryPointId = burrow.manifest.agents?.entryPoint;
  
  if (entryPointId) {
    // Try to find by ID first
    const byId = findEntry(burrow, entryPointId);
    if (byId) return byId;
    
    // Try to find by href
    const byHref = burrow.entries.find((e) => e.href === entryPointId);
    if (byHref) return byHref;
  }
  
  // Fall back to index entry
  const indexEntries = findEntriesByRel(burrow, 'index');
  if (indexEntries.length > 0) return indexEntries[0];
  
  // Fall back to first entry
  return burrow.entries[0];
}

/**
 * Get agent hints for a burrow
 */
export function getAgentHints(burrow: BurrowManifest): string[] {
  return burrow.manifest.agents?.hints ?? [];
}

/**
 * Get agent context for a burrow
 */
export function getAgentContext(burrow: BurrowManifest): string | undefined {
  return burrow.manifest.agents?.context;
}

/**
 * List all burrows in a warren
 */
export function listBurrows(warren: WarrenRegistry): WarrenEntry[] {
  return warren.entries;
}

/**
 * Find a burrow in a warren by name
 */
export function findBurrow(warren: WarrenRegistry, name: string): WarrenEntry | undefined {
  return warren.entries.find((e) => e.name === name);
}

/**
 * Get the URL for a burrow from a warren entry
 */
export function getBurrowUrl(entry: WarrenEntry): string | null {
  for (const root of entry.roots) {
    if (isHttpsRoot(root)) {
      return `${root.https.base}.burrow.json`;
    }
  }
  return null;
}
