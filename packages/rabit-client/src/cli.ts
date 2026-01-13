#!/usr/bin/env bun
/**
 * Rabit CLI - Universal Burrow Browser
 *
 * Implementation of CLIENT_SPEC.md v0.4.0
 *
 * Commands:
 *   discover <uri>                            - Discover burrows at a location
 *   list <uri> [options]                      - List entries in a burrow
 *   fetch <uri> <entry-id> [options]          - Fetch a specific entry
 *   traverse <uri> [options]                  - Traverse all entries
 *   validate <file>                           - Validate a manifest file
 *   map <dir> [options]                       - Generate burrow from directory
 */

import {
  createClient,
  type Entry,
  type Burrow,
  type Warren,
} from './index';
import { resolveUri } from './types';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(msg: string) {
  console.log(msg);
}

function error(msg: string) {
  console.error(`${colors.red}Error:${colors.reset} ${msg}`);
}

function success(msg: string) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function warning(msg: string) {
  console.log(`${colors.yellow}⚠${colors.reset} ${msg}`);
}

function header(msg: string) {
  console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}`);
}

function label(name: string, value: string) {
  console.log(`  ${colors.dim}${name}:${colors.reset} ${value}`);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// Create client instance
const client = createClient();

// ============================================================================
// Commands
// ============================================================================

async function cmdDiscover(uri: string) {
  header(`Discovering burrows at: ${uri}`);

  const result = await client.discover(uri);

  if (result.depth === -1) {
    error('No burrow or warren found');
    process.exit(1);
  }

  success(`Found at depth ${result.depth}`);
  label('Base URI', result.baseUri);

  if (result.warren) {
    header('Warren Found:');
    label('Title', result.warren.title || '(untitled)');
    if (result.warren.description) {
      label('Description', result.warren.description);
    }
    label('Spec Version', result.warren.specVersion);
    label('Burrows', (result.warren.burrows?.length || 0).toString());

    if (result.warren.burrows && result.warren.burrows.length > 0) {
      log('\n  Burrows:');
      for (const ref of result.warren.burrows) {
        log(`    • ${colors.bold}${ref.id}${colors.reset}: ${ref.title || '(untitled)'}`);
        log(`      ${colors.dim}${ref.uri}${colors.reset}`);
      }
    }
  }

  if (result.burrow) {
    header('Burrow Found:');
    label('Title', result.burrow.title || '(untitled)');
    if (result.burrow.description) {
      label('Description', result.burrow.description);
    }
    label('Spec Version', result.burrow.specVersion);
    label('Entries', result.burrow.entries.length.toString());
  }
  log('');
}

async function cmdList(uri: string, options: {
  maxDepth?: number;
  kind?: string;
  format?: 'json' | 'table' | 'tree';
}) {
  const result = await client.fetchBurrowWithDiscovery(uri);

  if (!result.ok || !result.data) {
    error(result.error?.message || 'Failed to fetch burrow');
    process.exit(1);
  }

  const burrow = result.data;
  const maxDepth = options.maxDepth ?? 1;

  // Format output
  const format = options.format || (process.stdout.isTTY ? 'table' : 'json');

  if (maxDepth === 1) {
    // Flat listing (original behavior)
    let entries = burrow.entries;

    // Apply kind filter
    if (options.kind) {
      entries = entries.filter(e => e.kind === options.kind);
    }

    if (format === 'json') {
      console.log(JSON.stringify(entries, null, 2));
    } else if (format === 'table') {
      header(`Entries in ${burrow.title || uri}`);
      log('');

      for (const entry of entries) {
        const kindIcon = {
          file: '📄',
          dir: '📁',
          burrow: '🐰',
          map: '🗺️',
          link: '🔗',
        }[entry.kind];

        log(`${kindIcon} ${colors.bold}${entry.title || entry.id}${colors.reset}`);
        log(`   ${colors.dim}ID:${colors.reset} ${entry.id}`);
        log(`   ${colors.dim}URI:${colors.reset} ${entry.uri}`);
        if (entry.mediaType) {
          log(`   ${colors.dim}Type:${colors.reset} ${entry.mediaType}`);
        }
        if (entry.sizeBytes) {
          log(`   ${colors.dim}Size:${colors.reset} ${formatBytes(entry.sizeBytes)}`);
        }
        if (entry.summary) {
          log(`   ${colors.dim}${entry.summary}${colors.reset}`);
        }
        log('');
      }
    } else if (format === 'tree') {
      log(burrow.title || uri);

      // Build tree structure from URIs - group by directory level
      const tree = buildFileTree(entries);
      const sortedKeys = Array.from(tree.keys()).sort();

      // Group entries by their top-level directory
      const rootEntries: string[] = [];
      const dirMap = new Map<string, string[]>();

      for (const key of sortedKeys) {
        if (key.endsWith('/')) {
          // It's a directory node - add to dirMap as a key
          if (!dirMap.has(key)) {
            dirMap.set(key, []);
          }
        } else if (!key.includes('/')) {
          // Top-level file
          rootEntries.push(key);
        } else {
          // File within a directory - group by top-level directory
          const topDir = key.split('/')[0] + '/';
          if (!dirMap.has(topDir)) {
            dirMap.set(topDir, []);
          }
          dirMap.get(topDir)!.push(key);
        }
      }

      // Display top-level entries and directories
      const allTopLevel = [...rootEntries];
      for (const dir of dirMap.keys()) {
        allTopLevel.push(dir);
      }
      allTopLevel.sort();

      for (let i = 0; i < allTopLevel.length; i++) {
        const item = allTopLevel[i];
        const isLastTopLevel = i === allTopLevel.length - 1;
        const connector = isLastTopLevel ? '└── ' : '├── ';

        if (item.endsWith('/')) {
          // It's a directory, show it
          log(`${connector}${item}`);

          // Show files in this directory
          const dirContents = dirMap.get(item) || [];
          const dirContents2: string[] = [];
          for (const content of dirContents) {
            if (!content.includes('/', item.length)) {
              // Direct child of this directory
              dirContents2.push(content);
            }
          }
          dirContents2.sort();

          for (let j = 0; j < dirContents2.length; j++) {
            const file = dirContents2[j];
            const isLastFile = j === dirContents2.length - 1;
            const fileConnector = isLastFile ? '└── ' : '├── ';
            const filePrefix = isLastTopLevel ? '    ' : '│   ';
            const fileName = file.substring(item.length);
            log(`${filePrefix}${fileConnector}${fileName}`);
          }
        } else {
          // It's a file
          log(`${connector}${item}`);
        }
      }
    }
  } else {
    // Recursive listing
    if (format === 'json') {
      // For JSON, collect all entries recursively with nesting
      const nestedEntries = await collectEntriesNested(burrow, 0, maxDepth, options.kind);
      console.log(JSON.stringify(nestedEntries, null, 2));
    } else {
      // For table and tree formats, display recursively
      header(`Entries in ${burrow.title || uri} (max-depth: ${maxDepth})`);
      log('');
      await displayEntriesRecursive(burrow, 0, maxDepth, options.kind, '', format === 'tree');
    }
  }
}

async function collectEntriesNested(
  burrow: Burrow,
  currentDepth: number,
  maxDepth: number,
  kindFilter: string | undefined
): Promise<any[]> {
  let entries = burrow.entries;
  if (kindFilter) {
    entries = entries.filter(e => e.kind === kindFilter);
  }

  const result: any[] = [];

  for (const entry of entries) {
    const entryWithChildren: any = { ...entry };

    // Recurse into burrows/dirs if we haven't reached max depth
    if (currentDepth < maxDepth - 1 && (entry.kind === 'burrow' || entry.kind === 'dir')) {
      const childUri = resolveUri(burrow.baseUri, entry.uri);
      const childResult = await client.fetchBurrowWithDiscovery(childUri);
      if (childResult.ok && childResult.data) {
        entryWithChildren.children = await collectEntriesNested(
          childResult.data,
          currentDepth + 1,
          maxDepth,
          kindFilter
        );
      }
    }

    result.push(entryWithChildren);
  }

  return result;
}

// Helper to build a tree structure from flat URIs
function buildFileTree(entries: Entry[]): Map<string, any> {
  const tree = new Map<string, any>();

  for (const entry of entries) {
    const parts = entry.uri.split('/').filter(p => p);

    if (parts.length === 1) {
      // Top-level entry
      tree.set(entry.uri, { ...entry, isLeaf: true });
    } else {
      // Nested entry - build directory structure
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;

        if (!currentPath) {
          currentPath = part;
        } else {
          currentPath += '/' + part;
        }

        if (isLast) {
          // Leaf node (file)
          tree.set(currentPath, { ...entry, isLeaf: true });
        } else {
          // Directory node
          const dirKey = currentPath + '/';
          if (!tree.has(dirKey)) {
            tree.set(dirKey, {
              id: part,
              kind: 'dir',
              uri: dirKey,
              title: part,
              isDir: true,
              children: [],
            });
          }
        }
      }
    }
  }

  return tree;
}

async function displayTreeNode(
  entries: Entry[],
  prefix: string,
  isLast: boolean[] = []
): Promise<void> {
  const tree = buildFileTree(entries);
  const sortedKeys = Array.from(tree.keys()).sort();

  for (let i = 0; i < sortedKeys.length; i++) {
    const key = sortedKeys[i];
    const node = tree.get(key)!;
    const isLastNode = i === sortedKeys.length - 1;

    const connector = isLastNode ? '└── ' : '├── ';
    const newPrefix = prefix + (isLastNode ? '    ' : '│   ');

    log(`${prefix}${connector}${key}`);
  }
}

async function displayEntriesRecursive(
  burrow: Burrow,
  currentDepth: number,
  maxDepth: number,
  kindFilter: string | undefined,
  prefix: string,
  isTree: boolean,
  currentPath: string = '',
  visitedUris: Set<string> = new Set()
) {
  let entries = burrow.entries;
  if (kindFilter) {
    entries = entries.filter(e => e.kind === kindFilter);
  }

  if (isTree) {
    // Build and display tree structure from URIs - group by directory level
    const tree = buildFileTree(entries);
    const sortedKeys = Array.from(tree.keys()).sort();

    // Group entries by their top-level directory
    const rootEntries: string[] = [];
    const dirMap = new Map<string, string[]>();

    for (const key of sortedKeys) {
      if (key.endsWith('/')) {
        // It's a directory node - add to dirMap as a key
        if (!dirMap.has(key)) {
          dirMap.set(key, []);
        }
      } else if (!key.includes('/')) {
        // Top-level file
        rootEntries.push(key);
      } else {
        // File within a directory - group by top-level directory
        const topDir = key.split('/')[0] + '/';
        if (!dirMap.has(topDir)) {
          dirMap.set(topDir, []);
        }
        dirMap.get(topDir)!.push(key);
      }
    }

    // Display top-level entries and directories
    const allTopLevel = [...rootEntries];
    for (const dir of dirMap.keys()) {
      allTopLevel.push(dir);
    }
    allTopLevel.sort();

    for (let i = 0; i < allTopLevel.length; i++) {
      const item = allTopLevel[i];
      const isLastTopLevel = i === allTopLevel.length - 1;
      const connector = isLastTopLevel ? '└── ' : '├── ';

      if (item.endsWith('/')) {
        log(`${prefix}${connector}${item}`);

        const dirContents = dirMap.get(item) || [];
        const dirContents2: string[] = [];
        for (const content of dirContents) {
          if (!content.includes('/', item.length)) {
            dirContents2.push(content);
          }
        }
        dirContents2.sort();

        for (let j = 0; j < dirContents2.length; j++) {
          const file = dirContents2[j];
          const isLastFile = j === dirContents2.length - 1;
          const fileConnector = isLastFile ? '└── ' : '├── ';
          const filePrefix = isLastTopLevel ? '    ' : '│   ';
          const fileName = file.substring(item.length);
          log(`${prefix}${filePrefix}${fileConnector}${fileName}`);
        }
      } else {
        log(`${prefix}${connector}${item}`);
      }
    }
  } else {
    // Table format - show detailed info
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      const kindIcon = {
        file: '📄',
        dir: '📁',
        burrow: '🐰',
        map: '🗺️',
        link: '🔗',
      }[entry.kind];

      const indent = '  '.repeat(currentDepth);
      log(`${indent}${kindIcon} ${colors.bold}${entry.title || entry.id}${colors.reset}`);
      log(`${indent}   ${colors.dim}ID:${colors.reset} ${entry.id}`);
      log(`${indent}   ${colors.dim}URI:${colors.reset} ${entry.uri}`);
      if (entry.mediaType) {
        log(`${indent}   ${colors.dim}Type:${colors.reset} ${entry.mediaType}`);
      }
      if (entry.sizeBytes) {
        log(`${indent}   ${colors.dim}Size:${colors.reset} ${formatBytes(entry.sizeBytes)}`);
      }
      if (entry.summary) {
        log(`${indent}   ${colors.dim}${entry.summary}${colors.reset}`);
      }
      log('');

      // Recurse into burrows/dirs with cycle detection
      if (currentDepth < maxDepth - 1 && (entry.kind === 'burrow' || entry.kind === 'dir')) {
        const childUri = resolveUri(burrow.baseUri, entry.uri);

        // Check if we've already visited this URI to prevent infinite loops
        if (!visitedUris.has(childUri)) {
          const newVisitedUris = new Set(visitedUris);
          newVisitedUris.add(childUri);

          const childResult = await client.fetchBurrowWithDiscovery(childUri);
          if (childResult.ok && childResult.data) {
            await displayEntriesRecursive(
              childResult.data,
              currentDepth + 1,
              maxDepth,
              kindFilter,
              '',
              isTree,
              '',
              newVisitedUris
            );
          }
        }
      }
    }
  }
}

async function cmdFetch(uri: string, entryId: string, options: {
  output?: string;
}) {
  const burrowResult = await client.fetchBurrowWithDiscovery(uri);

  if (!burrowResult.ok || !burrowResult.data) {
    error(burrowResult.error?.message || 'Failed to fetch burrow');
    process.exit(1);
  }

  const burrow = burrowResult.data;
  const entry = burrow.entries.find(e => e.id === entryId);

  if (!entry) {
    error(`Entry not found: ${entryId}`);
    log('\nAvailable entries:');
    for (const e of burrow.entries) {
      log(`  - ${e.id}`);
    }
    process.exit(1);
  }

  header(`Fetching: ${entry.title || entry.id}`);
  label('ID', entry.id);
  label('URI', entry.uri);
  label('Kind', entry.kind);
  if (entry.mediaType) {
    label('Media Type', entry.mediaType);
  }
  log('');

  const contentResult = await client.fetchEntry(burrow, entry);

  if (!contentResult.ok || !contentResult.data) {
    error(contentResult.error?.message || 'Failed to fetch entry');
    process.exit(1);
  }

  const content = contentResult.data;

  if (options.output) {
    await Bun.write(options.output, content);
    success(`Saved to ${options.output}`);
  } else {
    success('Content fetched');
    log(colors.dim + '─'.repeat(60) + colors.reset);
    log(new TextDecoder().decode(content));
    log(colors.dim + '─'.repeat(60) + colors.reset);
  }
}

async function cmdTraverse(uri: string, options: {
  strategy?: 'breadth-first' | 'depth-first' | 'priority';
  maxDepth?: number;
  maxEntries?: number;
}) {
  const burrowResult = await client.fetchBurrowWithDiscovery(uri);

  if (!burrowResult.ok || !burrowResult.data) {
    error(burrowResult.error?.message || 'Failed to fetch burrow');
    process.exit(1);
  }

  const burrow = burrowResult.data;

  header(`Traversing: ${burrow.title || uri}`);
  label('Strategy', options.strategy || 'breadth-first');
  if (options.maxDepth) {
    label('Max Depth', options.maxDepth.toString());
  }
  log('');

  const startTime = Date.now();
  let count = 0;
  let cycleDetected = 0;
  let depthLimited = 0;

  for await (const event of client.traverse(burrow, {
    strategy: options.strategy,
    maxDepth: options.maxDepth,
    maxEntries: options.maxEntries,
  })) {
    if (event.type === 'entry') {
      count++;
      const depth = event.depth || 0;
      const indent = '  '.repeat(depth);
      const fullPath = resolveUri(burrow.baseUri, event.entry.uri);
      log(`${fullPath || event.entry.title || event.entry.id} (${event.entry.kind})`);
    } else if (event.type === 'cycle-detected') {
      cycleDetected++;
      log(`${colors.yellow}↻${colors.reset} Cycle detected: ${event.entry.id}`);
    } else if (event.type === 'depth-limit') {
      depthLimited++;
    }
  }

  const duration = Date.now() - startTime;

  log('');
  success(`Traversed ${count} entries in ${duration}ms`);
  if (cycleDetected > 0) {
    warning(`${cycleDetected} cycles detected`);
  }
  if (depthLimited > 0) {
    warning(`${depthLimited} entries skipped (depth limit)`);
  }
}

async function cmdMap(inputDir: string, options: {
  output?: string;
  title?: string;
  description?: string;
  baseUri?: string;
  maxDepth?: number;
  includeHidden?: boolean;
  exclude?: string[];
}) {
  const { readdirSync, statSync } = await import('fs');
  const { join, relative, basename: pathBasename } = await import('path');
  const { resolve: resolvePath } = await import('path');

  const targetDir = resolvePath(inputDir);
  const outputFile = options.output || join(targetDir, '.burrow.json');
  const maxDepth = options.maxDepth || 1;
  const excludePatterns = options.exclude || ['node_modules', 'dist', '.git', '.burrow.json'];

  header(`Generating burrow map for: ${targetDir}`);
  label('Output', outputFile);
  label('Max Depth', maxDepth.toString());
  log('');

  // Helper: Get MIME type from extension
  function getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      md: 'text/markdown',
      markdown: 'text/markdown',
      json: 'application/json',
      yaml: 'application/x-yaml',
      yml: 'application/x-yaml',
      html: 'text/html',
      htm: 'text/html',
      txt: 'text/plain',
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      js: 'application/javascript',
      ts: 'application/typescript',
      css: 'text/css',
      xml: 'application/xml',
      zip: 'application/zip',
      tar: 'application/x-tar',
      gz: 'application/gzip',
    };
    return mimeMap[ext || ''] || 'application/octet-stream';
  }

  // Helper: Generate ID from filename
  function generateId(name: string): string {
    // Remove extension
    let id = name.replace(/\.[^/.]+$/, '');
    // Convert to lowercase and replace spaces/special chars with hyphens
    id = id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    // Remove leading numbers
    id = id.replace(/^[0-9]+-/, '');
    return id || 'entry';
  }

  // Helper: Get priority
  function getPriority(name: string, isDir: boolean): number {
    if (/^readme/i.test(name)) return 100;
    if (/^index\./i.test(name)) return 95;
    if (isDir) return 70;
    return 80;
  }

  // Helper: Should exclude path
  function shouldExclude(name: string): boolean {
    if (!options.includeHidden && name.startsWith('.')) return true;
    return excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(name);
      }
      return name === pattern;
    });
  }

  // Helper: Count entries in a directory (without creating burrows)
  function countDirEntries(dir: string): number {
    try {
      const items = readdirSync(dir);
      return items.filter(item => !shouldExclude(item)).length;
    } catch {
      return 0;
    }
  }

  // Scan directory and create burrow with smart consolidation
  // Consolidates directories with < 10 entries into parent (except root)
  async function scanDirectoryAndCreateBurrow(
    dir: string,
    depth: number,
    rootDir: string
  ): Promise<Entry[]> {
    if (depth > maxDepth) return [];

    const entries: Entry[] = [];

    try {
      const items = readdirSync(dir).sort();

      for (const item of items) {
        const itemPath = join(dir, item);
        const relativePath = relative(rootDir, itemPath);

        if (shouldExclude(item)) continue;

        try {
          const stats = statSync(itemPath);
          const isDir = stats.isDirectory();

          if (isDir) {
            // For directories, check if we should create a nested burrow
            if (depth < maxDepth) {
              // Count entries in this subdirectory
              const subEntryCount = countDirEntries(itemPath);

              // Smart consolidation: only create separate burrow if >= 10 entries
              // Root burrow is always created separately (line 728)
              const shouldCreateSeparateBurrow = subEntryCount >= 10;

              if (shouldCreateSeparateBurrow) {
                // Create .burrow.json in the subdirectory
                const subBurrowPath = join(itemPath, '.burrow.json');
                const subEntries = await scanDirectoryAndCreateBurrow(itemPath, depth + 1, itemPath);

                const subBurrow: Burrow = {
                  specVersion: 'fwdslsh.dev/rabit/schemas/0.4.0/burrow',
                  kind: 'burrow',
                  title: item,
                  description: `Auto-generated burrow for ${item}`,
                  updated: new Date().toISOString(),
                  entries: subEntries,
                };

                // Write the sub-burrow
                await Bun.write(subBurrowPath, JSON.stringify(subBurrow, null, 2) + '\n');
                log(`  Created: ${relative(targetDir, subBurrowPath)} (${subEntries.length} entries)`);

                // Reference it as a burrow entry
                const entry: Entry = {
                  id: generateId(item),
                  kind: 'burrow',
                  uri: relativePath + '/',
                  title: item,
                  summary: `Burrow containing ${subEntries.length} entries`,
                  priority: getPriority(item, true),
                };
                entries.push(entry);
              } else {
                // Consolidate: include entries from small directory directly in parent
                const subEntries = await scanDirectoryAndCreateBurrow(itemPath, depth + 1, rootDir);

                // Add entries from subdirectory with path prefix to avoid ID collisions
                for (const subEntry of subEntries) {
                  const consolidatedEntry: Entry = {
                    ...subEntry,
                    // Prefix ID with directory name to avoid collisions
                    id: `${generateId(item)}-${subEntry.id}`,
                  };
                  entries.push(consolidatedEntry);
                }

                log(`  Consolidated: ${item}/ (${subEntries.length} entries merged into parent)`);
              }
            } else {
              // At max depth, just reference as dir
              const entry: Entry = {
                id: generateId(item),
                kind: 'dir',
                uri: relativePath + '/',
                title: item,
                priority: getPriority(item, true),
              };
              entries.push(entry);
            }
          } else {
            // For files, add as file entry
            const entry: Entry = {
              id: generateId(item),
              kind: 'file',
              uri: relativePath,
              title: item,
              mediaType: getMimeType(item),
              sizeBytes: stats.size,
              priority: getPriority(item, false),
            };
            entries.push(entry);
          }
        } catch (err) {
          warning(`Failed to process ${item}: ${err}`);
        }
      }
    } catch (err) {
      error(`Failed to read directory ${dir}: ${err}`);
    }

    return entries;
  }

  // Generate burrow
  try {
    const entries = await scanDirectoryAndCreateBurrow(targetDir, 0, targetDir);

    const burrow: Burrow = {
      specVersion: 'fwdslsh.dev/rabit/schemas/0.4.0/burrow',
      kind: 'burrow',
      title: options.title || pathBasename(targetDir),
      description: options.description || `Auto-generated burrow from ${targetDir}`,
      updated: new Date().toISOString(),
      entries,
    };

    if (options.baseUri) {
      burrow.baseUri = options.baseUri;
    }

    // Write root burrow to file
    await Bun.write(outputFile, JSON.stringify(burrow, null, 2) + '\n');

    success(`Generated burrow map with ${entries.length} entries`);
    label('Output', outputFile);

    // Count nested burrows and consolidated entries
    const burrowCount = entries.filter(e => e.kind === 'burrow').length;
    const consolidatedCount = entries.filter(e => e.id.includes('-')).length;

    if (burrowCount > 0) {
      log(`  ${colors.green}✓${colors.reset} Created ${burrowCount} nested burrow(s)`);
    }
    if (consolidatedCount > 0) {
      log(`  ${colors.yellow}↓${colors.reset} Consolidated ${consolidatedCount} entries from small directories`);
    }

    log('');
    label('Smart Consolidation', 'Enabled (< 10 entries merged into parent)');
  } catch (err) {
    error(`Failed to generate burrow: ${err}`);
    process.exit(1);
  }
}

async function cmdValidate(file: string) {
  header(`Validating: ${file}`);

  try {
    const content = await Bun.file(file).text();
    const data = JSON.parse(content);

    // Basic validation
    if (!data.specVersion) {
      error('Missing required field: specVersion');
      process.exit(1);
    }

    if (!data.kind) {
      error('Missing required field: kind');
      process.exit(1);
    }

    if (data.kind !== 'burrow' && data.kind !== 'warren') {
      error(`Invalid kind: ${data.kind} (expected "burrow" or "warren")`);
      process.exit(1);
    }

    if (data.kind === 'burrow' && !data.entries) {
      error('Burrow missing required field: entries');
      process.exit(1);
    }

    if (data.kind === 'burrow') {
      // Validate entries
      for (let i = 0; i < data.entries.length; i++) {
        const entry = data.entries[i];
        if (!entry.id) {
          error(`Entry ${i} missing required field: id`);
          process.exit(1);
        }
        if (!entry.kind) {
          error(`Entry ${i} (${entry.id}) missing required field: kind`);
          process.exit(1);
        }
        if (!entry.uri) {
          error(`Entry ${i} (${entry.id}) missing required field: uri`);
          process.exit(1);
        }
      }
    }

    success('Valid manifest');
    label('Kind', data.kind);
    label('Spec Version', data.specVersion);
    if (data.title) {
      label('Title', data.title);
    }
    if (data.kind === 'burrow') {
      label('Entries', data.entries.length.toString());
    }
    if (data.kind === 'warren') {
      label('Burrows', (data.burrows?.length || 0).toString());
    }
  } catch (err) {
    error(`Validation failed: ${err}`);
    process.exit(1);
  }
}

function showHelp() {
  log(`
