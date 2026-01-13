/**
 * Tests for RabitClient
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import {
  type BurrowManifest,
  type WarrenRegistry,
  createClient,
  computeRid,
  verifyContent,
  validateUrl,
  RESOURCE_LIMITS,
} from './index';

describe('RabitClient', () => {
  const client = createClient();

  describe('Utility Functions', () => {
    test('computeRid generates correct SHA-256 RID', async () => {
      const content = new TextEncoder().encode('Hello, World!');
      const rid = await computeRid(content);

      expect(rid).toStartWith('urn:rabit:sha256:');
      // urn:rabit:sha256: is 17 chars + 64 hex chars = 81 total
      expect(rid.length).toBe(81);
    });

    test('verifyContent validates matching content', async () => {
      const content = new TextEncoder().encode('test content');
      const rid = await computeRid(content);

      const valid = await verifyContent(content, rid);
      expect(valid).toBe(true);
    });

    test('verifyContent rejects mismatched content', async () => {
      const content1 = new TextEncoder().encode('content 1');
      const content2 = new TextEncoder().encode('content 2');
      const rid = await computeRid(content1);

      const valid = await verifyContent(content2, rid);
      expect(valid).toBe(false);
    });

    test('validateUrl accepts HTTPS URLs', () => {
      expect(() => validateUrl('https://example.com')).not.toThrow();
    });

    test('validateUrl rejects HTTP URLs', () => {
      expect(() => validateUrl('http://example.com')).toThrow();
    });

    test('validateUrl rejects localhost', () => {
      expect(() => validateUrl('https://localhost')).toThrow();
    });

    test('validateUrl rejects private IPs', () => {
      expect(() => validateUrl('https://192.168.1.1')).toThrow();
      expect(() => validateUrl('https://10.0.0.1')).toThrow();
      expect(() => validateUrl('https://172.16.0.1')).toThrow();
    });

    test('RESOURCE_LIMITS are properly defined', () => {
      expect(RESOURCE_LIMITS.MAX_MANIFEST_SIZE).toBe(10 * 1024 * 1024);
      expect(RESOURCE_LIMITS.MAX_ENTRY_COUNT).toBe(10_000);
      expect(RESOURCE_LIMITS.MAX_TRAVERSAL_DEPTH).toBe(100);
      expect(RESOURCE_LIMITS.MAX_TOTAL_ENTRIES).toBe(1_000_000);
      expect(RESOURCE_LIMITS.MAX_REQUEST_TIMEOUT).toBe(30_000);
    });
  });

  describe('Manifest Validation', () => {
    test('valid burrow manifest structure', () => {
      const manifest: BurrowManifest = {
        rbt: '0.2',
        manifest: {
          title: 'Test Burrow',
          updated: '2026-01-12T00:00:00Z',
          rid: 'urn:rabit:sha256:' + '0'.repeat(64),
          roots: [
            {
              https: {
                base: 'https://example.com/',
              },
            },
          ],
        },
        entries: [],
      };

      expect(manifest.rbt).toBe('0.2');
      expect(manifest.manifest.title).toBe('Test Burrow');
      expect(manifest.entries).toBeArray();
    });

    test('valid warren registry structure', () => {
      const warren: WarrenRegistry = {
        rbt: '0.2',
        registry: {
          title: 'Test Warren',
          updated: '2026-01-12T00:00:00Z',
        },
        entries: [],
      };

      expect(warren.rbt).toBe('0.2');
      expect(warren.registry.title).toBe('Test Warren');
      expect(warren.entries).toBeArray();
    });
  });

  describe('Type Guards', () => {
    test('isGitRoot identifies Git roots', async () => {
      const { isGitRoot } = await import('./index');

      const gitRoot = {
        git: {
          remote: 'https://github.com/org/repo.git',
          ref: 'refs/heads/main',
        },
      };

      expect(isGitRoot(gitRoot)).toBe(true);
    });

    test('isHttpsRoot identifies HTTPS roots', async () => {
      const { isHttpsRoot } = await import('./index');

      const httpsRoot = {
        https: {
          base: 'https://example.com/',
        },
      };

      expect(isHttpsRoot(httpsRoot)).toBe(true);
    });
  });
});

describe('Helper Functions', () => {
  test('findEntry locates entry by ID', () => {
    const { findEntry } = require('./index');

    const manifest: BurrowManifest = {
      rbt: '0.2',
      manifest: {
        title: 'Test',
        updated: '2026-01-12T00:00:00Z',
        rid: 'urn:rabit:sha256:' + '0'.repeat(64),
        roots: [],
      },
      entries: [
        {
          id: 'test-entry',
          rid: 'urn:rabit:sha256:' + '1'.repeat(64),
          href: 'test.md',
          type: 'text/markdown',
          rel: ['item'],
        },
      ],
    };

    const entry = findEntry(manifest, 'test-entry');
    expect(entry).toBeDefined();
    expect(entry?.id).toBe('test-entry');
  });

  test('findEntriesByRel filters by relation', () => {
    const { findEntriesByRel } = require('./index');

    const manifest: BurrowManifest = {
      rbt: '0.2',
      manifest: {
        title: 'Test',
        updated: '2026-01-12T00:00:00Z',
        rid: 'urn:rabit:sha256:' + '0'.repeat(64),
        roots: [],
      },
      entries: [
        {
          id: 'index',
          rid: 'urn:rabit:sha256:' + '1'.repeat(64),
          href: 'index.md',
          type: 'text/markdown',
          rel: ['index', 'about'],
        },
        {
          id: 'doc',
          rid: 'urn:rabit:sha256:' + '2'.repeat(64),
          href: 'doc.md',
          type: 'text/markdown',
          rel: ['item'],
        },
      ],
    };

    const indices = findEntriesByRel(manifest, 'index');
    expect(indices).toHaveLength(1);
    expect(indices[0].id).toBe('index');
  });

  test('getEntryPoint returns correct entry', () => {
    const { getEntryPoint } = require('./index');

    const manifest: BurrowManifest = {
      rbt: '0.2',
      manifest: {
        title: 'Test',
        updated: '2026-01-12T00:00:00Z',
        rid: 'urn:rabit:sha256:' + '0'.repeat(64),
        roots: [],
        agents: {
          entryPoint: 'start',
        },
      },
      entries: [
        {
          id: 'start',
          rid: 'urn:rabit:sha256:' + '1'.repeat(64),
          href: 'start.md',
          type: 'text/markdown',
          rel: ['index'],
        },
      ],
    };

    const entry = getEntryPoint(manifest);
    expect(entry?.id).toBe('start');
  });
});
