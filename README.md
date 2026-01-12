# Rabit: Burrows for the Agentic Web

## What is Rabit?

Rabit is a specification for publishing content that both humans and AI agents can navigate reliably. It defines a simple convention—a manifest file called `.burrow.json`—that tells visitors what's in your content space and how to traverse it.

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

### The Opportunity

We're entering an era where AI agents will consume as much web content as humans—maybe more. Agents that research, summarize, monitor, index, and act on our behalf. These agents need a better interface than "render the page and hope for the best."

### The Solution

Rabit provides:

1. **A manifest** (`.burrow.json`) — a machine-readable index of your content
2. **Stable identifiers** (RIDs) — content-addressed IDs that survive moves and mirrors
3. **Git-first distribution** — versioning, collaboration, and integrity built in
4. **Optional agent guidance** — hints for how AI should interpret your content

One file. Standard formats. No new infrastructure required.

## Core Principles

### Git-First

Rabit treats Git repositories as first-class content sources. This gives you versioning, collaboration, mirroring, and cryptographic integrity for free. HTTPS fallback exists for simpler deployments, but Git is the recommended path.

### Human and Agent Friendly

A burrow is just files—Markdown, HTML, images, whatever you publish. The `.burrow.json` manifest adds structure without replacing your content. Humans browse normally; agents get a roadmap.

### Content-Addressed Identity

Every resource has a RID (Resource Identifier) based on its content hash. Move a file, mirror it elsewhere, change your domain—the RID stays the same. This enables reliable cross-referencing and integrity verification.

### Minimal Footprint

Rabit is "one file in one place." No servers to run, no databases to maintain, no protocols to implement. If you can host static files or push to a Git repository, you can publish a burrow.

## The Terminology

Rabit uses playful terminology that maps to familiar concepts:

| Rabit Term | What It Means |
|------------|---------------|
| **Burrow** | A content space (a site, a repo, a collection) |
| **Manifest** | The index file (`.burrow.json`) |
| **Warren** | A registry of burrows (`.warren.json`) |
| **RID** | A content-addressed identifier |

## Who Is This For?

- **Documentation publishers** who want their docs to be agent-accessible
- **Knowledge bases** that need reliable machine traversal
- **API providers** publishing human-readable references
- **Researchers** sharing datasets and papers
- **Anyone** who wants their content to be navigable by the next generation of AI tools

## Getting Started

Publishing a burrow is simple:

1. Create a `.burrow.json` at your content root
2. List your entries with titles, paths, and types
3. Optionally add a Git root for versioned access
4. That's it—you have a burrow

```json
{
  "rbt": "0.2",
  "manifest": {
    "title": "My Documentation",
    "updated": "2025-01-15T12:00:00Z",
    "rid": "urn:rabit:sha256:...",
    "roots": [
      { "git": { "remote": "https://github.com/me/docs.git", "ref": "refs/heads/main" } }
    ]
  },
  "entries": [
    {
      "id": "readme",
      "rid": "urn:rabit:sha256:...",
      "href": "README.md",
      "type": "text/markdown",
      "rel": ["index", "about"],
      "title": "Getting Started"
    }
  ]
}
```

## The Road Ahead

Rabit is an early-stage specification. The current draft (0.2) defines the core mechanics:

- Manifest and registry formats
- Git and HTTPS transport
- Content-addressed identity
- Traversal algorithms
- Agent instruction hints

Future work may include:

- Reference implementations in multiple languages
- Tooling for manifest generation
- Integration with popular static site generators
- Adoption by documentation platforms

## Learn More

- **Specification:** [rabit-spec-draft-2026-01-12](./rabit-spec-draft-2026-01-12.md) — the full technical spec
- **Quick Start:** Coming soon
- **Reference Implementation:** [rabbit-examples](./rabit-examples)