${colors.bold}Rabit CLI${colors.reset} - Universal Burrow Browser
${colors.dim}Rabit Specification v0.4.0${colors.reset}

${colors.bold}Usage:${colors.reset}
  rabit <command> [options]

${colors.bold}Commands:${colors.reset}
  discover <uri>                        Discover burrows at a location
  list <uri> [options]                  List entries in a burrow
  fetch <uri> <entry-id> [options]      Fetch a specific entry
  traverse <uri> [options]              Traverse all entries
  map <dir> [options]                   Generate burrow from directory
  validate <file>                       Validate a manifest file

${colors.bold}Options:${colors.reset}
  list:
    --max-depth N                       Max traversal depth (default: 1)
    --kind <file|dir|burrow|map|link>   Filter by entry kind
    --format <json|table|tree>          Output format

  fetch:
    --output FILE                       Save to file instead of stdout

  traverse:
    --strategy <bfs|dfs|priority>       Traversal strategy
    --max-depth N                       Maximum depth
    --max-entries N                     Maximum entries to process

  map:
    --output FILE                       Output file (default: .burrow.json)
    --title TEXT                        Burrow title
    --description TEXT                  Burrow description
    --base-uri URI                      Base URI for entries
    --max-depth N                       Max directory depth (default: 3)
    --include-hidden                    Include hidden files
    --exclude PATTERN                   Exclude patterns (comma-separated)

