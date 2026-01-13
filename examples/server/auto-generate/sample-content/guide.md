# Getting Started Guide

This is an example document to show how the auto-generate server works.

## Features

The auto-generate server provides:

1. **Zero Configuration** - No manifest files to maintain
2. **Live Updates** - Manifest regenerates automatically
3. **Smart Detection** - Recognizes file types and assigns priorities
4. **Multiple Conventions** - Serves all three naming conventions

## File Detection

The server automatically:
- Assigns `README.md` priority 100
- Assigns `index.*` files priority 95
- Detects MIME types from file extensions
- Creates clean IDs from filenames
- Excludes common build artifacts

## Example

Add a file to this directory and watch it appear in the manifest automatically!
