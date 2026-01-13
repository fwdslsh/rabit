# OpenCode Rabit Plugin

OpenCode plugin for **Rabit Burrow Traversal (RBT)** - discover, browse, and view files in burrows and locate burrows using warren maps.

## What is Rabit?

Rabit is a specification for agent-friendly content publishing:

- **Burrows** are content collections with a `.burrow.json` manifest containing entries (files/documents)
- **Warrens** are registries (`.warren.json`) that list and organize multiple burrows
- **Entries** are individual files with metadata including ID, title, type, relations, and content-addressable RIDs

## Installation

### As an NPM Package (Recommended)

Add to your OpenCode configuration file (`opencode.json`):

```json
{
  "plugin": ["opencode-rabit"]
}
```

Then restart OpenCode. The plugin will be automatically installed.

### From Local Workspace

If you're working within the Rabit monorepo, the plugin will automatically use the workspace version of `@rabit/client`.

### Manual Installation

Copy the plugin file to your OpenCode plugin directory:

```bash
# Project-level
mkdir -p .opencode/plugin
cp packages/opencode-rabit/index.ts .opencode/plugin/rabit.ts

# Global
mkdir -p ~/.config/opencode/plugin
cp packages/opencode-rabit/index.ts ~/.config/opencode/plugin/rabit.ts
```

Note: Manual installation requires you to also ensure `@rabit/client` is available.

## Available Tools

| Tool | Description |
|------|-------------|
| `rabit_warren_list` | List all burrows in a warren registry |
| `rabit_warren_locate` | Find a burrow by name or search query |
| `rabit_burrow_info` | Get burrow manifest information |
| `rabit_burrow_entries` | List all entries in a burrow |
| `rabit_entry_view` | Fetch and view a specific entry's content |
| `rabit_burrow_search` | Search entries by title/summary/ID |
| `rabit_burrow_traverse` | Traverse all entries with BFS |
| `rabit_agent_info` | Get agent instructions for a burrow |
| `rabit_entry_point` | Get the recommended entry point content |

## Usage Examples

### List burrows in a warren

```
> rabit_warren_list http://docs.example.com
Warren: Example Documentation
Description: Curated collection of documentation burrows

Burrows (3):
--- docs ---
Name: docs
Title: Product Documentation
Summary: Official product documentation and guides
URL: http://docs.example.com/docs/.burrow.json
...
```

### Locate a specific burrow

```
> rabit_warren_locate http://warren.example.com kubernetes
Found burrow:
Name: k8s-guides
Title: Kubernetes Deployment Guides
Summary: Step-by-step guides for deploying to Kubernetes
...
```

### Browse burrow entries

```
> rabit_burrow_entries http://docs.example.com/api
Entries in "API Reference" (12):
--- auth ---
Title: Authentication
Type: text/markdown
Relations: api, guide
...
```

### View entry content

```
> rabit_entry_view http://docs.example.com readme
Entry: Getting Started
Type: text/markdown

--- Content ---
# Welcome to Example Docs
...
```

### Get agent instructions

```
> rabit_agent_info http://docs.example.com
Agent Information: Example Documentation

Context: This burrow contains technical documentation for developers

Entry Point:
ID: readme
Title: Getting Started
...

Hints:
  • Start with the quickstart guide
  • API reference is organized by resource type
```

## Tool Details

### rabit_warren_list

Lists all burrows available in a warren registry.

**Arguments:**
- `url` (required): URL of the warren

### rabit_warren_locate

Find a specific burrow by exact name or search query.

**Arguments:**
- `url` (required): URL of the warren
- `query` (required): Name or search query

### rabit_burrow_info

Get detailed burrow metadata including agent instructions.

**Arguments:**
- `url` (required): URL of the burrow

### rabit_burrow_entries

List all entries with optional relation filtering.

**Arguments:**
- `url` (required): URL of the burrow
- `rel` (optional): Filter by relation type (e.g., 'index', 'guide', 'api')

### rabit_entry_view

Fetch and display entry content.

**Arguments:**
- `url` (required): URL of the burrow
- `id` (required): Entry ID

### rabit_burrow_search

Search entries by title, summary, or ID.

**Arguments:**
- `url` (required): URL of the burrow
- `query` (required): Search query

### rabit_burrow_traverse

Traverse all entries using breadth-first search.

**Arguments:**
- `url` (required): URL of the burrow
- `max_entries` (optional): Maximum entries to traverse (default: 50)
- `fetch_content` (optional): Include content in response (default: false)

### rabit_agent_info

Get agent-specific instructions including context, entry point, and hints.

**Arguments:**
- `url` (required): URL of the burrow

### rabit_entry_point

Get the recommended starting point for a burrow.

**Arguments:**
- `url` (required): URL of the burrow

## License

MIT