${colors.bold}Examples:${colors.reset}
  rabit discover https://example.com/repo
  rabit list https://example.com/repo --format table
  rabit fetch https://example.com/repo readme
  rabit traverse https://example.com/repo --strategy priority
  rabit map ./my-docs --title "My Documentation"
  rabit validate .burrow.json

${colors.bold}More Info:${colors.reset}
  https://github.com/fwdslsh/rabit
`);
}

// ============================================================================
// Main
// ============================================================================

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

try {
  switch (command) {
    case 'discover':
      if (!args[1]) {
        error('Missing URI argument');
        log('Usage: rabit discover <uri>');
        process.exit(1);
      }
      await cmdDiscover(args[1]);
      break;

    case 'list': {
      if (!args[1]) {
        error('Missing URI argument');
        log('Usage: rabit list <uri> [--max-depth N] [--kind <type>] [--format <json|table|tree>]');
        process.exit(1);
      }

      const options: any = {};
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--max-depth' && args[i + 1]) {
          options.maxDepth = parseInt(args[i + 1], 10);
          i++;
        } else if (args[i] === '--kind' && args[i + 1]) {
          options.kind = args[i + 1];
          i++;
        } else if (args[i] === '--format' && args[i + 1]) {
          options.format = args[i + 1];
          i++;
        }
      }

      await cmdList(args[1], options);
      break;
    }

    case 'fetch': {
      if (!args[1] || !args[2]) {
        error('Missing required arguments');
        log('Usage: rabit fetch <uri> <entry-id> [--output FILE]');
        process.exit(1);
      }

      const options: any = {};
      for (let i = 3; i < args.length; i++) {
        if (args[i] === '--output' && args[i + 1]) {
          options.output = args[i + 1];
          i++;
        }
      }

      await cmdFetch(args[1], args[2], options);
      break;
    }

    case 'traverse': {
      if (!args[1]) {
        error('Missing URI argument');
        log('Usage: rabit traverse <uri> [--strategy <bfs|dfs|priority>] [--max-depth N]');
        process.exit(1);
      }

      const options: any = {};
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--strategy' && args[i + 1]) {
          const strategy = args[i + 1];
          if (strategy === 'bfs') options.strategy = 'breadth-first';
          else if (strategy === 'dfs') options.strategy = 'depth-first';
          else options.strategy = strategy;
          i++;
        } else if (args[i] === '--max-depth' && args[i + 1]) {
          options.maxDepth = parseInt(args[i + 1], 10);
          i++;
        } else if (args[i] === '--max-entries' && args[i + 1]) {
          options.maxEntries = parseInt(args[i + 1], 10);
          i++;
        }
      }

      await cmdTraverse(args[1], options);
      break;
    }

    case 'map': {
      if (!args[1]) {
        error('Missing directory argument');
        log('Usage: rabit map <dir> [--output FILE] [--title TEXT] [--description TEXT]');
        process.exit(1);
      }

      const options: any = {};
      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--output' && args[i + 1]) {
          options.output = args[i + 1];
          i++;
        } else if (args[i] === '--title' && args[i + 1]) {
          options.title = args[i + 1];
          i++;
        } else if (args[i] === '--description' && args[i + 1]) {
          options.description = args[i + 1];
          i++;
        } else if (args[i] === '--base-uri' && args[i + 1]) {
          options.baseUri = args[i + 1];
          i++;
        } else if (args[i] === '--max-depth' && args[i + 1]) {
          options.maxDepth = parseInt(args[i + 1], 10);
          i++;
        } else if (args[i] === '--include-hidden') {
          options.includeHidden = true;
        } else if (args[i] === '--exclude' && args[i + 1]) {
          options.exclude = args[i + 1].split(',').map((s: string) => s.trim());
          i++;
        }
      }

      await cmdMap(args[1], options);
      break;
    }

    case 'validate':
      if (!args[1]) {
        error('Missing file argument');
        log('Usage: rabit validate <file>');
        process.exit(1);
      }
      await cmdValidate(args[1]);
      break;

    default:
      error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
} catch (err) {
  error(`Fatal error: ${err}`);
  process.exit(1);
}
