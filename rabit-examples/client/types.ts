/**
 * Rabit Burrow Traversal (RBT) Types
 * Based on draft-rabit-rbt-02
 */

// Root descriptors
export interface GitRoot {
  git: {
    remote: string;
    ref: string;
    path?: string;
  };
}

export interface HttpsRoot {
  https: {
    base: string;
    auth?: 'mtls' | 'bearer';
  };
}

export type Root = GitRoot | HttpsRoot;

// Entry in a burrow manifest
export interface Entry {
  id: string;
  rid: string;
  href: string;
  type: string;
  rel: string[];
  title?: string;
  summary?: string;
  hash?: string;
  size?: number;
  modified?: string;
  lang?: string;
  links?: string[];
  children?: {
    href: string;
    offset: number;
    limit: number;
    total?: number;
  };
}

// Agent instructions
export interface AgentInstructions {
  context?: string;
  entryPoint?: string;
  hints?: string[];
  ignore?: string[];
  permissions?: Record<string, unknown>;
}

// Repository metadata
export interface RepoMetadata {
  readme?: string;
  license?: string;
  contributing?: string;
  changelog?: string;
  security?: string;
}

// Burrow manifest (.burrow.json)
export interface BurrowManifest {
  rbt: string;
  $schema?: string;
  manifest: {
    title: string;
    description?: string;
    updated: string;
    rid: string;
    roots: Root[];
    mirrors?: Root[];
    repo?: RepoMetadata;
    agents?: AgentInstructions;
    auth?: {
      required?: boolean;
      documentation?: string;
    };
    cache?: {
      maxAge?: number;
      staleWhileRevalidate?: number;
    };
  };
  entries: Entry[];
}

// Warren entry
export interface WarrenEntry {
  name: string;
  title: string;
  summary: string;
  roots: Root[];
  rid?: string;
  tags?: string[];
  updated?: string;
}

// Warren registry (.warren.json)
export interface WarrenRegistry {
  rbt: string;
  $schema?: string;
  registry: {
    title: string;
    description?: string;
    updated: string;
    rid?: string;
  };
  entries: WarrenEntry[];
}

// Helper type guards
export function isGitRoot(root: Root): root is GitRoot {
  return 'git' in root;
}

export function isHttpsRoot(root: Root): root is HttpsRoot {
  return 'https' in root;
}

// Get base URL from a root
export function getBaseUrl(root: Root): string | null {
  if (isHttpsRoot(root)) {
    return root.https.base;
  }
  // For Git roots, we'd need to clone or use a Git hosting API
  // This POC only supports HTTPS roots
  return null;
}
