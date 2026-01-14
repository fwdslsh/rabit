/**
 * Warren Browser Types
 * Simplified types for browser-based warren/burrow navigation
 */

export type DocumentKind = 'burrow' | 'warren';
export type EntryKind = 'file' | 'dir' | 'burrow' | 'map' | 'link';

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
  tags?: string[];
  priority?: number;
}

export interface AgentInstructions {
  context?: string;
  entryPoint?: string;
  hints?: string[];
}

export interface Burrow {
  specVersion: string;
  kind: 'burrow';
  title?: string;
  description?: string;
  updated?: string;
  baseUri?: string;
  agents?: AgentInstructions;
  entries: Entry[];
}

export interface BurrowReference {
  id: string;
  uri: string;
  title?: string;
  description?: string;
  tags?: string[];
  priority?: number;
}

export interface WarrenReference {
  id: string;
  uri: string;
  title?: string;
  description?: string;
}

export interface Warren {
  specVersion: string;
  kind: 'warren';
  title?: string;
  description?: string;
  updated?: string;
  baseUri?: string;
  burrows?: BurrowReference[];
  warrens?: WarrenReference[];
}

export interface NavigationItem {
  type: 'warren' | 'burrow' | 'entry';
  uri: string;
  title: string;
  data: Warren | Burrow | Entry;
}

export interface BreadcrumbItem {
  uri: string;
  title: string;
  type: 'warren' | 'burrow';
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface FetchResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
