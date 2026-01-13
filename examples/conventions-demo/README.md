# Rabit File Naming Conventions Demo

This directory demonstrates the three supported file naming conventions for Rabit burrows.

## Supported Conventions

Rabit v0.4.0 supports three file naming conventions to accommodate different hosting environments:

### 1. Dotfile Convention (Recommended for Git/Filesystems)
- **File:** `.burrow.json`
- **Use when:** Publishing via git repositories or local filesystems
- **Pros:** Unobtrusive, follows Unix convention, clean directory structure
- **Cons:** Web servers may block by default, hidden from casual browsing

### 2. Non-dotfile Convention (Web Server Friendly)
- **File:** `burrow.json` (this example)
- **Use when:** Web servers block dotfiles, or you want better visibility
- **Pros:** Always visible, no web server configuration needed
- **Cons:** More visible clutter in directories

### 3. RFC 8615 Well-known Convention (Enterprise)
- **File:** `.well-known/burrow.json`
- **Use when:** Enterprise environments with strict directory policies
- **Pros:** Follows RFC 8615 standard, centralized location for metadata
- **Cons:** Adds directory depth, less intuitive for simple cases

## Discovery Order

Rabit clients MUST attempt discovery in this order:

1. Try `.burrow.json` (dotfile)
2. Try `burrow.json` (non-dotfile)
3. Try `.well-known/burrow.json` (RFC 8615)

Clients stop at the first successful response.

## This Example

This directory contains both:
- `burrow.json` (non-dotfile convention - you're seeing this one first)
- `.well-known/burrow.json` (RFC 8615 convention)

In a real deployment, you would typically use **only one** convention, though providing multiple for redundancy is allowed.

## Warren Conventions

The same pattern applies to warrens:
- `.warren.json` (dotfile)
- `warren.json` (non-dotfile)
- `.well-known/warren.json` (RFC 8615)

## Learn More

See the [Rabit Specification v0.3.0](../../docs/rabit-spec.md) for complete details on the discovery algorithm and file conventions.
