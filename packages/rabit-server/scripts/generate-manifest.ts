#!/usr/bin/env bun
/**
 * Rabit Manifest Generator
 * Auto-generates .burrow.json and .warren.json from directory contents
 */

import { readdir, stat, readFile, writeFile } from 'fs/promises';
import { join, extname, basename, relative } from 'path';
import { createHash } from 'crypto';

// Environment configuration
const config = {
  title: process.env.RABIT_TITLE || 'My Burrow',
  description: process.env.RABIT_DESCRIPTION || '',
  updated: process.env.RABIT_UPDATED || new Date().toISOString(),
  baseUrl: process.env.RABIT_BASE_URL || 'http://localhost/',
  burrowPath: '/data/burrow',
  warrenPath: '/data/warren',
};

// MIME type mapping
const mimeTypes: Record<string, string> = {
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.json': 'application/json',
  '.yaml': 'application/x-yaml',
  '.yml': 'application/x-yaml',
  '.xml': 'application/xml',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.ts': 'application/typescript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

// Files to ignore
const ignorePatterns = [
  /^\.burrow\.json$/,
  /^\.warren\.json$/,
  /^\.warren\.md$/,
  /^\.git/,
  /^\.DS_Store$/,
  /^node_modules/,
  /^\.env/,
  /^\./,  // Hidden files
];

function shouldIgnore(filename: string): boolean {
  return ignorePatterns.some(pattern => pattern.test(filename));
}

function getMimeType(filepath: string): string {
  const ext = extname(filepath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

function computeRid(content: Buffer): string {
  const hash = createHash('sha256').update(content).digest('hex');
  return `urn:rabit:sha256:${hash}`;
}

function inferRelations(filepath: string, filename: string): string[] {
  const rels: string[] = ['item'];
  const lower = filename.toLowerCase();
  
  if (lower === 'readme.md' || lower === 'index.md' || lower === 'index.html') {
    rels.push('index', 'about');
  }
  if (lower.includes('license')) {
    rels.push('license');
  }
  if (lower.includes('contributing')) {
    rels.push('related');
  }
  if (lower.includes('changelog') || lower.includes('history')) {
    rels.push('related');
  }
  
  return rels;
}

function generateId(filepath: string): string {
  return filepath
    .replace(/\.[^.]+$/, '')  // Remove extension
    .replace(/[^a-zA-Z0-9]+/g, '-')  // Replace non-alphanumeric with dashes
    .replace(/^-+|-+$/g, '')  // Trim dashes
    .toLowerCase();
}

interface Entry {
  id: string;
  rid: string;
  href: string;
  type: string;
  rel: string[];
  title?: string;
  summary?: string;
  size?: number;
  modified?: string;
}

async function scanDirectory(dir: string, basePath: string = ''): Promise<Entry[]> {
  const entries: Entry[] = [];
  
  try {
    const items = await readdir(dir);
    
    for (const item of items) {
      if (shouldIgnore(item)) continue;
      
      const fullPath = join(dir, item);
      const relativePath = basePath ? `${basePath}/${item}` : item;
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        // Recursively scan subdirectories
        const subEntries = await scanDirectory(fullPath, relativePath);
        entries.push(...subEntries);
      } else if (stats.isFile()) {
        // Read file content for RID
        const content = await readFile(fullPath);
        const rid = computeRid(content);
        
        // Extract title from markdown files
        let title: string | undefined;
        let summary: string | undefined;
        
        if (extname(item).toLowerCase() === '.md') {
          const text = content.toString('utf-8');
          const titleMatch = text.match(/^#\s+(.+)$/m);
          if (titleMatch) {
            title = titleMatch[1].trim();
          }
          // Get first paragraph as summary
          const paragraphs = text.split(/\n\n+/);
          for (const p of paragraphs) {
            const cleaned = p.replace(/^#+\s+.+$/gm, '').trim();
            if (cleaned && !cleaned.startsWith('#')) {
              summary = cleaned.slice(0, 200);
              if (cleaned.length > 200) summary += '...';
              break;
            }
          }
        }
        
        entries.push({
          id: generateId(relativePath),
          rid,
          href: relativePath,
          type: getMimeType(item),
          rel: inferRelations(relativePath, item),
          title,
          summary,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        });
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }
  
  return entries;
}

async function generateBurrowManifest(): Promise<void> {
  console.log('Scanning burrow directory...');
  
  const entries = await scanDirectory(config.burrowPath);
  
  // Sort entries: index first, then alphabetically
  entries.sort((a, b) => {
    const aIsIndex = a.rel.includes('index');
    const bIsIndex = b.rel.includes('index');
    if (aIsIndex && !bIsIndex) return -1;
    if (!aIsIndex && bIsIndex) return 1;
    return a.href.localeCompare(b.href);
  });
  
  // Generate manifest RID (without the rid field)
  const manifestContent = {
    rbt: '0.2',
    $schema: 'https://rabit.dev/schemas/burrow-0.2.json',
    manifest: {
      title: config.title,
      description: config.description || undefined,
      updated: config.updated,
      rid: '', // Placeholder
      roots: [
        {
          https: {
            base: config.baseUrl,
          },
        },
      ],
      agents: {
        context: config.description || `Content from ${config.title}`,
        hints: [
          'Auto-generated manifest - entries discovered from file system',
        ],
      },
    },
    entries: entries.map(e => ({
      ...e,
      summary: e.summary || undefined,
      title: e.title || undefined,
    })),
  };
  
  // Compute manifest RID
  const tempManifest = JSON.stringify(manifestContent, null, 2);
  const manifestRid = computeRid(Buffer.from(tempManifest, 'utf-8'));
  manifestContent.manifest.rid = manifestRid;
  
  // Write manifest
  const outputPath = join(config.burrowPath, '.burrow.json');
  await writeFile(outputPath, JSON.stringify(manifestContent, null, 2));
  
  console.log(`Generated ${outputPath}`);
  console.log(`  Title: ${config.title}`);
  console.log(`  Entries: ${entries.length}`);
}

async function generateWarrenManifest(): Promise<void> {
  console.log('Scanning warren directory...');
  
  // For warren, look for subdirectories that might be burrows
  const entries: Array<{
    name: string;
    title: string;
    summary: string;
    roots: Array<{ https: { base: string } }>;
    tags?: string[];
    updated?: string;
  }> = [];
  
  try {
    const items = await readdir(config.warrenPath);
    
    for (const item of items) {
      if (shouldIgnore(item)) continue;
      
      const fullPath = join(config.warrenPath, item);
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        // Check if this is a burrow (has .burrow.json or content)
        const burrowManifestPath = join(fullPath, '.burrow.json');
        let title = item;
        let summary = `Content from ${item}`;
        
        try {
          const manifestContent = await readFile(burrowManifestPath, 'utf-8');
          const manifest = JSON.parse(manifestContent);
          title = manifest.manifest?.title || item;
          summary = manifest.manifest?.description || summary;
        } catch {
          // No manifest, check for README
          try {
            const readmePath = join(fullPath, 'README.md');
            const readme = await readFile(readmePath, 'utf-8');
            const titleMatch = readme.match(/^#\s+(.+)$/m);
            if (titleMatch) {
              title = titleMatch[1].trim();
            }
            const paragraphs = readme.split(/\n\n+/);
            for (const p of paragraphs) {
              const cleaned = p.replace(/^#+\s+.+$/gm, '').trim();
              if (cleaned && !cleaned.startsWith('#')) {
                summary = cleaned.slice(0, 200);
                break;
              }
            }
          } catch {
            // No README either
          }
        }
        
        entries.push({
          name: item.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title,
          summary,
          roots: [
            {
              https: {
                base: `${config.baseUrl}${item}/`,
              },
            },
          ],
          updated: stats.mtime.toISOString(),
        });
      }
    }
  } catch (error) {
    console.error('Error scanning warren:', error);
  }
  
  const warrenContent = {
    rbt: '0.2',
    $schema: 'https://rabit.dev/schemas/warren-0.2.json',
    registry: {
      title: config.title,
      description: config.description || undefined,
      updated: config.updated,
    },
    entries,
  };
  
  // Write warren JSON
  const jsonPath = join(config.warrenPath, '.warren.json');
  await writeFile(jsonPath, JSON.stringify(warrenContent, null, 2));
  console.log(`Generated ${jsonPath}`);
  
  // Generate companion markdown
  let markdown = `# ${config.title}\n\n`;
  if (config.description) {
    markdown += `${config.description}\n\n`;
  }
  markdown += `## Registered Burrows\n\n`;
  
  for (const entry of entries) {
    markdown += `### ${entry.title}\n\n`;
    markdown += `${entry.summary}\n\n`;
    markdown += `**URL:** ${entry.roots[0].https.base}.burrow.json\n\n`;
    markdown += `---\n\n`;
  }
  
  const mdPath = join(config.warrenPath, '.warren.md');
  await writeFile(mdPath, markdown);
  console.log(`Generated ${mdPath}`);
  console.log(`  Title: ${config.title}`);
  console.log(`  Burrows: ${entries.length}`);
}

// Main
const mode = process.argv[2] || 'burrow';

switch (mode) {
  case 'burrow':
    await generateBurrowManifest();
    break;
  case 'warren':
    await generateWarrenManifest();
    break;
  default:
    console.error(`Unknown mode: ${mode}`);
    process.exit(1);
}
