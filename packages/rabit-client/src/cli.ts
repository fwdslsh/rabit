#!/usr/bin/env bun
/**
 * Rabit CLI - Full-Featured RBT Client
 *
 * Commands:
 *   warren <url>              - List burrows in a warren
 *   burrow <url>              - Show burrow manifest info
 *   entries <url>             - List entries in a burrow
 *   fetch <url> <entry-id>    - Fetch a specific entry's content
 *   traverse <url>            - Traverse all entries in a burrow
 *   search <url> <query>      - Search entries by title/summary
 *   agent-info <url>          - Show agent instructions for a burrow
 *   discover-burrow <origin>  - Discover burrow via well-known endpoint
 *   discover-warren <origin>  - Discover warren via well-known endpoint
 *   report <url>              - Generate traversal report
 *   stats <url>               - Show burrow statistics
 */

import {
  type Entry,
  type BurrowManifest,
  createClient,
  findEntry,
  findEntriesByRel,
  getEntryPoint,
  getAgentHints,
  getAgentContext,
  getBurrowUrl,
  getBurrowStats,
  getRepoFiles,
  requiresAuth,
  getCacheDirectives,
} from './index';

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

function formatEntry(entry: Entry, index?: number) {
  const prefix = index !== undefined ? `${colors.dim}${index + 1}.${colors.reset} ` : '';
  const rels = entry.rel.map((r) => `${colors.yellow}[${r}]${colors.reset}`).join(' ');
  console.log(`${prefix}${colors.bold}${entry.title || entry.id}${colors.reset} ${rels}`);
  console.log(`   ${colors.dim}href:${colors.reset} ${entry.href}`);
  console.log(`   ${colors.dim}type:${colors.reset} ${entry.type}`);
  if (entry.summary) {
    console.log(`   ${colors.dim}${entry.summary}${colors.reset}`);
  }
  if (entry.size) {
    console.log(`   ${colors.dim}size:${colors.reset} ${formatSize(entry.size)}`);
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// Create client instance
const client = createClient();

// Commands

async function cmdWarren(url: string) {
  header(`Fetching warren: ${url}`);

  const result = await client.fetchWarren(url);
  if (!result.ok || !result.data) {
    error(result.error?.message || 'Unknown error');
    process.exit(1);
  }

  const warren = result.data;

  header(warren.registry.title);
  if (warren.registry.description) {
    log(`${colors.dim}${warren.registry.description}${colors.reset}`);
  }
  label('Version', warren.rbt);
  label('Updated', warren.registry.updated);
  label('Burrows', warren.entries.length.toString());

  header('Registered Burrows:');
  for (const entry of warren.entries) {
    console.log(`\n  ${colors.bold}${colors.green}${entry.name}${colors.reset} - ${entry.title}`);
    console.log(`  ${colors.dim}${entry.summary}${colors.reset}`);
    if (entry.tags) {
      console.log(`  Tags: ${entry.tags.map((t) => `${colors.yellow}${t}${colors.reset}`).join(', ')}`);
    }
    const burrowUrl = getBurrowUrl(entry);
    if (burrowUrl) {
      console.log(`  ${colors.dim}URL: ${burrowUrl}${colors.reset}`);
    }
  }
  log('');
}

async function cmdBurrow(url: string) {
  header(`Fetching burrow: ${url}`);

  const result = await client.fetchBurrow(url);
  if (!result.ok || !result.data) {
    error(result.error?.message || 'Unknown error');
    process.exit(1);
  }

  const burrow = result.data;

  header(burrow.manifest.title);
  if (burrow.manifest.description) {
    log(`${colors.dim}${burrow.manifest.description}${colors.reset}`);
  }
  label('Version', burrow.rbt);
  label('Updated', burrow.manifest.updated);
  label('Entries', burrow.entries.length.toString());
  label('RID', burrow.manifest.rid.substring(0, 60) + '...');

  if (requiresAuth(burrow)) {
    warning('Authentication required');
  }

  const cache = getCacheDirectives(burrow);
  label('Cache Max Age', `${cache.maxAge}s`);
  label('Cache Stale While Revalidate', `${cache.staleWhileRevalidate}s`);

  const repo = getRepoFiles(burrow);
  if (Object.keys(repo).length > 0) {
    header('Repository Files:');
    for (const [key, value] of Object.entries(repo)) {
      if (value) {
        label(key, value);
      }
    }
  }

  if (burrow.manifest.agents) {
    header('Agent Instructions:');
    if (burrow.manifest.agents.context) {
      label('Context', burrow.manifest.agents.context);
    }
    if (burrow.manifest.agents.entryPoint) {
      label('Entry Point', burrow.manifest.agents.entryPoint);
    }
    if (burrow.manifest.agents.hints?.length) {
      log('  Hints:');
      for (const hint of burrow.manifest.agents.hints) {
        log(`    - ${hint}`);
      }
    }
  }
  log('');
}

async function cmdEntries(url: string) {
  const result = await client.fetchBurrow(url);
  if (!result.ok || !result.data) {
    error(result.error?.message || 'Unknown error');
    process.exit(1);
  }

  const burrow = result.data;

  header(`Entries in ${burrow.manifest.title}:`);
  log('');

  for (let i = 0; i < burrow.entries.length; i++) {
    formatEntry(burrow.entries[i], i);
    log('');
  }
}

async function cmdFetch(url: string, entryId: string) {
  const result = await client.fetchBurrow(url);
  if (!result.ok || !result.data) {
    error(result.error?.message || 'Unknown error');
    process.exit(1);
  }

  const burrow = result.data;
  const entry = findEntry(burrow, entryId);

  if (!entry) {
    error(`Entry not found: ${entryId}`);
    log('\nAvailable entries:');
    for (const e of burrow.entries) {
      log(`  - ${e.id}`);
    }
    process.exit(1);
  }

  header(`Fetching: ${entry.title || entry.id}`);
  label('Type', entry.type);
  label('Href', entry.href);
  label('RID', entry.rid);
  log('');

  const contentResult = await client.fetchEntry(burrow, entry);
  if (!contentResult.ok || !contentResult.data) {
    error(contentResult.error?.message || 'Unknown error');
    process.exit(1);
  }

  success('Content fetched and RID verified');
  log(colors.dim + '─'.repeat(60) + colors.reset);
  log(new TextDecoder().decode(contentResult.data));
  log(colors.dim + '─'.repeat(60) + colors.reset);
}

async function cmdTraverse(url: string) {
  const result = await client.fetchBurrow(url);
  if (!result.ok || !result.data) {
    error(result.error?.message || 'Unknown error');
    process.exit(1);
  }

  const burrow = result.data;

  header(`Traversing: ${burrow.manifest.title}`);
  log('');

  const startTime = Date.now();
  let count = 0;
  let errors = 0;

  for await (const { entry, content, error: fetchError } of client.traverseBurrow(burrow)) {
    count++;
    const status = fetchError ? `${colors.red}✗${colors.reset}` : `${colors.green}✓${colors.reset}`;
    const size = content ? formatSize(content.byteLength) : 'N/A';

    log(`${status} ${colors.bold}${entry.id}${colors.reset} (${entry.type}) - ${size}`);

    if (fetchError) {
      log(`  ${colors.red}${fetchError.message}${colors.reset}`);
      errors++;
    }
  }

  const duration = Date.now() - startTime;

  log('');
  success(`Traversed ${count} entries in ${formatDuration(duration)}`);
  if (errors > 0) {
    warning(`${errors} entries failed`);
  }
}

async function cmdSearch(url: string, query: string) {
  const result = await client.fetchBurrow(url);
  if (!result.ok || !result.data) {
    error(result.error?.message || 'Unknown error');
    process.exit(1);
  }

  const burrow = result.data;
  const queryLower = query.toLowerCase();

  const matches = burrow.entries.filter((entry) => {
    const title = entry.title?.toLowerCase() || '';
    const summary = entry.summary?.toLowerCase() || '';
    const id = entry.id.toLowerCase();
    return title.includes(queryLower) || summary.includes(queryLower) || id.includes(queryLower);
  });

  header(`Search results for "${query}":`);
  log('');

  if (matches.length === 0) {
    log(`${colors.dim}No entries found matching "${query}"${colors.reset}`);
  } else {
    for (let i = 0; i < matches.length; i++) {
      formatEntry(matches[i], i);
      log('');
    }
  }
}

async function cmdAgentInfo(url: string) {
  const result = await client.fetchBurrow(url);
  if (!result.ok || !result.data) {
    error(result.error?.message || 'Unknown error');
    process.exit(1);
  }

  const burrow = result.data;

  header(`Agent Information: ${burrow.manifest.title}`);
  log('');

  const context = getAgentContext(burrow);
  if (context) {
    log(`${colors.bold}Context:${colors.reset}`);
    log(`  ${context}`);
    log('');
  }

  const entryPoint = getEntryPoint(burrow);
  if (entryPoint) {
    log(`${colors.bold}Entry Point:${colors.reset}`);
    formatEntry(entryPoint);
    log('');
  }

  const hints = getAgentHints(burrow);
  if (hints.length > 0) {
    log(`${colors.bold}Hints:${colors.reset}`);
    for (const hint of hints) {
      log(`  • ${hint}`);
    }
    log('');
  }

  // Show entries by relation type
  const relTypes = new Set(burrow.entries.flatMap((e) => e.rel));
  log(`${colors.bold}Entries by Relation:${colors.reset}`);
  for (const rel of relTypes) {
    const entries = findEntriesByRel(burrow, rel);
    log(`  ${colors.yellow}[${rel}]${colors.reset}: ${entries.map((e) => e.id).join(', ')}`);
  }
  log('');
}

async function cmdDiscoverBurrow(origin: string) {
  header(`Discovering burrow at: ${origin}`);

  const result = await client.discoverBurrow(origin);
  if (!result.ok || !result.data) {
    error(result.error?.message || 'Unknown error');
    process.exit(1);
  }

  const discovery = result.data;

  success('Burrow discovered via well-known endpoint');
  label('Version', discovery.rbt);
  label('Manifest', discovery.manifest);

  if (discovery.roots && discovery.roots.length > 0) {
    header('Available Roots:');
    for (const root of discovery.roots) {
      if ('git' in root) {
        log(`  ${colors.blue}[git]${colors.reset} ${root.git.remote}@${root.git.ref}`);
      } else if ('https' in root) {
        log(`  ${colors.green}[https]${colors.reset} ${root.https.base}`);
      }
    }
  }
  log('');
}

async function cmdDiscoverWarren(origin: string) {
  header(`Discovering warren at: ${origin}`);

  const result = await client.discoverWarren(origin);
  if (!result.ok || !result.data) {
    error(result.error?.message || 'Unknown error');
    process.exit(1);
  }

  const discovery = result.data;

  success('Warren discovered via well-known endpoint');
  label('Version', discovery.rbt);
  label('Registry JSON', discovery.registry.json);
  if (discovery.registry.md) {
    label('Registry Markdown', discovery.registry.md);
  }
  log('');
}

async function cmdReport(url: string) {
  header(`Generating traversal report for: ${url}`);

  const burrowResult = await client.fetchBurrow(url);
  if (!burrowResult.ok || !burrowResult.data) {
    error(burrowResult.error?.message || 'Unknown error');
    process.exit(1);
  }

  const report = await client.generateTraversalReport(burrowResult.data);

  header('Traversal Report');
  label('Manifest', report.manifest);
  label('Started', report.started);
  label('Completed', report.completed);
  label('Entries Processed', report.entriesProcessed.toString());
  label('Entries Skipped', report.entriesSkipped.toString());

  if (report.errors.length > 0) {
    header('Errors:');
    for (const err of report.errors) {
      log(`\n  ${colors.red}${err.category}${colors.reset}: ${err.message}`);
      if (err.entryId) {
        log(`  Entry: ${err.entryId}`);
      }
      if (err.href) {
        log(`  Href: ${err.href}`);
      }
      if (err.attempts) {
        log(`  Attempts:`);
        for (const attempt of err.attempts) {
          log(`    - ${attempt.root}: ${attempt.error}`);
        }
      }
    }
  }
  log('');
}

async function cmdStats(url: string) {
  const result = await client.fetchBurrow(url);
  if (!result.ok || !result.data) {
    error(result.error?.message || 'Unknown error');
    process.exit(1);
  }

  const burrow = result.data;
  const stats = getBurrowStats(burrow);

  header(`Statistics: ${burrow.manifest.title}`);
  label('Total Entries', stats.totalEntries.toString());
  label('Total Size', formatSize(stats.totalSize));
  label('With Pagination', stats.withPagination.toString());

  header('By Relation Type:');
  for (const [rel, count] of stats.byRelation) {
    log(`  ${colors.yellow}[${rel}]${colors.reset}: ${count}`);
  }

  header('By Media Type:');
  for (const [type, count] of stats.byMediaType) {
    log(`  ${colors.cyan}${type}${colors.reset}: ${count}`);
  }
  log('');
}

function showHelp() {
  log(`
${colors.bold}Rabit CLI${colors.reset} - Full-Featured Burrow Traversal Client
${colors.dim}Rabit Specification v0.3.0${colors.reset}

${colors.bold}Usage:${colors.reset}
  rabit <command> [options]

${colors.bold}Commands:${colors.reset}
  warren <url>                  List burrows in a warren
  burrow <url>                  Show burrow manifest info
  entries <url>                 List all entries in a burrow
  fetch <url> <entry-id>        Fetch a specific entry's content
  traverse <url>                Traverse and fetch all entries
  search <url> <query>          Search entries by title/summary
  agent-info <url>              Show agent instructions
  discover-burrow <origin>      Discover burrow via well-known endpoint
  discover-warren <origin>      Discover warren via well-known endpoint
  report <url>                  Generate detailed traversal report
  stats <url>                   Show burrow statistics

${colors.bold}Examples:${colors.reset}
  rabit warren http://localhost:8080
  rabit burrow http://localhost:8081
  rabit entries http://localhost:8081
  rabit fetch http://localhost:8081 readme
  rabit traverse http://localhost:8082
  rabit search http://localhost:8083 kubernetes
  rabit agent-info http://localhost:8081
  rabit discover-burrow https://example.org
  rabit report http://localhost:8081
  rabit stats http://localhost:8081

${colors.bold}Features:${colors.reset}
  • Full Git transport support (HTTPS and SSH)
  • RID verification and integrity checking
  • Mirror fallback with automatic retry
  • Cache control and rate limiting
  • Comprehensive error handling
  • Security validation (URL, size limits)
  • Well-known endpoint discovery

${colors.bold}More Info:${colors.reset}
  https://github.com/itlackey/rabit
`);
}

// Main
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

try {
  switch (command) {
    case 'warren':
      if (!args[1]) {
        error('Missing URL argument');
        process.exit(1);
      }
      await cmdWarren(args[1]);
      break;

    case 'burrow':
      if (!args[1]) {
        error('Missing URL argument');
        process.exit(1);
      }
      await cmdBurrow(args[1]);
      break;

    case 'entries':
      if (!args[1]) {
        error('Missing URL argument');
        process.exit(1);
      }
      await cmdEntries(args[1]);
      break;

    case 'fetch':
      if (!args[1] || !args[2]) {
        error('Usage: rabit fetch <url> <entry-id>');
        process.exit(1);
      }
      await cmdFetch(args[1], args[2]);
      break;

    case 'traverse':
      if (!args[1]) {
        error('Missing URL argument');
        process.exit(1);
      }
      await cmdTraverse(args[1]);
      break;

    case 'search':
      if (!args[1] || !args[2]) {
        error('Usage: rabit search <url> <query>');
        process.exit(1);
      }
      await cmdSearch(args[1], args[2]);
      break;

    case 'agent-info':
      if (!args[1]) {
        error('Missing URL argument');
        process.exit(1);
      }
      await cmdAgentInfo(args[1]);
      break;

    case 'discover-burrow':
      if (!args[1]) {
        error('Missing origin argument');
        process.exit(1);
      }
      await cmdDiscoverBurrow(args[1]);
      break;

    case 'discover-warren':
      if (!args[1]) {
        error('Missing origin argument');
        process.exit(1);
      }
      await cmdDiscoverWarren(args[1]);
      break;

    case 'report':
      if (!args[1]) {
        error('Missing URL argument');
        process.exit(1);
      }
      await cmdReport(args[1]);
      break;

    case 'stats':
      if (!args[1]) {
        error('Missing URL argument');
        process.exit(1);
      }
      await cmdStats(args[1]);
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
