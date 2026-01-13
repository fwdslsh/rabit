/**
 * OpenCode Rabit Plugin
 *
 * Provides tools for discovering, browsing, and viewing files in Rabit burrows
 * and locating burrows using warren maps.
 *
 * Rabit (RBT - Rabit Burrow Traversal) is a specification for agent-friendly
 * content publishing. Burrows are content collections with manifests, and
 * Warrens are registries that list multiple burrows.
 */

import { type Plugin, tool } from "@opencode-ai/plugin";
import {
  createClient,
  fetchBurrow,
  fetchWarren,
  findEntry,
  findEntriesByTag,
  searchEntries,
  getEntryPoint,
  getAgentHints,
  getAgentContext,
  listBurrows,
  findBurrow,
  findBurrowsByTag,
  type Burrow,
  type Warren,
  type Entry,
  type BurrowReference,
} from "@fwdslsh/rabit-client";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format an entry for display
 */
function formatEntry(entry: Entry): string {
  const lines: string[] = [];
  lines.push(`ID: ${entry.id}`);
  if (entry.title) lines.push(`Title: ${entry.title}`);
  if (entry.summary) lines.push(`Summary: ${entry.summary}`);
  lines.push(`Kind: ${entry.kind}`);
  lines.push(`Media Type: ${entry.mediaType}`);
  if (entry.href) lines.push(`Href: ${entry.href}`);
  if (entry.sizeBytes) lines.push(`Size: ${entry.sizeBytes} bytes`);
  if (entry.modified) lines.push(`Modified: ${entry.modified}`);
  if (entry.tags?.length) lines.push(`Tags: ${entry.tags.join(", ")}`);
  lines.push(`RID: ${entry.rid}`);
  return lines.join("\n");
}

/**
 * Format a burrow reference for display
 */
function formatBurrowReference(burrow: BurrowReference): string {
  const lines: string[] = [];
  lines.push(`ID: ${burrow.id}`);
  if (burrow.title) lines.push(`Title: ${burrow.title}`);
  if (burrow.summary) lines.push(`Summary: ${burrow.summary}`);
  if (burrow.uri) lines.push(`URI: ${burrow.uri}`);
  if (burrow.tags?.length) lines.push(`Tags: ${burrow.tags.join(", ")}`);
  if (burrow.updated) lines.push(`Updated: ${burrow.updated}`);
  return lines.join("\n");
}

/**
 * Format burrow manifest info for display
 */
function formatBurrowInfo(burrow: Burrow): string {
  const lines: string[] = [];
  lines.push(`Title: ${burrow.title}`);
  if (burrow.summary) lines.push(`Summary: ${burrow.summary}`);
  lines.push(`Spec Version: ${burrow.rbt}`);
  if (burrow.updated) lines.push(`Updated: ${burrow.updated}`);
  lines.push(`Entries: ${burrow.entries.length}`);
  lines.push(`RID: ${burrow.rid}`);

  if (burrow.repo) {
    lines.push("\nRepository Files:");
    if (burrow.repo.readme) lines.push(`  Readme: ${burrow.repo.readme}`);
    if (burrow.repo.license) lines.push(`  License: ${burrow.repo.license}`);
    if (burrow.repo.contributing) lines.push(`  Contributing: ${burrow.repo.contributing}`);
    if (burrow.repo.changelog) lines.push(`  Changelog: ${burrow.repo.changelog}`);
  }

  if (burrow.agents) {
    lines.push("\nAgent Instructions:");
    if (burrow.agents.context) lines.push(`  Context: ${burrow.agents.context}`);
    if (burrow.agents.entryPoint) lines.push(`  Entry Point: ${burrow.agents.entryPoint}`);
    if (burrow.agents.hints?.length) {
      lines.push("  Hints:");
      for (const hint of burrow.agents.hints) {
        lines.push(`    - ${hint}`);
      }
    }
  }

  return lines.join("\n");
}

