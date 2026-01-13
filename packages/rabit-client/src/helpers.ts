/**
 * Rabit Client Helpers
 * Based on Rabit Specification v0.3.0
 */

import type { Burrow, Warren, Entry, BurrowReference } from './types';
import { sortByPriority } from './types';

// ============================================================================
// Entry Helpers
// ============================================================================

/**
 * Find an entry by ID
 */
export function findEntry(burrow: Burrow, id: string): Entry | undefined {
  return burrow.entries.find((e) => e.id === id);
}

/**
 * Find entries by kind
 */
export function findEntriesByKind(burrow: Burrow, kind: Entry['kind']): Entry[] {
  return burrow.entries.filter((e) => e.kind === kind);
}

/**
 * Find entries by tag
 */
export function findEntriesByTag(burrow: Burrow, tag: string): Entry[] {
  return burrow.entries.filter((e) => e.tags?.includes(tag));
}

/**
 * Find entries by media type
 */
export function findEntriesByMediaType(burrow: Burrow, mediaType: string): Entry[] {
  return burrow.entries.filter((e) => e.mediaType === mediaType);
}

/**
 * Search entries by title or summary
 */
export function searchEntries(burrow: Burrow, query: string): Entry[] {
  const lowerQuery = query.toLowerCase();
  return burrow.entries.filter(
    (e) =>
      e.title?.toLowerCase().includes(lowerQuery) ||
      e.summary?.toLowerCase().includes(lowerQuery) ||
      e.id.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get entries sorted by priority
 */
export function getEntriesByPriority(burrow: Burrow): Entry[] {
  return sortByPriority(burrow.entries);
}

/**
 * Group entries by kind
 */
export function groupEntriesByKind(burrow: Burrow): Record<Entry['kind'], Entry[]> {
  return {
    file: findEntriesByKind(burrow, 'file'),
    dir: findEntriesByKind(burrow, 'dir'),
    burrow: findEntriesByKind(burrow, 'burrow'),
    link: findEntriesByKind(burrow, 'link'),
  };
}

/**
 * Get all unique tags from a burrow
 */
export function getAllTags(burrow: Burrow): string[] {
  const tags = new Set<string>();
  for (const entry of burrow.entries) {
    if (entry.tags) {
      for (const tag of entry.tags) {
        tags.add(tag);
      }
    }
  }
  return Array.from(tags).sort();
}

/**
 * Group entries by media type
 */
export function groupByMediaType(burrow: Burrow): Map<string, Entry[]> {
  const groups = new Map<string, Entry[]>();

  for (const entry of burrow.entries) {
    if (entry.mediaType) {
      const existing = groups.get(entry.mediaType) ?? [];
      existing.push(entry);
      groups.set(entry.mediaType, existing);
    }
  }

  return groups;
}

// ============================================================================
// Agent Helpers
// ============================================================================

/**
 * Get the suggested entry point
 */
export function getEntryPoint(burrow: Burrow): Entry | undefined {
  const entryPointId = burrow.agents?.entryPoint;
  if (entryPointId) {
    return findEntry(burrow, entryPointId);
  }
  // Fall back to first entry with highest priority
  const sorted = getEntriesByPriority(burrow);
  return sorted[0];
}

/**
 * Get agent hints
 */
export function getAgentHints(burrow: Burrow): string[] {
  return burrow.agents?.hints ?? [];
}

/**
 * Get agent context
 */
export function getAgentContext(burrow: Burrow): string | undefined {
  return burrow.agents?.context;
}

// ============================================================================
// Warren Helpers
// ============================================================================

/**
 * List all burrows in a warren
 */
export function listBurrows(warren: Warren): BurrowReference[] {
  return warren.burrows ?? [];
}

/**
 * Find a burrow by ID
 */
export function findBurrow(warren: Warren, id: string): BurrowReference | undefined {
  return warren.burrows?.find((b) => b.id === id);
}

/**
 * Find burrows by tag
 */
export function findBurrowsByTag(warren: Warren, tag: string): BurrowReference[] {
  return warren.burrows?.filter((b) => b.tags?.includes(tag)) ?? [];
}

/**
 * Get all unique tags from a warren
 */
export function getWarrenTags(warren: Warren): string[] {
  const tags = new Set<string>();
  for (const burrow of warren.burrows ?? []) {
    if (burrow.tags) {
      for (const tag of burrow.tags) {
        tags.add(tag);
      }
    }
  }
  return Array.from(tags).sort();
}

/**
 * Get burrows sorted by priority
 */
export function getBurrowsByPriority(warren: Warren): BurrowReference[] {
  return [...(warren.burrows ?? [])].sort((a, b) => {
    const priorityA = a.priority ?? 0;
    const priorityB = b.priority ?? 0;
    return priorityB - priorityA;
  });
}

// ============================================================================
// Repo Helpers
// ============================================================================

/**
 * Get repo file paths
 */
export function getRepoFiles(burrow: Burrow): {
  readme?: string;
  license?: string;
  contributing?: string;
  changelog?: string;
} {
  return burrow.repo ?? {};
}

/**
 * Check if burrow has a readme
 */
export function hasReadme(burrow: Burrow): boolean {
  return !!burrow.repo?.readme;
}

// ============================================================================
// Stats Helpers
// ============================================================================

/**
 * Get burrow statistics
 */
export function getBurrowStats(burrow: Burrow): {
  totalEntries: number;
  fileCount: number;
  dirCount: number;
  burrowCount: number;
  linkCount: number;
  tagCount: number;
  totalSizeBytes: number;
} {
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
    totalSizeBytes: totalSize,
  };
}
