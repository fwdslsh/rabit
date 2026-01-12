# Quick Start Guide

Get your Rabit burrow running in under a minute.

## Prerequisites

- Docker installed and running

## Step 1: Create Your Content

Create a directory with your documentation:

```bash
mkdir my-docs
echo "# Hello World" > my-docs/README.md
```

## Step 2: Run Rabit Server

```bash
docker run -d \
  -p 8080:80 \
  -v ./my-docs:/data/burrow \
  -e RABIT_TITLE="My Docs" \
  rabit/server
```

## Step 3: Access Your Burrow

- **Manifest:** http://localhost:8080/.burrow.json
- **Content:** http://localhost:8080/README.md
- **Health:** http://localhost:8080/health

## Next Steps

- Add more Markdown files to your content directory
- Create subdirectories to organize content
- Customize the manifest with environment variables

See the full documentation for advanced configuration options.
