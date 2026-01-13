#!/usr/bin/env bun
/**
 * Rabit CLI - Proof of Concept Client
 * 
 * Commands:
 *   warren <url>              - List burrows in a warren
 *   burrow <url>              - Show burrow manifest info
 *   entries <url>             - List entries in a burrow
 *   fetch <url> <entry-id>    - Fetch a specific entry's content
 *   traverse <url>            - Traverse all entries in a burrow
 *   search <url> <query>      - Search entries by title/summary
 *   agent-info <url>          - Show agent instructions for a burrow
 */

import {
  fetchWarren,
  fetchBurrow,
  fetchEntry,
  traverseBurrow,
  findEntry,
  findEntriesByRel,
  getEntryPoint,
  getAgentHints,
  getAgentContext,
  listBurrows,
  findBurrow,
  getBurrowUrl,
  getBurrowBaseUrl,
} from './rabit';
import type { Entry, BurrowManifest } from './types';

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
};

function log(msg: string) {
  console.log(msg);
}

function error(msg: string) {
  console.error(`${colors.red}Error:${colors.reset} ${msg}`);
}

function header(msg: string) {
  console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}`);
}

function label(name: string, value: string) {
  console.log(`  ${colors.dim}${name}:${colors.reset} ${value}`);
}

function formatEntry(entry: Entry, index?: number) {
  const prefix = index !== undefined ? `${colors.dim}${index + 1}.${colors.reset} ` : '';
  const rels = entry.rel.map(r => `${colors.yellow}[${r}]${colors.reset}`).join(' ');
  console.log(`${prefix}${colors.bold}${entry.title || entry.id}${colors.reset} ${rels}`);
  console.log(`   ${colors.dim}href:${colors.reset} ${entry.href}`);
  if (entry.summary) {
    console.log(`   ${colors.dim}${entry.summary}${colors.reset}`);
  }
}

// Commands

async function cmdWarren(url: string) {
  header(`Fetching warren: ${url}`);
  
  const result = await fetchWarren(url);
  if (!result.ok || !result.data) {
    error(result.error || 'Unknown error');
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
      console.log(`  Tags: ${entry.tags.map(t => `${colors.yellow}${t}${colors.reset}`).join(', ')}`);
    }
    const url = getBurrowUrl(entry);
    if (url) {
      console.log(`  ${colors.dim}URL: ${url}${colors.reset}`);
    }
  }
  log('');
}

async function cmdBurrow(url: string) {
  header(`Fetching burrow: ${url}`);
  
  const result = await fetchBurrow(url);
  if (!result.ok || !result.data) {
    error(result.error || 'Unknown error');
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
  label('RID', burrow.manifest.rid.substring(0, 40) + '...');
  
  if (burrow.manifest.repo) {
    header('Repository Files:');
    for (const [key, value] of Object.entries(burrow.manifest.repo)) {
      label(key, value as string);
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
  const result = await fetchBurrow(url);
  if (!result.ok || !result.data) {
    error(result.error || 'Unknown error');
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
  const result = await fetchBurrow(url);
  if (!result.ok || !result.data) {
    error(result.error || 'Unknown error');
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
  log('');
  
  const contentResult = await fetchEntry(burrow, entry);
  if (!contentResult.ok || !contentResult.data) {
    error(contentResult.error || 'Unknown error');
    process.exit(1);
  }
  
  log(colors.dim + '─'.repeat(60) + colors.reset);
  log(contentResult.data);
  log(colors.dim + '─'.repeat(60) + colors.reset);
}

async function cmdTraverse(url: string) {
  const result = await fetchBurrow(url);
  if (!result.ok || !result.data) {
    error(result.error || 'Unknown error');
    process.exit(1);
  }
  
  const burrow = result.data;
  
  header(`Traversing: ${burrow.manifest.title}`);
  log('');
  
  let count = 0;
  for await (const { entry, content, error: fetchError } of traverseBurrow(burrow)) {
    count++;
    const status = fetchError 
      ? `${colors.red}✗${colors.reset}` 
      : `${colors.green}✓${colors.reset}`;
    const size = content ? `${(content.length / 1024).toFixed(1)}KB` : 'N/A';
    
    log(`${status} ${colors.bold}${entry.id}${colors.reset} (${entry.type}) - ${size}`);
    
    if (fetchError) {
      log(`  ${colors.red}${fetchError}${colors.reset}`);
    }
  }
  
  log('');
  log(`${colors.green}Traversed ${count} entries${colors.reset}`);
}

async function cmdSearch(url: string, query: string) {
  const result = await fetchBurrow(url);
  if (!result.ok || !result.data) {
    error(result.error || 'Unknown error');
    process.exit(1);
  }
  
  const burrow = result.data;
  const queryLower = query.toLowerCase();
  
  const matches = burrow.entries.filter(entry => {
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
  const result = await fetchBurrow(url);
  if (!result.ok || !result.data) {
    error(result.error || 'Unknown error');
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
  const relTypes = new Set(burrow.entries.flatMap(e => e.rel));
  log(`${colors.bold}Entries by Relation:${colors.reset}`);
  for (const rel of relTypes) {
    const entries = findEntriesByRel(burrow, rel);
    log(`  ${colors.yellow}[${rel}]${colors.reset}: ${entries.map(e => e.id).join(', ')}`);
  }
  log('');
}

function showHelp() {
  log(`
${colors.bold}Rabit CLI${colors.reset} - Burrow Traversal Client

${colors.bold}Usage:${colors.reset}
  rabit <command> [options]

${colors.bold}Commands:${colors.reset}
  warren <url>              List burrows in a warren
  burrow <url>              Show burrow manifest info
  entries <url>             List all entries in a burrow
  fetch <url> <entry-id>    Fetch a specific entry's content
  traverse <url>            Traverse and fetch all entries
  search <url> <query>      Search entries by title/summary
  agent-info <url>          Show agent instructions

${colors.bold}Examples:${colors.reset}
  rabit warren http://localhost:8080
  rabit burrow http://localhost:8081
  rabit entries http://localhost:8081
  rabit fetch http://localhost:8081 readme
  rabit traverse http://localhost:8082
  rabit search http://localhost:8083 kubernetes
  rabit agent-info http://localhost:8081
`);
}

// Main
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

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
    
  default:
    error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
