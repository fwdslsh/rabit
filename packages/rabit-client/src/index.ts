/**
 * @fwdslsh/rabit-client - Rabit Burrow & Warren Client
 *
 * Based on Rabit Specification v0.4.0
 *
 * @see https://github.com/fwdslsh/rabit
 * @see docs/rabit-spec-v0.4.0.md
 */

// Export all types
export type {
  // Core types
  SpecVersion,
  DocumentKind,
  EntryKind,
  // Entry
  Entry,
  // Agent instructions
  AgentInstructions,
  // Repository metadata
  RepoMetadata,
  // Burrow and Warren
  Burrow,
  Warren,
  BurrowReference,
  WarrenReference,
  // Discovery
  DiscoveryResult,
  DiscoverOptions,
  FetchOptions,
  // Traversal
  TraversalStrategy,
  TraversalOptions,
  TraversalEvent,
  TraversalEventType,
  TraversalSummary,
  // Transport
  TransportType,
  // Error handling
  ErrorCategory,
  RabitError,
} from './types';

// Export type guards and utilities
export {
  isBurrow,
  isWarren,
  isFileEntry,
  isDirEntry,
  isBurrowEntry,
  isMapEntry,
  isLinkEntry,
  detectTransport,
  sortByPriority,
  resolveUri,
  getParentUri,
  isValidSpecVersion,
  extractVersion,
} from './types';

// Export helper functions
export {
  findEntry,
  findEntriesByKind,
  findEntriesByTag,
  findEntriesByMediaType,
  searchEntries,
  getEntriesByPriority,
  groupEntriesByKind,
  getAllTags,
  groupByMediaType,
  getEntryPoint,
  getAgentHints,
  getAgentContext,
  listBurrows,
  findBurrow,
  findBurrowsByTag,
  getWarrenTags,
  getBurrowsByPriority,
  getRepoFiles,
  hasReadme,
  getBurrowStats,
} from './helpers';

// Export utility functions
export {
  computeRid,
  computeSha256,
  verifyContent,
  validateUrl,
  createError,
} from './utils';

// Export main client class and factory
export {
  RabitClient,
  createClient,
  discover,
  fetchBurrow,
  fetchWarren,
  RESOURCE_LIMITS,
} from './client';

export type { RabitClientOptions } from './client';