export const RabitPlugin: Plugin = async () => {
  const client = createClient();

  return {
    tool: {
      /**
       * List all burrows in a warren registry
       */
      warren_list: tool({
        description:
          "List all burrows available in a warren (registry). A warren is a collection of related burrows. Returns metadata about each burrow including name, title, summary, and URI.",
        args: {
          url: tool.schema
            .string()
            .describe(
              "URL of the warren (e.g., http://localhost:8080). Will automatically append .warren.json if needed."
            ),
        },
        async execute(args) {
          try {
            const warren = await fetchWarren(args.url);
            if (!warren) {
              return `Error: Failed to fetch warren from ${args.url}`;
            }

            const burrows = listBurrows(warren);
            const lines: string[] = [];
            lines.push(`Warren: ${warren.title}`);
            if (warren.summary) lines.push(`Summary: ${warren.summary}`);
            if (warren.updated) lines.push(`Updated: ${warren.updated}`);
            lines.push(`\nBurrows (${burrows.length}):\n`);

            for (const burrow of burrows) {
              lines.push(`--- ${burrow.id} ---`);
              lines.push(formatBurrowReference(burrow));
              lines.push("");
            }

            return lines.join("\n");
          } catch (error) {
            return `Error: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),

      /**
       * Locate a burrow in a warren by ID or search by tags
       */
      warren_locate: tool({
        description:
          "Locate a specific burrow in a warren by ID or search for burrows by tag. Returns the burrow metadata.",
        args: {
          url: tool.schema.string().describe("URL of the warren"),
          query: tool.schema
            .string()
            .describe("Burrow ID to find, or tag to search for"),
        },
        async execute(args) {
          try {
            const warren = await fetchWarren(args.url);
            if (!warren) {
              return `Error: Failed to fetch warren from ${args.url}`;
            }

            // Try exact ID match first
            const exactMatch = findBurrow(warren, args.query);
            if (exactMatch) {
              return `Found burrow:\n\n${formatBurrowReference(exactMatch)}`;
            }

            // Try tag search
            const matches = findBurrowsByTag(warren, args.query);
            if (matches.length === 0) {
              const allBurrows = listBurrows(warren);
              const availableIds = allBurrows.map((b) => b.id).join(", ");
              return `No burrows found matching "${args.query}"\n\nAvailable burrows: ${availableIds}`;
            }

            const lines: string[] = [];
            lines.push(`Found ${matches.length} matching burrow(s):\n`);
            for (const burrow of matches) {
              lines.push(`--- ${burrow.id} ---`);
              lines.push(formatBurrowReference(burrow));
              lines.push("");
            }

            return lines.join("\n");
          } catch (error) {
            return `Error: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),

      /**
       * Get burrow manifest information
       */
      burrow_info: tool({
        description:
          "Get detailed information about a burrow manifest including title, description, entry count, agent instructions, and repository metadata.",
        args: {
          url: tool.schema
            .string()
            .describe(
              "URL of the burrow (e.g., http://localhost:8081). Will automatically append .burrow.json if needed."
            ),
        },
        async execute(args) {
          try {
            const burrow = await fetchBurrow(args.url);
            if (!burrow) {
              return `Error: Failed to fetch burrow from ${args.url}`;
            }

            return formatBurrowInfo(burrow);
          } catch (error) {
            return `Error: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),

      /**
       * List all entries in a burrow
       */
      burrow_entries: tool({
        description:
          "List all entries (files/documents) in a burrow. Each entry has an ID, title, kind, media type, and can be fetched individually.",
        args: {
          url: tool.schema.string().describe("URL of the burrow"),
          tag: tool.schema
            .string()
            .optional()
            .describe("Optional tag to filter by (e.g., 'index', 'guide', 'api', 'doc')"),
        },
        async execute(args) {
          try {
            const burrow = await fetchBurrow(args.url);
            if (!burrow) {
              return `Error: Failed to fetch burrow from ${args.url}`;
            }

            let entries = burrow.entries;

            if (args.tag) {
              entries = findEntriesByTag(burrow, args.tag);
            }

            if (entries.length === 0) {
              if (args.tag) {
                return `No entries found with tag "${args.tag}"`;
              }
              return "No entries found in burrow";
            }

            const lines: string[] = [];
            lines.push(`Entries in "${burrow.title}" (${entries.length}):\n`);

            for (const entry of entries) {
              lines.push(`--- ${entry.id} ---`);
              lines.push(formatEntry(entry));
              lines.push("");
            }

            return lines.join("\n");
          } catch (error) {
            return `Error: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),

      /**
       * Fetch and view a specific entry's content
       */
      entry_view: tool({
        description:
          "Fetch and display the content of a specific entry in a burrow by its ID. Use burrow_entries first to see available entry IDs.",
        args: {
          url: tool.schema.string().describe("URL of the burrow"),
          id: tool.schema
            .string()
            .describe("ID of the entry to fetch (e.g., 'readme', 'quickstart')"),
        },
        async execute(args) {
          try {
            const burrow = await fetchBurrow(args.url);
            if (!burrow) {
              return `Error: Failed to fetch burrow from ${args.url}`;
            }

            const entry = findEntry(burrow, args.id);
            if (!entry) {
              return `Error: Entry not found: ${args.id}`;
            }

            const content = await client.fetchEntry(burrow, entry);
            const lines: string[] = [];
            lines.push(`Entry: ${entry.title || entry.id}`);
            lines.push(`Kind: ${entry.kind}`);
            lines.push(`Media Type: ${entry.mediaType}`);
            lines.push(`Size: ${content.length} bytes`);
            lines.push("\n--- Content ---\n");
            lines.push(content);

            return lines.join("\n");
          } catch (error) {
            return `Error: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),

      /**
       * Search entries in a burrow
       */
      burrow_search: tool({
        description:
          "Search for entries in a burrow by matching against title, summary, or ID.",
        args: {
          url: tool.schema.string().describe("URL of the burrow"),
          query: tool.schema.string().describe("Search query"),
        },
        async execute(args) {
          try {
            const burrow = await fetchBurrow(args.url);
            if (!burrow) {
              return `Error: Failed to fetch burrow from ${args.url}`;
            }

            const matches = searchEntries(burrow, args.query);

            if (matches.length === 0) {
              return `No entries found matching "${args.query}"`;
            }

            const lines: string[] = [];
            lines.push(`Found ${matches.length} matching entries:\n`);

            for (const entry of matches) {
              lines.push(`--- ${entry.id} ---`);
              lines.push(formatEntry(entry));
              lines.push("");
            }

            return lines.join("\n");
          } catch (error) {
            return `Error: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),

      /**
       * Traverse all entries in a burrow
       */
      burrow_traverse: tool({
        description:
          "Traverse and fetch all entries in a burrow. Returns a summary of all entries with their content status.",
        args: {
          url: tool.schema.string().describe("URL of the burrow"),
          max_entries: tool.schema
            .number()
            .optional()
            .default(50)
            .describe("Maximum number of entries to traverse (default: 50)"),
          fetch_content: tool.schema
            .boolean()
            .optional()
            .default(false)
            .describe(
              "Whether to include content in the response (default: false, just returns metadata)"
            ),
        },
        async execute(args) {
          try {
            const burrow = await fetchBurrow(args.url);
            if (!burrow) {
              return `Error: Failed to fetch burrow from ${args.url}`;
            }

            const lines: string[] = [];
            lines.push(`Traversing: ${burrow.title}\n`);

            let count = 0;
            const maxEntries = args.max_entries ?? 50;

            for await (const event of client.traverse(burrow, { maxEntries })) {
              count++;
              const { entry, content, error } = event;
              const status = error ? "✗" : "✓";
              const size = content
                ? `${(content.length / 1024).toFixed(1)}KB`
                : "N/A";

              lines.push(`${status} ${entry.id} (${entry.mediaType}) - ${size}`);

              if (error) {
                lines.push(`  Error: ${error.message}`);
              } else if (args.fetch_content && content) {
                lines.push(`--- Content ---`);
                lines.push(content.substring(0, 2000));
                if (content.length > 2000) {
                  lines.push(`... (truncated, ${content.length} bytes total)`);
                }
                lines.push("--- End Content ---\n");
              }
            }

            lines.push(`\nTraversed ${count} entries`);
            return lines.join("\n");
          } catch (error) {
            return `Error: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),

      /**
       * Get agent instructions for a burrow
       */
      agent_info: tool({
        description:
          "Get agent-specific instructions for a burrow including context, entry point, hints, and permissions. Useful for understanding how to navigate and use a burrow.",
        args: {
          url: tool.schema.string().describe("URL of the burrow"),
        },
        async execute(args) {
          try {
            const burrow = await fetchBurrow(args.url);
            if (!burrow) {
              return `Error: Failed to fetch burrow from ${args.url}`;
            }

            const lines: string[] = [];
            lines.push(`Agent Information: ${burrow.title}\n`);

            const context = getAgentContext(burrow);
            if (context) {
              lines.push(`Context: ${context}\n`);
            }

            const entryPoint = getEntryPoint(burrow);
            if (entryPoint) {
              lines.push("Entry Point:");
              lines.push(formatEntry(entryPoint));
              lines.push("");
            }

            const hints = getAgentHints(burrow);
            if (hints.length > 0) {
              lines.push("Hints:");
              for (const hint of hints) {
                lines.push(`  • ${hint}`);
              }
              lines.push("");
            }

            // Show available tags
            const allTags = new Set<string>();
            for (const entry of burrow.entries) {
              if (entry.tags) {
                for (const tag of entry.tags) {
                  allTags.add(tag);
                }
              }
            }
            if (allTags.size > 0) {
              lines.push("Available Tags:");
              lines.push(`  ${Array.from(allTags).join(", ")}`);
            }

            return lines.join("\n");
          } catch (error) {
            return `Error: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),

      /**
       * Get entry point for a burrow
       */
      entry_point: tool({
        description:
          "Get the recommended entry point for a burrow - the best starting point for reading/understanding the content. Returns the entry content.",
        args: {
          url: tool.schema.string().describe("URL of the burrow"),
        },
        async execute(args) {
          try {
            const burrow = await fetchBurrow(args.url);
            if (!burrow) {
              return `Error: Failed to fetch burrow from ${args.url}`;
            }

            const entryPoint = getEntryPoint(burrow);
            if (!entryPoint) {
              return "No entry point found in burrow";
            }

            const content = await client.fetchEntry(burrow, entryPoint);
            const lines: string[] = [];
            lines.push(`Entry Point: ${entryPoint.title || entryPoint.id}`);
            lines.push(`Media Type: ${entryPoint.mediaType}`);
            lines.push("\n--- Content ---\n");
            lines.push(content);

            return lines.join("\n");
          } catch (error) {
            return `Error: ${error instanceof Error ? error.message : String(error)}`;
          }
        },
      }),
    },
  };
};

// Default export for OpenCode plugin discovery
export default RabitPlugin;
