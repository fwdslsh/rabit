# About Rabit

## The Gopher Connection

In the early 1990s, before the World Wide Web dominated the internet, there was **Gopher**. Gopher organized the internet as a hierarchy of menus—simple, predictable, and machine-readable. You could burrow down through directories, each level revealing more content. No scraping, no guessing, no parsing HTML soup. Just structured traversal.

The web won, and for good reason. But something was lost: the simplicity of knowing exactly what a site contained and how to navigate it programmatically.

Rabit brings that idea back, updated for a world where AI agents are first-class citizens of the internet.

The name is a nod to this lineage: where Gopher had tunnels, **Rabit has burrows**. A warren of interconnected content spaces, each with a map at the entrance.

---

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

---

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

---

## Who Is This For?

- **Documentation publishers** who want their docs to be agent-accessible
- **Knowledge bases** that need reliable machine traversal
- **API providers** publishing human-readable references
- **Researchers** sharing datasets and papers
- **Anyone** who wants their content to be navigable by AI tools
