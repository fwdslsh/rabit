/**
 * Tests for RabitClient
 * Based on Rabit Specification v0.4.0
 */

import { describe, test, expect } from 'bun:test';
import {
  type Burrow,
  type Warren,
  type Entry,
  createClient,
  computeRid,
  verifyContent,
  validateUrl,
  RESOURCE_LIMITS,
  isMapEntry,
  isBurrowEntry,
  isFileEntry,
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
    test('valid burrow structure (v0.4.0)', () => {
      const burrow: Burrow = {
        specVersion: 'fwdslsh.dev/rabit/schemas/0.4.0/burrow',
        kind: 'burrow',
        title: 'Test Burrow',
        description: 'A test burrow',
        updated: '2026-01-12T00:00:00Z',
        baseUri: 'https://example.com/',
        entries: [
          {
            id: 'readme',
            kind: 'file',
            uri: 'README.md',
            title: 'README',
            mediaType: 'text/markdown',
          },
          {
            id: 'docs',
            kind: 'burrow',
            uri: 'docs/',
            title: 'Documentation',
          },
          {
            id: 'api-map',
            kind: 'map',
            uri: 'api.burrow.json',
            title: 'API Map',
          },
        ],
      };

      expect(burrow.specVersion).toContain('0.4.0');
      expect(burrow.kind).toBe('burrow');
      expect(burrow.title).toBe('Test Burrow');
      expect(burrow.entries).toBeArray();
      expect(burrow.entries).toHaveLength(3);
    });

    test('valid warren structure (v0.4.0)', () => {
      const warren: Warren = {
        specVersion: 'fwdslsh.dev/rabit/schemas/0.4.0/warren',
        kind: 'warren',
        title: 'Test Warren',
        updated: '2026-01-12T00:00:00Z',
        burrows: [
          {
            id: 'docs',
            uri: 'docs/',
            title: 'Documentation',
          },
        ],
      };

      expect(warren.specVersion).toContain('0.4.0');
      expect(warren.kind).toBe('warren');
      expect(warren.title).toBe('Test Warren');
      expect(warren.burrows).toBeArray();
    });
  });

  describe('Type Guards (v0.4.0)', () => {
    test('isMapEntry identifies map entries', () => {
      const mapEntry: Entry = {
        id: 'api-map',
        kind: 'map',
        uri: 'api.burrow.json',
      };

      expect(isMapEntry(mapEntry)).toBe(true);
      expect(isBurrowEntry(mapEntry)).toBe(false);
      expect(isFileEntry(mapEntry)).toBe(false);
    });

    test('isBurrowEntry identifies burrow entries', () => {
      const burrowEntry: Entry = {
        id: 'docs',
        kind: 'burrow',
        uri: 'docs/',
      };

      expect(isBurrowEntry(burrowEntry)).toBe(true);
      expect(isMapEntry(burrowEntry)).toBe(false);
      expect(isFileEntry(burrowEntry)).toBe(false);
    });

    test('isFileEntry identifies file entries', () => {
      const fileEntry: Entry = {
        id: 'readme',
        kind: 'file',
        uri: 'README.md',
      };

      expect(isFileEntry(fileEntry)).toBe(true);
      expect(isBurrowEntry(fileEntry)).toBe(false);
      expect(isMapEntry(fileEntry)).toBe(false);
    });
  });
});

describe('Helper Functions (v0.4.0)', () => {
  test('findEntry locates entry by ID', () => {
    const { findEntry } = require('./index');

    const burrow: Burrow = {
      specVersion: 'fwdslsh.dev/rabit/schemas/0.4.0/burrow',
      kind: 'burrow',
      title: 'Test',
      updated: '2026-01-12T00:00:00Z',
      entries: [
        {
          id: 'test-entry',
          kind: 'file',
          uri: 'test.md',
          mediaType: 'text/markdown',
        },
        {
          id: 'another-entry',
          kind: 'file',
          uri: 'another.md',
        },
      ],
    };

    const entry = findEntry(burrow, 'test-entry');
    expect(entry).toBeDefined();
    expect(entry?.id).toBe('test-entry');
  });

  test('findEntriesByKind filters by entry kind', () => {
    const { findEntriesByKind } = require('./index');

    const burrow: Burrow = {
      specVersion: 'fwdslsh.dev/rabit/schemas/0.4.0/burrow',
      kind: 'burrow',
      title: 'Test',
      entries: [
        {
          id: 'readme',
          kind: 'file',
          uri: 'README.md',
        },
        {
          id: 'docs',
          kind: 'burrow',
          uri: 'docs/',
        },
        {
          id: 'api',
          kind: 'map',
          uri: 'api.burrow.json',
        },
      ],
    };

    const burrows = findEntriesByKind(burrow, 'burrow');
    expect(burrows).toHaveLength(1);
    expect(burrows[0].id).toBe('docs');

    const maps = findEntriesByKind(burrow, 'map');
    expect(maps).toHaveLength(1);
    expect(maps[0].id).toBe('api');
  });

  test('getEntryPoint returns correct entry', () => {
    const { getEntryPoint } = require('./index');

    const burrow: Burrow = {
      specVersion: 'fwdslsh.dev/rabit/schemas/0.4.0/burrow',
      kind: 'burrow',
      title: 'Test',
      agents: {
        entryPoint: 'start',
      },
      entries: [
        {
          id: 'start',
          kind: 'file',
          uri: 'start.md',
        },
      ],
    };

    const entry = getEntryPoint(burrow);
    expect(entry?.id).toBe('start');
  });
});
