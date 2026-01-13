# Rabit: Burrows for the Agentic Web

## What is Rabit?

Rabit is a simple convention for publishing content that both humans and AI agents can navigate reliably. It defines a manifest file (`.burrow.json`) that tells visitors what's in your content space and how to traverse it.

Think of it as a table of contents for the agentic age.

## The Gopher Connection

In the early 1990s, before the World Wide Web dominated the internet, there was **Gopher**. Gopher organized the internet as a hierarchy of menus—simple, predictable, and machine-readable. You could burrow down through directories, each level revealing more content. No scraping, no guessing, no parsing HTML soup. Just structured traversal.

The web won, and for good reason. But something was lost: the simplicity of knowing exactly what a site contained and how to navigate it programmatically.

Rabit brings that idea back, updated for a world where AI agents are first-class citizens of the internet.

The name is a nod to this lineage: where Gopher had tunnels, **Rabit has burrows**. A warren of interconnected content spaces, each with a map at the entrance.

## Why Rabit?

### The Problem

Today's web is built for browsers and humans. When AI agents need to understand a website, they resort to:

- **Scraping** — fragile, breaks constantly, ethically murky
- **Heuristics** — guessing where content lives based on patterns
- **LLM parsing** — expensive, slow, unreliable

There's no standard way for a publisher to say: *"Here's my content, here's how it's organized, here's how to traverse it."*

### The Solution

Rabit provides:

1. **A manifest** (`.burrow.json`) — a machine-readable menu of your content
2. **A human-readable companion** (`.burrow.md`) — documentation for humans browsing your burrow
3. **Simple structure** — just `id`, `kind`, and `uri` for each entry
4. **Transport-agnostic** — works with HTTP, Git, local files, or any URI scheme
5. **Optional agent guidance** — hints for how AI should interpret your content

One file. Standard JSON. No new infrastructure required.

## Core Principles

### Convention Over Specification

Rabit is a dotfile convention, not an RFC. It's designed to be:
- Read in 10 minutes
- Implemented in an afternoon
- Adopted without ceremony

### Transport Agnostic

Rabit uses standard URIs. Your content can be accessed via:
- HTTPS (`https://docs.example.com/`)
- Git repositories (`https://github.com/org/repo`)
- Local filesystem (`file:///path/to/docs/`)
- Any other URI scheme your clients support

### Human and Agent Friendly

A burrow is just files—Markdown, HTML, images, whatever you publish. The `.burrow.json` manifest adds structure without replacing your content. Humans browse normally; agents get a roadmap.

### Minimal Footprint

Rabit is "one file in one place." No servers to run, no databases to maintain, no custom protocols. If you can host static files or push to a Git repository, you can publish a burrow.

## Terminology

| Term | Description |
|------|-------------|
| **Burrow** | A content collection with a `.burrow.json` manifest |
| **Warren** | A registry of burrows (`.warren.json`) |
| **Entry** | A menu item (file, directory, sub-burrow, or link) |
| **Kind** | Entry type: `file`, `dir`, `burrow`, or `link` |

## Quick Start

Publishing a burrow takes three steps:

### 1. Create `.burrow.json`

```json
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.3.0/burrow",
  "kind": "burrow",
  "title": "My Documentation",
  "description": "Documentation for my project.",
  "updated": "2026-01-13T00:00:00Z",
  "entries": [
    {
      "id": "readme",
      "kind": "file",
      "uri": "README.md",
      "title": "Getting Started",
      "summary": "Introduction and setup guide.",
      "mediaType": "text/markdown",
      "priority": 100
    },
    {
      "id": "api",
      "kind": "dir",
      "uri": "api/",
      "title": "API Reference",
      "summary": "Complete API documentation.",
      "priority": 80
    }
  ]
}
```

### 2. Optionally create `.burrow.md`

```markdown
# My Documentation

## Start here
Read the README first, then explore the API Reference.

## High-value paths
- README.md — Installation and quick start
- api/ — Complete API documentation
```

### 3. That's it!

Your burrow is ready. Agents can discover it, read the manifest, and navigate your content.

## Entry Schema

Each entry in a burrow has:

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier |
| `kind` | Yes | `file`, `dir`, `burrow`, or `link` |
| `uri` | Yes | Location (relative or absolute) |
| `title` | No | Human-readable title |
| `summary` | No | Brief description for agents |
| `mediaType` | No | MIME type |
| `sha256` | No | Content hash for cache validation |
| `tags` | No | Categorization tags |
| `priority` | No | Higher = more prominent |

## Warrens

A warren is a registry of burrows:

```json
{
  "specVersion": "fwdslsh.dev/rabit/schemas/0.3.0/warren",
  "kind": "warren",
  "title": "My Organization",
  "burrows": [
    {
      "id": "docs",
      "uri": "https://docs.example.com/",
      "title": "Documentation",
      "tags": ["docs"]
    },
    {
      "id": "api",
      "uri": "https://api.example.com/",
      "title": "API Reference",
      "tags": ["api"]
    }
  ]
}
```

## Agent Instructions

Optionally provide guidance for AI agents:

```json
{
  "agents": {
    "context": "Technical documentation for a payment API.",
    "entryPoint": "quickstart",
    "hints": [
      "Start with the quickstart guide",
      "Code examples are in /examples"
    ]
  }
}
```

## Who Is This For?

- **Documentation publishers** who want their docs to be agent-accessible
- **Knowledge bases** that need reliable machine traversal
- **API providers** publishing human-readable references
- **Researchers** sharing datasets and papers
- **Anyone** who wants their content to be navigable by AI tools

## Project Structure

This repository contains:

- `docs/rabit-spec-v0.3.0.md` — The specification
- `schemas/` — JSON Schema files for validation
- `packages/rabit-client/` — TypeScript/Bun client implementation
- `packages/rabit-server/` — Docker-based manifest server
- `packages/opencode-rabit/` — MCP plugin for AI agents
- `examples/` — Example burrows and warren

## Learn More

- **Specification:** [docs/rabit-spec-v0.3.0.md](./docs/rabit-spec-v0.3.0.md)
- **Client Implementation:** [packages/rabit-client/](./packages/rabit-client/)
- **Examples:** [examples/](./examples/)

## License

CC-BY-4.0
