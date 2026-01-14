/**
 * Warren Browser Client
 * Lightweight browser-based client for fetching warren and burrow data
 */

import type { Warren, Burrow, Entry, FetchResult } from './types';

const DEFAULT_TIMEOUT = 30000;

/**
 * Normalize a URL - handles relative paths and adds https:// when needed
 */
export function normalizeUrl(url: string): string {
  let normalized = url.trim();

  // Handle relative URLs (starting with /)
  if (normalized.startsWith('/')) {
    // Use current origin for relative URLs
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${normalized}`;
    }
    return normalized;
  }

  // Add https:// if no protocol
  if (!normalized.match(/^https?:\/\//)) {
    normalized = `https://${normalized}`;
  }

  return normalized;
}

/**
 * Resolve a relative URI against a base URI
 */
export function resolveUri(base: string | undefined, relative: string): string {
  if (!base) return relative;
  if (relative.startsWith('http://') || relative.startsWith('https://')) {
    return relative;
  }

  try {
    return new URL(relative, base).href;
  } catch {
    const baseWithSlash = base.endsWith('/') ? base : base + '/';
    return baseWithSlash + relative;
  }
}

/**
 * Get the base directory of a URL
 */
function getBaseDir(url: string): string {
  const lastSlash = url.lastIndexOf('/');
  if (lastSlash === -1) return url;
  return url.slice(0, lastSlash + 1);
}

/**
 * Fetch JSON from a URL with error handling
 */
async function fetchJson<T>(url: string): Promise<FetchResult<T>> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { ok: false, error: `Not found: ${url}` };
      }
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Fetch text content from a URL
 */
export async function fetchContent(url: string): Promise<FetchResult<string>> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT)
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { ok: false, error: `Not found: ${url}` };
      }
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const text = await response.text();
    return { ok: true, data: text };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

/**
 * Try to fetch a warren from a base URL
 */
export async function fetchWarren(baseUrl: string): Promise<FetchResult<Warren & { sourceUri: string }>> {
  const normalized = normalizeUrl(baseUrl);
  const base = normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;

  // Discovery candidates
  const candidates = [
    `${base}/.warren.json`,
    `${base}/warren.json`,
    `${base}/.well-known/warren.json`
  ];

  // If URL already ends with warren.json, try it directly
  if (normalized.endsWith('.warren.json') || normalized.endsWith('warren.json')) {
    candidates.unshift(normalized);
  }

  for (const candidate of candidates) {
    const result = await fetchJson<Warren>(candidate);
    if (result.ok && result.data) {
      // Validate it's a warren
      if (result.data.kind === 'warren' && result.data.specVersion) {
        // Set baseUri if not present
        if (!result.data.baseUri) {
          result.data.baseUri = getBaseDir(candidate);
        }
        return { ok: true, data: { ...result.data, sourceUri: candidate } };
      }
    }
  }

  return { ok: false, error: `No warren found at ${baseUrl}` };
}

/**
 * Try to fetch a burrow from a base URL
 */
export async function fetchBurrow(baseUrl: string): Promise<FetchResult<Burrow & { sourceUri: string }>> {
  const normalized = normalizeUrl(baseUrl);
  const base = normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;

  // Discovery candidates
  const candidates = [
    `${base}/.burrow.json`,
    `${base}/burrow.json`,
    `${base}/.well-known/burrow.json`
  ];

  // If URL already ends with burrow.json, try it directly
  if (normalized.endsWith('.burrow.json') || normalized.endsWith('burrow.json')) {
    candidates.unshift(normalized);
  }

  for (const candidate of candidates) {
    const result = await fetchJson<Burrow>(candidate);
    if (result.ok && result.data) {
      // Validate it's a burrow
      if (result.data.kind === 'burrow' && result.data.specVersion && result.data.entries) {
        // Set baseUri if not present
        if (!result.data.baseUri) {
          result.data.baseUri = getBaseDir(candidate);
        }
        return { ok: true, data: { ...result.data, sourceUri: candidate } };
      }
    }
  }

  return { ok: false, error: `No burrow found at ${baseUrl}` };
}

/**
 * Discover warren or burrow at a location
 */
export async function discover(url: string): Promise<FetchResult<{ warren?: Warren & { sourceUri: string }; burrow?: Burrow & { sourceUri: string } }>> {
  const [warrenResult, burrowResult] = await Promise.all([
    fetchWarren(url),
    fetchBurrow(url)
  ]);

  if (!warrenResult.ok && !burrowResult.ok) {
    return { ok: false, error: `No warren or burrow found at ${url}` };
  }

  return {
    ok: true,
    data: {
      warren: warrenResult.ok ? warrenResult.data : undefined,
      burrow: burrowResult.ok ? burrowResult.data : undefined
    }
  };
}

/**
 * Fetch entry content and determine how to display it
 */
export async function fetchEntryContent(
  burrow: Burrow,
  entry: Entry
): Promise<FetchResult<{ content: string; mediaType: string }>> {
  const uri = resolveUri(burrow.baseUri, entry.uri);

  const result = await fetchContent(uri);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const mediaType = entry.mediaType || guessMediaType(entry.uri);

  return {
    ok: true,
    data: {
      content: result.data!,
      mediaType
    }
  };
}

/**
 * Guess media type from file extension
 */
function guessMediaType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase() || '';

  const mediaTypes: Record<string, string> = {
    'md': 'text/markdown',
    'markdown': 'text/markdown',
    'txt': 'text/plain',
    'json': 'application/json',
    'js': 'text/javascript',
    'ts': 'text/typescript',
    'html': 'text/html',
    'css': 'text/css',
    'xml': 'application/xml',
    'yaml': 'application/yaml',
    'yml': 'application/yaml',
    'py': 'text/x-python',
    'rs': 'text/x-rust',
    'go': 'text/x-go',
    'java': 'text/x-java',
    'c': 'text/x-c',
    'cpp': 'text/x-c++',
    'h': 'text/x-c',
    'sh': 'text/x-sh',
    'bash': 'text/x-sh',
    'svg': 'image/svg+xml',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp'
  };

  return mediaTypes[ext] || 'text/plain';
}

/**
 * Sort entries by priority (descending)
 */
export function sortByPriority<T extends { priority?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

/**
 * Get icon for entry kind
 */
export function getEntryIcon(kind: Entry['kind']): string {
  switch (kind) {
    case 'file': return '📄';
    case 'dir': return '📁';
    case 'burrow': return '🐰';
    case 'map': return '🗺️';
    case 'link': return '🔗';
    default: return '📄';
  }
}

/**
 * Format file size for display
 */
export function formatSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '';

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}
