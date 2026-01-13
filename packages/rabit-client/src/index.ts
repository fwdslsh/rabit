/**
 * @fwdslsh/rabit-client - Rabit Burrow & Warren Client
 *
 * Based on Rabit Specification v0.3.0
 *
 * @see https://github.com/fwdslsh/rabit
 * @see docs/rabit-spec-v0.3.0.md
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
  isLinkEntry,
  detectTransport,
  sortByPriority,
  resolveUri,
  getParentUri,
  isValidSpecVersion,
  extractVersion,
} from './types';

// Export main client class and factory
export {
  RabitClient,
  RabitClientOptions,
  createClient,
  discover,
  fetchBurrow,
  fetchWarren,
} from './client';
