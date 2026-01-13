/**
 * @rabit/client - Reference Implementation of Rabit Burrow Traversal (RBT)
 *
 * Full RBT Client conformance per Specification §3.2.2
 *
 * @see https://github.com/itlackey/rabit
 * @see rabit-spec-draft-2026-01-12.md
 */

// Export all types
export type {
  // Root descriptors
  GitRoot,
  HttpsRoot,
  Root,
  // Entries and pagination
  Entry,
  PaginationDescriptor,
  RelationType,
  // Agent instructions
  AgentInstructions,
  PermissionsGuidance,
  // Repository metadata
  RepoMetadata,
  // Authentication
  AuthMetadata,
  // Cache control
  CacheDirectives,
  // Git provenance
  GitProvenance,
  // Manifests
  BurrowManifest,
  WarrenRegistry,
  WarrenEntry,
  // Well-known discovery
  WellKnownBurrow,
  WellKnownWarren,
  // Error handling
  ErrorCategory,
  RbtError,
  TraversalReport,
  // Client options and results
  TraversalOptions,
  TraversalResult,
  FetchResult,
} from './types';

// Export type guards and utilities
export {
  isGitRoot,
  isHttpsRoot,
  getBaseUrl,
} from './types';

// Export main client class
export { RabitClient, createClient } from './client';

// Export helper functions
export {
  // Entry discovery
  findEntry,
  findEntriesByRel,
  findEntriesByType,
  searchEntries,
  // Agent helpers
  getEntryPoint,
  getAgentHints,
  getAgentContext,
  checkPermission,
  getIgnorePatterns,
  // Warren helpers
  listBurrows,
  findBurrow,
  findBurrowsByTag,
  getBurrowUrl,
  getAllTags,
  // Burrow metadata
  getBurrowBaseUrl,
  getRepoFiles,
  requiresAuth,
  getAuthDocumentation,
  getCacheDirectives,
  // Entry helpers
  isCollection,
  isIndex,
  hasPagination,
  getEntriesByRelation,
  groupByMediaType,
  getBurrowStats,
} from './helpers';

// Export utility functions
export {
  computeSha256,
  computeRid,
  verifyContent,
  validateUrl,
  createError,
  RESOURCE_LIMITS,
} from './utils';

// Export Git functions (for advanced use)
export {
  cloneRepository,
  readFileFromRepo,
  cleanupRepository,
  isGitAvailable,
} from './git';

// Import createClient for convenience functions
import { RabitClient, createClient } from './client';

/**
 * Default client instance for quick usage
 */
const defaultClient = createClient();

/**
 * Fetch a warren registry
 * Convenience function using default client
 */
export const fetchWarren = defaultClient.fetchWarren.bind(defaultClient);

/**
 * Fetch a burrow manifest
 * Convenience function using default client
 */
export const fetchBurrow = defaultClient.fetchBurrow.bind(defaultClient);

/**
 * Fetch an entry's content
 * Convenience function using default client
 */
export const fetchEntry = defaultClient.fetchEntry.bind(defaultClient);

/**
 * Traverse a burrow
 * Convenience function using default client
 */
export const traverseBurrow = defaultClient.traverseBurrow.bind(defaultClient);

/**
 * Discover burrow via well-known endpoint
 * Convenience function using default client
 */
export const discoverBurrow = defaultClient.discoverBurrow.bind(defaultClient);

/**
 * Discover warren via well-known endpoint
 * Convenience function using default client
 */
export const discoverWarren = defaultClient.discoverWarren.bind(defaultClient);

/**
 * Generate a traversal report
 * Convenience function using default client
 */
export const generateTraversalReport = defaultClient.generateTraversalReport.bind(defaultClient);

/**
 * Clear the manifest cache
 * Convenience function using default client
 */
export const clearCache = defaultClient.clearCache.bind(defaultClient);
