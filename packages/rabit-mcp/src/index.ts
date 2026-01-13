#!/usr/bin/env bun
/**
 * OpenCode Rabit MCP Server
 *
 * An MCP (Model Context Protocol) server that provides Rabit Burrow Traversal (RBT)
 * tools for AI agents. This plugin allows OpenCode and other MCP-compatible tools
 * to discover, fetch, and traverse Rabit burrows and warrens.
 *
 * @see https://github.com/fwdslsh/rabit
 * @see https://modelcontextprotocol.io
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  RabitClient,
  createClient,
  findEntry,
  findEntriesByRel,
  findEntriesByType,
  searchEntries,
  listBurrows,
  findBurrow,
  findBurrowsByTag,
  getEntryPoint,
  getAgentHints,
  getAgentContext,
  getBurrowStats,
  type BurrowManifest,
  type WarrenRegistry,
  type Entry,
} from "@fwdslsh/rabit-client";

// Create the MCP server
const server = new McpServer({
  name: "rabit-mcp",
  version: "0.3.0",
});

// Create a shared Rabit client instance
const rabitClient = createClient({
  enableCache: true,
});

// Helper to format entries for display
function formatEntry(entry: Entry): object {
  return {
    id: entry.id,
    title: entry.title,
    href: entry.href,
    type: entry.type,
    summary: entry.summary,
    rel: entry.rel,
    rid: entry.rid,
    size: entry.size,
  };
}

// Helper to format burrow manifest for display
function formatBurrow(burrow: BurrowManifest): object {
  return {
    rbt: burrow.rbt,
    title: burrow.manifest.title,
    description: burrow.manifest.description,
    updated: burrow.manifest.updated,
    entryCount: burrow.entries.length,
    roots: burrow.manifest.roots.map((root) => {
      if ("git" in root) return { type: "git", remote: root.git.remote };
      if ("https" in root) return { type: "https", base: root.https.base };
      if ("http" in root) return { type: "http", base: root.http.base };
      if ("file" in root) return { type: "file", path: root.file.path };
      if ("ftp" in root) return { type: "ftp" };
      return { type: "unknown" };
    }),
    agents: burrow.manifest.agents
      ? {
          context: burrow.manifest.agents.context,
          entryPoint: burrow.manifest.agents.entryPoint,
          hints: burrow.manifest.agents.hints,
        }
      : undefined,
  };
}

// Helper to format warren registry for display
function formatWarren(warren: WarrenRegistry): object {
  return {
    rbt: warren.rbt,
    title: warren.registry.title,
    description: warren.registry.description,
    updated: warren.registry.updated,
    burrowCount: warren.entries.length,
    burrows: warren.entries.map((entry) => ({
      name: entry.name,
      summary: entry.summary,
      tags: entry.tags,
    })),
  };
}

// =============================================================================
// Tool Definitions
// =============================================================================

// Discover burrow via well-known endpoint
server.tool(
  "rabit_discover_burrow",
  "Discover a Rabit burrow via the well-known endpoint (/.well-known/rabit-burrow) at a given origin URL",
  {
    origin: z.string().url().describe("The origin URL to discover the burrow from (e.g., https://example.com)"),
  },
  async ({ origin }) => {
    const result = await rabitClient.discoverBurrow(origin);

    if (!result.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to discover burrow: ${result.error?.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }
);

// Discover warren via well-known endpoint
server.tool(
  "rabit_discover_warren",
  "Discover a Rabit warren (registry of burrows) via the well-known endpoint (/.well-known/rabit-warren) at a given origin URL",
  {
    origin: z.string().url().describe("The origin URL to discover the warren from (e.g., https://example.com)"),
  },
  async ({ origin }) => {
    const result = await rabitClient.discoverWarren(origin);

    if (!result.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to discover warren: ${result.error?.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result.data, null, 2),
        },
      ],
    };
  }
);

// Fetch a warren registry
server.tool(
  "rabit_fetch_warren",
  "Fetch a Rabit warren registry from a URL. A warren is a collection/registry of burrows.",
  {
    url: z.string().describe("The URL of the warren (e.g., https://example.com/.warren.json or just https://example.com/)"),
  },
  async ({ url }) => {
    const result = await rabitClient.fetchWarren(url);

    if (!result.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch warren: ${result.error?.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(formatWarren(result.data), null, 2),
        },
      ],
    };
  }
);

// Fetch a burrow manifest
server.tool(
  "rabit_fetch_burrow",
  "Fetch a Rabit burrow manifest from a URL or file path. A burrow is an agent-friendly content space with a manifest describing its entries.",
  {
    url: z.string().describe("The URL or file path of the burrow (e.g., https://example.com/.burrow.json, /path/to/burrow, or file:///path/to/burrow)"),
  },
  async ({ url }) => {
    const result = await rabitClient.fetchBurrow(url);

    if (!result.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch burrow: ${result.error?.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(formatBurrow(result.data), null, 2),
        },
      ],
    };
  }
);

// List entries in a burrow
server.tool(
  "rabit_list_entries",
  "List all entries in a Rabit burrow. Optionally filter by relation type or media type.",
  {
    url: z.string().describe("The URL or file path of the burrow"),
    filterRel: z.string().optional().describe("Filter entries by relation type (e.g., 'index', 'item', 'collection')"),
    filterType: z.string().optional().describe("Filter entries by media type (e.g., 'text/markdown', 'application/json')"),
  },
  async ({ url, filterRel, filterType }) => {
    const result = await rabitClient.fetchBurrow(url);

    if (!result.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch burrow: ${result.error?.message}`,
          },
        ],
        isError: true,
      };
    }

    let entries = result.data.entries;

    if (filterRel) {
      entries = findEntriesByRel(result.data, filterRel);
    }

    if (filterType) {
      entries = filterRel
        ? entries.filter((e) => e.type === filterType)
        : findEntriesByType(result.data, filterType);
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              burrowTitle: result.data.manifest.title,
              totalEntries: result.data.entries.length,
              filteredCount: entries.length,
              entries: entries.map(formatEntry),
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Fetch entry content
server.tool(
  "rabit_fetch_entry",
  "Fetch the content of a specific entry from a Rabit burrow by its ID or href.",
  {
    url: z.string().describe("The URL or file path of the burrow"),
    entryId: z.string().optional().describe("The ID of the entry to fetch"),
    entryHref: z.string().optional().describe("The href of the entry to fetch (if entryId is not provided)"),
    verifyRid: z.boolean().default(true).describe("Whether to verify the content against its RID (content hash)"),
  },
  async ({ url, entryId, entryHref, verifyRid }) => {
    if (!entryId && !entryHref) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Either entryId or entryHref must be provided",
          },
        ],
        isError: true,
      };
    }

    const burrowResult = await rabitClient.fetchBurrow(url);

    if (!burrowResult.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch burrow: ${burrowResult.error?.message}`,
          },
        ],
        isError: true,
      };
    }

    const entry = entryId
      ? findEntry(burrowResult.data, entryId)
      : burrowResult.data.entries.find((e) => e.href === entryHref);

    if (!entry) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Entry not found: ${entryId || entryHref}`,
          },
        ],
        isError: true,
      };
    }

    const contentResult = await rabitClient.fetchEntry(burrowResult.data, entry, {
      verifyRid,
    });

    if (!contentResult.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch entry content: ${contentResult.error?.message}`,
          },
        ],
        isError: true,
      };
    }

    // Decode content based on type
    const isTextType =
      entry.type.startsWith("text/") ||
      entry.type === "application/json" ||
      entry.type === "application/xml" ||
      entry.type === "application/javascript" ||
      entry.type === "application/typescript" ||
      entry.type.endsWith("+json") ||
      entry.type.endsWith("+xml");

    if (isTextType) {
      const text = new TextDecoder().decode(contentResult.data);
      return {
        content: [
          {
            type: "text" as const,
            text: `Entry: ${entry.title || entry.id}\nType: ${entry.type}\nSize: ${contentResult.data?.length ?? 0} bytes\n\n---\n\n${text}`,
          },
        ],
      };
    }

    // For binary content, return metadata only
    return {
      content: [
        {
          type: "text" as const,
          text: `Entry: ${entry.title || entry.id}\nType: ${entry.type}\nSize: ${contentResult.data?.length ?? 0} bytes\n\n[Binary content - use appropriate tools to process]`,
        },
      ],
    };
  }
);

// Search entries in a burrow
server.tool(
  "rabit_search_entries",
  "Search for entries in a Rabit burrow by text query. Searches entry titles, summaries, and IDs.",
  {
    url: z.string().describe("The URL or file path of the burrow"),
    query: z.string().describe("The search query to match against entry titles, summaries, and IDs"),
  },
  async ({ url, query }) => {
    const result = await rabitClient.fetchBurrow(url);

    if (!result.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch burrow: ${result.error?.message}`,
          },
        ],
        isError: true,
      };
    }

    const matches = searchEntries(result.data, query);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              query,
              matchCount: matches.length,
              matches: matches.map(formatEntry),
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Get burrow statistics
server.tool(
  "rabit_burrow_stats",
  "Get statistics about a Rabit burrow including entry counts by type and relation.",
  {
    url: z.string().describe("The URL or file path of the burrow"),
  },
  async ({ url }) => {
    const result = await rabitClient.fetchBurrow(url);

    if (!result.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch burrow: ${result.error?.message}`,
          },
        ],
        isError: true,
      };
    }

    const stats = getBurrowStats(result.data);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              title: result.data.manifest.title,
              totalEntries: stats.totalEntries,
              totalSize: stats.totalSize,
              withPagination: stats.withPagination,
              byRelation: Object.fromEntries(stats.byRelation),
              byMediaType: Object.fromEntries(stats.byMediaType),
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Get agent guidance for a burrow
server.tool(
  "rabit_agent_guidance",
  "Get agent-specific guidance for a Rabit burrow including context, hints, and recommended entry point.",
  {
    url: z.string().describe("The URL or file path of the burrow"),
  },
  async ({ url }) => {
    const result = await rabitClient.fetchBurrow(url);

    if (!result.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch burrow: ${result.error?.message}`,
          },
        ],
        isError: true,
      };
    }

    const entryPoint = getEntryPoint(result.data);
    const context = getAgentContext(result.data);
    const hints = getAgentHints(result.data);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              title: result.data.manifest.title,
              context,
              hints,
              entryPoint: entryPoint ? formatEntry(entryPoint) : null,
              permissions: result.data.manifest.agents?.permissions,
              ignore: result.data.manifest.agents?.ignore,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// List burrows in a warren
server.tool(
  "rabit_list_warren_burrows",
  "List all burrows in a Rabit warren. Optionally filter by tag.",
  {
    url: z.string().describe("The URL of the warren"),
    tag: z.string().optional().describe("Filter burrows by tag"),
  },
  async ({ url, tag }) => {
    const result = await rabitClient.fetchWarren(url);

    if (!result.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch warren: ${result.error?.message}`,
          },
        ],
        isError: true,
      };
    }

    let burrows = listBurrows(result.data);

    if (tag) {
      burrows = findBurrowsByTag(result.data, tag);
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              warrenTitle: result.data.registry.title,
              totalBurrows: result.data.entries.length,
              filteredCount: burrows.length,
              burrows: burrows.map((b) => ({
                name: b.name,
                summary: b.summary,
                tags: b.tags,
                roots: b.roots.map((root) => {
                  if ("git" in root) return { type: "git", remote: root.git.remote };
                  if ("https" in root) return { type: "https", base: root.https.base };
                  if ("http" in root) return { type: "http", base: root.http.base };
                  if ("file" in root) return { type: "file", path: root.file.path };
                  return { type: "unknown" };
                }),
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Find a specific burrow in a warren
server.tool(
  "rabit_find_burrow_in_warren",
  "Find a specific burrow by name in a Rabit warren.",
  {
    warrenUrl: z.string().describe("The URL of the warren"),
    burrowName: z.string().describe("The name of the burrow to find"),
  },
  async ({ warrenUrl, burrowName }) => {
    const result = await rabitClient.fetchWarren(warrenUrl);

    if (!result.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to fetch warren: ${result.error?.message}`,
          },
        ],
        isError: true,
      };
    }

    const burrow = findBurrow(result.data, burrowName);

    if (!burrow) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Burrow not found: ${burrowName}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              name: burrow.name,
              summary: burrow.summary,
              tags: burrow.tags,
              roots: burrow.roots.map((root) => {
                if ("git" in root) return { type: "git", remote: root.git.remote };
                if ("https" in root) return { type: "https", base: root.https.base };
                if ("http" in root) return { type: "http", base: root.http.base };
                if ("file" in root) return { type: "file", path: root.file.path };
                return { type: "unknown" };
              }),
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// =============================================================================
// Server Startup
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OpenCode Rabit MCP server started");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
