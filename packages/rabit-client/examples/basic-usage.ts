/**
 * Basic usage examples for @fwdslsh/rabit-client
 */

import {
  createClient,
  fetchBurrow,
  fetchWarren,
  fetchEntry,
  traverseBurrow,
  findEntry,
  getEntryPoint,
} from '@fwdslsh/rabit-client';

// =============================================================================
// Example 1: Fetch a burrow and display info
// =============================================================================

async function example1() {
  console.log('Example 1: Fetch burrow information\n');

  const result = await fetchBurrow('https://example.org/burrow/');

  if (!result.ok) {
    console.error('Failed to fetch burrow:', result.error?.message);
    return;
  }

  const burrow = result.data;

  console.log('Title:', burrow.manifest.title);
  console.log('Description:', burrow.manifest.description);
  console.log('Updated:', burrow.manifest.updated);
  console.log('Total entries:', burrow.entries.length);
  console.log();
}

// =============================================================================
// Example 2: Fetch and display warren registry
// =============================================================================

async function example2() {
  console.log('Example 2: List burrows in a warren\n');

  const result = await fetchWarren('https://example.org/');

  if (!result.ok) {
    console.error('Failed to fetch warren:', result.error?.message);
    return;
  }

  const warren = result.data;

  console.log('Warren:', warren.registry.title);
  console.log('Burrows:\n');

  for (const burrow of warren.entries) {
    console.log(`  ${burrow.name}: ${burrow.title}`);
    console.log(`  ${burrow.summary}`);
    console.log(`  Tags: ${burrow.tags?.join(', ') || 'none'}`);
    console.log();
  }
}

// =============================================================================
// Example 3: Fetch entry content
// =============================================================================

async function example3() {
  console.log('Example 3: Fetch entry content\n');

  const burrowResult = await fetchBurrow('https://example.org/burrow/');
  if (!burrowResult.ok) return;

  const burrow = burrowResult.data;
  const entry = findEntry(burrow, 'readme');

  if (!entry) {
    console.log('Entry not found');
    return;
  }

  const contentResult = await fetchEntry(burrow, entry);

  if (!contentResult.ok) {
    console.error('Failed to fetch entry:', contentResult.error?.message);
    return;
  }

  const text = new TextDecoder().decode(contentResult.data);
  console.log('Content:\n');
  console.log(text);
  console.log();
}

// =============================================================================
// Example 4: Traverse all entries
// =============================================================================

async function example4() {
  console.log('Example 4: Traverse burrow\n');

  const burrowResult = await fetchBurrow('https://example.org/burrow/');
  if (!burrowResult.ok) return;

  const burrow = burrowResult.data;

  console.log('Traversing entries...\n');

  for await (const result of traverseBurrow(burrow, {
    maxEntries: 10,
    verifyRids: true,
  })) {
    if (result.error) {
      console.log(`❌ ${result.entry.id}: ${result.error.message}`);
    } else {
      const size = result.content ? result.content.byteLength : 0;
      console.log(`✓ ${result.entry.id} (${size} bytes)`);
    }
  }
  console.log();
}

// =============================================================================
// Example 5: Use agent instructions
// =============================================================================

async function example5() {
  console.log('Example 5: Follow agent instructions\n');

  const burrowResult = await fetchBurrow('https://example.org/burrow/');
  if (!burrowResult.ok) return;

  const burrow = burrowResult.data;

  // Get agent context
  const context = burrow.manifest.agents?.context;
  console.log('Context:', context);

  // Get entry point
  const entryPoint = getEntryPoint(burrow);
  console.log('Entry point:', entryPoint?.title || entryPoint?.id);

  // Get hints
  const hints = burrow.manifest.agents?.hints || [];
  console.log('Hints:');
  for (const hint of hints) {
    console.log(`  - ${hint}`);
  }
  console.log();
}

// =============================================================================
// Example 6: Custom client with options
// =============================================================================

async function example6() {
  console.log('Example 6: Custom client configuration\n');

  const client = createClient({
    maxConcurrent: 5,
    minDelay: 200,
    enableCache: true,
  });

  const result = await client.fetchBurrow('https://example.org/burrow/');

  if (!result.ok) {
    console.error('Failed:', result.error?.message);
    return;
  }

  console.log('Fetched:', result.data.manifest.title);
  console.log('Custom client works!');
  console.log();
}

// =============================================================================
// Example 7: Git repository access
// =============================================================================

async function example7() {
  console.log('Example 7: Fetch from Git repository\n');

  const result = await fetchBurrow({
    git: {
      remote: 'https://github.com/org/docs.git',
      ref: 'refs/heads/main',
      path: '/',
    },
  });

  if (!result.ok) {
    console.error('Failed:', result.error?.message);
    return;
  }

  console.log('Fetched from Git:', result.data.manifest.title);
  console.log();
}

// =============================================================================
// Example 8: Error handling
// =============================================================================

async function example8() {
  console.log('Example 8: Comprehensive error handling\n');

  const result = await fetchBurrow('https://invalid.example.org/');

  if (!result.ok) {
    const error = result.error!;

    console.log('Error category:', error.category);
    console.log('Error message:', error.message);

    if (error.attempts) {
      console.log('Attempts made:');
      for (const attempt of error.attempts) {
        console.log(`  - ${attempt.root}: ${attempt.error}`);
      }
    }
  }
  console.log();
}

// =============================================================================
// Run examples
// =============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Rabit Client Examples');
  console.log('='.repeat(60));
  console.log();

  // Note: These examples use fictional URLs
  // Replace with actual burrow URLs to run

  // await example1();
  // await example2();
  // await example3();
  // await example4();
  // await example5();
  // await example6();
  // await example7();
  // await example8();

  console.log('Examples complete!');
}

// Uncomment to run:
// main();
