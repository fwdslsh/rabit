# OpenCode Rabit

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server plugin that provides Rabit Burrow Traversal (RBT) tools for AI agents. This plugin enables OpenCode and other MCP-compatible tools to discover, fetch, and traverse Rabit burrows and warrens.

## Installation

```bash
bun add opencode-rabit
```

Or install from the monorepo:

```bash
cd packages/opencode-rabit
bun install
bun run build
```

## Configuration

### OpenCode

Add to your OpenCode configuration file (`~/.config/opencode/config.json`):

```json
{
  "mcpServers": {
    "rabit": {
      "type": "stdio",
      "command": "bunx",
      "args": ["opencode-rabit"]
    }
  }
}
```

### Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "rabit": {
      "command": "bunx",
      "args": ["opencode-rabit"]
    }
  }
}
```

## Available Tools

### Discovery

- **`rabit_discover_burrow`** - Discover a burrow via well-known endpoint
- **`rabit_discover_warren`** - Discover a warren via well-known endpoint

### Fetching

- **`rabit_fetch_warren`** - Fetch a warren registry from a URL
- **`rabit_fetch_burrow`** - Fetch a burrow manifest from a URL or file path
- **`rabit_fetch_entry`** - Fetch content of a specific entry

### Browsing

- **`rabit_list_entries`** - List entries in a burrow with optional filters
- **`rabit_search_entries`** - Search entries by text query
- **`rabit_burrow_stats`** - Get statistics about a burrow

### Agent Guidance

- **`rabit_agent_guidance`** - Get agent-specific guidance for a burrow

### Warren Operations

- **`rabit_list_warren_burrows`** - List all burrows in a warren
- **`rabit_find_burrow_in_warren`** - Find a specific burrow by name

## Example Usage

Once configured, you can ask your AI assistant to:

- "Discover what burrows are available at https://example.com"
- "Fetch the burrow at https://example.com and list its entries"
- "Search for entries about 'authentication' in the API documentation burrow"
- "Get the agent guidance for this burrow"
- "Fetch the content of the 'getting-started' entry"

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Build for production
bun run build

# Run tests
bun test
```

## License

CC-BY-4.0 - See [LICENSE](./LICENSE) for details.
