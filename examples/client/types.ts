/**
 * Rabit Burrow & Warren Types (Example Client)
 * Based on Rabit Specification v0.3.0
 */

// Custom metadata for extensibility
export type Metadata = Record<string, unknown>;

// Entry kind
export type EntryKind = 'file' | 'dir' | 'burrow' | 'link';

// Entry in a burrow
export interface Entry {
  id: string;
  kind: EntryKind;
  uri: string;
  title?: string;
  summary?: string;
  path?: string;
  mediaType?: string;
  sizeBytes?: number;
  modified?: string;
  sha256?: string;
  tags?: string[];
  priority?: number;
  metadata?: Metadata;
}

// Agent instructions (allows additional properties)
export interface AgentInstructions {
  context?: string;
  entryPoint?: string;
  hints?: string[];
  [key: string]: string | string[] | undefined;
}

// Repository metadata (allows additional properties)
export interface RepoMetadata {
  readme?: string;
  license?: string;
  contributing?: string;
  changelog?: string;
  [key: string]: string | undefined;
}

// Burrow (.burrow.json)
export interface Burrow {
  $schema?: string;
  specVersion: string;
  kind: 'burrow';
  title?: string;
  description?: string;
  updated?: string;
  baseUri?: string;
  repo?: RepoMetadata;
  agents?: AgentInstructions;
  entries: Entry[];
  metadata?: Metadata;
  /** @deprecated Use metadata instead */
  extensions?: Metadata;
}

// Burrow reference in warren
export interface BurrowReference {
  id: string;
  uri: string;
  title?: string;
  description?: string;
  tags?: string[];
  priority?: number;
  metadata?: Metadata;
}

// Warren reference (federation)
export interface WarrenReference {
  id: string;
  uri: string;
  title?: string;
  description?: string;
  metadata?: Metadata;
}

// Warren (.warren.json)
export interface Warren {
  $schema?: string;
  specVersion: string;
  kind: 'warren';
  title?: string;
  description?: string;
  updated?: string;
  baseUri?: string;
  burrows?: BurrowReference[];
  warrens?: WarrenReference[];
  metadata?: Metadata;
  /** @deprecated Use metadata instead */
  extensions?: Metadata;
}

// Type guards
export function isBurrow(doc: Burrow | Warren): doc is Burrow {
  return doc.kind === 'burrow';
}

export function isWarren(doc: Burrow | Warren): doc is Warren {
  return doc.kind === 'warren';
}

// Helper to resolve URI against base
export function resolveUri(base: string | undefined, relative: string): string {
  if (!base) return relative;
  if (relative.startsWith('http://') || relative.startsWith('https://') || relative.startsWith('file://')) {
    return relative;
  }
  const baseWithSlash = base.endsWith('/') ? base : base + '/';
  return baseWithSlash + relative;
}

// Sort entries by priority
export function sortByPriority(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    const priorityA = a.priority ?? 0;
    const priorityB = b.priority ?? 0;
    return priorityB - priorityA;
  });
}
