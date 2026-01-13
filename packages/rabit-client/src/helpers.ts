/**
 * Helper functions for working with burrows and warrens
 */

import type {
  BurrowManifest,
  WarrenRegistry,
  Entry,
  WarrenEntry,
  Root,
} from './types';
import { isHttpsRoot, getBaseUrl } from './types';

// ============================================================================
// Entry Discovery
// ============================================================================

/**
 * Find an entry by ID in a burrow
 */
export function findEntry(burrow: BurrowManifest, id: string): Entry | undefined {
  return burrow.entries.find((e) => e.id === id);
}

/**
 * Find entries by relation type
 * @see Specification §6.5
 */
export function findEntriesByRel(burrow: BurrowManifest, rel: string): Entry[] {
  return burrow.entries.filter((e) => e.rel.includes(rel));
}

/**
 * Find entries by media type
 */
export function findEntriesByType(burrow: BurrowManifest, type: string): Entry[] {
  return burrow.entries.filter((e) => e.type === type);
}

/**
 * Search entries by text (title, summary, id)
 */
export function searchEntries(burrow: BurrowManifest, query: string): Entry[] {
  const queryLower = query.toLowerCase();
  return burrow.entries.filter((entry) => {
    const title = entry.title?.toLowerCase() || '';
    const summary = entry.summary?.toLowerCase() || '';
    const id = entry.id.toLowerCase();
    return (
      title.includes(queryLower) ||
      summary.includes(queryLower) ||
      id.includes(queryLower)
    );
  });
}

// ============================================================================
// Agent Helpers
// ============================================================================

/**
 * Get the entry point for a burrow (for agents)
 * @see Specification §13.4
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
 * @see Specification §13.4
 */
export function getAgentHints(burrow: BurrowManifest): string[] {
  return burrow.manifest.agents?.hints ?? [];
}

/**
 * Get agent context for a burrow
 * @see Specification §13.4
 */
export function getAgentContext(burrow: BurrowManifest): string | undefined {
  return burrow.manifest.agents?.context;
}

/**
 * Check if a burrow allows a specific permission
 * @see Specification §13.5
 */
export function checkPermission(
  burrow: BurrowManifest,
  permission: string
): unknown {
  return burrow.manifest.agents?.permissions?.[permission];
}

/**
 * Get patterns to ignore (for agents)
 * @see Specification §13.4
 */
export function getIgnorePatterns(burrow: BurrowManifest): string[] {
  return burrow.manifest.agents?.ignore ?? [];
}

// ============================================================================
// Warren Helpers
// ============================================================================

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
 * Find burrows in a warren by tag
 */
export function findBurrowsByTag(warren: WarrenRegistry, tag: string): WarrenEntry[] {
  return warren.entries.filter((e) => e.tags?.includes(tag));
}

/**
 * Get the URL for a burrow manifest from a warren entry
 */
export function getBurrowUrl(entry: WarrenEntry): string | null {
  for (const root of entry.roots) {
    if (isHttpsRoot(root)) {
      return `${root.https.base}.burrow.json`;
    }
  }
  return null;
}

/**
 * Get all tags from a warren
 */
export function getAllTags(warren: WarrenRegistry): string[] {
  const tags = new Set<string>();
  for (const entry of warren.entries) {
    if (entry.tags) {
      for (const tag of entry.tags) {
        tags.add(tag);
      }
    }
  }
  return Array.from(tags).sort();
}

// ============================================================================
// Burrow Metadata
// ============================================================================

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
 * Get repository file paths from manifest metadata
 * @see Specification §13.3
 */
export function getRepoFiles(burrow: BurrowManifest): Partial<Record<string, string>> {
  return (burrow.manifest.repo ?? {}) as Partial<Record<string, string>>;
}

/**
 * Check if burrow requires authentication
 * @see Specification §14
 */
export function requiresAuth(burrow: BurrowManifest): boolean {
  return burrow.manifest.auth?.required ?? false;
}

/**
 * Get authentication documentation URL
 * @see Specification §14
 */
export function getAuthDocumentation(burrow: BurrowManifest): string | undefined {
  return burrow.manifest.auth?.documentation;
}

/**
 * Get cache directives from manifest
 * @see Specification §8.5
 */
export function getCacheDirectives(burrow: BurrowManifest): {
  maxAge: number;
  staleWhileRevalidate: number;
} {
  return {
    maxAge: burrow.manifest.cache?.maxAge ?? 3600,
    staleWhileRevalidate: burrow.manifest.cache?.staleWhileRevalidate ?? 86400,
  };
}

// ============================================================================
// Entry Helpers
// ============================================================================

/**
 * Check if entry is a collection
 */
export function isCollection(entry: Entry): boolean {
  return entry.rel.includes('collection');
}

/**
 * Check if entry is an index
 */
export function isIndex(entry: Entry): boolean {
  return entry.rel.includes('index');
}

/**
 * Check if entry has pagination
 */
export function hasPagination(entry: Entry): boolean {
  return entry.children !== undefined;
}

/**
 * Get all entries of a specific relation type
 */
export function getEntriesByRelation(
  burrow: BurrowManifest,
  ...relations: string[]
): Map<string, Entry[]> {
  const result = new Map<string, Entry[]>();

  for (const relation of relations) {
    result.set(relation, findEntriesByRel(burrow, relation));
  }

  return result;
}

/**
 * Group entries by media type
 */
export function groupByMediaType(burrow: BurrowManifest): Map<string, Entry[]> {
  const groups = new Map<string, Entry[]>();

  for (const entry of burrow.entries) {
    const existing = groups.get(entry.type) ?? [];
    existing.push(entry);
    groups.set(entry.type, existing);
  }

  return groups;
}

/**
 * Get statistics about a burrow
 */
export function getBurrowStats(burrow: BurrowManifest): {
  totalEntries: number;
  byRelation: Map<string, number>;
  byMediaType: Map<string, number>;
  withPagination: number;
  totalSize: number;
} {
  const byRelation = new Map<string, number>();
  const byMediaType = new Map<string, number>();
  let withPagination = 0;
  let totalSize = 0;

  for (const entry of burrow.entries) {
    // Count relations
    for (const rel of entry.rel) {
      byRelation.set(rel, (byRelation.get(rel) ?? 0) + 1);
    }

    // Count media types
    byMediaType.set(entry.type, (byMediaType.get(entry.type) ?? 0) + 1);

    // Count pagination
    if (entry.children) {
      withPagination++;
    }

    // Sum sizes
    if (entry.size) {
      totalSize += entry.size;
    }
  }

  return {
    totalEntries: burrow.entries.length,
    byRelation,
    byMediaType,
    withPagination,
    totalSize,
  };
}
