# Implementor's Guide: Publishing Rabit Burrows

**A practical guide to leveraging existing infrastructure for publishing burrows**

This guide helps you publish Rabit burrows using tools and platforms you're likely already using: GitHub, GitLab, Azure DevOps, static hosting, and more.

## Table of Contents

- [Quick Start](#quick-start)
- [Publishing with GitHub](#publishing-with-github)
- [Publishing with GitLab](#publishing-with-gitlab)
- [Publishing with Azure DevOps](#publishing-with-azure-devops)
- [Static Hosting](#static-hosting)
- [Local and Network File Shares](#local-and-network-file-shares)
- [Human-Readable Companion Files](#human-readable-companion-files)
- [Enterprise Warrens](#enterprise-warrens)
- [Automation](#automation)
- [Best Practices](#best-practices)

---

## Quick Start

The simplest way to publish a burrow:

1. **Create `.burrow.json` at your content root**
2. **List your entries with paths and metadata**
3. **Add a Git root for versioned access**
4. **Push to your repository**

That's it! Your burrow is now accessible via Git transport.

Example minimal `.burrow.json`:

```json
{
  "rbt": "0.2",
  "$schema": "https://rabit.dev/schemas/burrow-0.2.json",
  "manifest": {
    "title": "My Documentation",
    "updated": "2026-01-12T00:00:00Z",
    "rid": "urn:rabit:sha256:...",
    "roots": [
      {
        "git": {
          "remote": "https://github.com/me/docs.git",
          "ref": "refs/heads/main",
          "path": "/"
        }
      }
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

---

## Publishing with GitHub

GitHub is an excellent platform for publishing burrows since it provides:
- Git hosting (versioning, mirroring)
- Static hosting via GitHub Pages
- CI/CD via GitHub Actions
- Public and private repository support

### Option 1: Git-Only (Simplest)

Just add `.burrow.json` to your repository:

```json
{
  "rbt": "0.2",
  "manifest": {
    "title": "Project Documentation",
    "updated": "2026-01-12T12:00:00Z",
    "rid": "urn:rabit:sha256:...",
    "roots": [
      {
        "git": {
          "remote": "https://github.com/username/repo.git",
          "ref": "refs/heads/main",
          "path": "/docs"
        }
      }
    ],
    "repo": {
      "readme": "README.md",
      "license": "LICENSE",
      "contributing": "CONTRIBUTING.md"
    }
  },
  "entries": [...]
}
```

**Accessing your burrow:**
```bash
rabit burrow https://github.com/username/repo.git
```

### Option 2: Git + GitHub Pages (Recommended)

Publish to both Git and static hosting:

1. **Enable GitHub Pages** in repository settings
2. **Add HTTPS root** to `.burrow.json`:

```json
{
  "manifest": {
    "roots": [
      {
        "git": {
          "remote": "https://github.com/username/repo.git",
          "ref": "refs/heads/main",
          "path": "/"
        }
      },
      {
        "https": {
          "base": "https://username.github.io/repo/"
        }
      }
    ]
  }
}
```

3. **Copy `.burrow.json` to your Pages directory** (usually `/docs` or `/public`)

Clients will prefer Git for versioning and integrity, but fall back to HTTPS for simplicity.

### Option 3: Automated Manifest Generation

Use GitHub Actions to auto-generate manifests:

**.github/workflows/manifest.yml:**
```yaml
name: Generate Manifest

on:
  push:
    branches: [main]

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1

      - name: Install rabit client
        run: bun install -g @rabit/client

      - name: Generate manifest
        run: |
          bun run generate-manifest.ts > .burrow.json

      - name: Commit manifest
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .burrow.json
          git commit -m "Update manifest" || true
          git push
```

**generate-manifest.ts:**
```typescript
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { computeRid } from '@rabit/client';

async function generateManifest() {
  const files = await readdir('./docs', { recursive: true });

  const entries = [];
  for (const file of files) {
    if (file.endsWith('.md')) {
      const content = await readFile(join('./docs', file));
      const rid = await computeRid(new Uint8Array(content));

      entries.push({
        id: file.replace(/\//g, '-').replace(/\.md$/, ''),
        rid,
        href: file,
        type: 'text/markdown',
        rel: ['item'],
        title: file.replace(/\.md$/, ''),
      });
    }
  }

  const manifest = {
    rbt: '0.2',
    manifest: {
      title: 'Project Docs',
      updated: new Date().toISOString(),
      rid: 'urn:rabit:sha256:...',
      roots: [
        {
          git: {
            remote: 'https://github.com/username/repo.git',
            ref: 'refs/heads/main',
            path: '/docs',
          },
        },
      ],
    },
    entries,
  };

  console.log(JSON.stringify(manifest, null, 2));
}

generateManifest();
```

---

## Publishing with GitLab

GitLab provides similar capabilities to GitHub:

### Git + GitLab Pages

**.gitlab-ci.yml:**
```yaml
pages:
  stage: deploy
  script:
    - mkdir -p public
    - cp -r docs/* public/
    - cp .burrow.json public/
  artifacts:
    paths:
      - public
  only:
    - main
```

**.burrow.json:**
```json
{
  "manifest": {
    "roots": [
      {
        "git": {
          "remote": "https://gitlab.com/username/repo.git",
          "ref": "refs/heads/main",
          "path": "/"
        }
      },
      {
        "https": {
          "base": "https://username.gitlab.io/repo/"
        }
      }
    ]
  }
}
```

---

## Publishing with Azure DevOps

Azure DevOps supports both Git hosting and Azure Static Web Apps:

### Azure Repos + Static Web Apps

**azure-pipelines.yml:**
```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: AzureStaticWebApp@0
    inputs:
      app_location: '/docs'
      api_location: ''
      output_location: ''
    env:
      azure_static_web_apps_api_token: $(deployment_token)
```

**.burrow.json:**
```json
{
  "manifest": {
    "roots": [
      {
        "git": {
          "remote": "https://dev.azure.com/org/project/_git/repo",
          "ref": "refs/heads/main",
          "path": "/"
        }
      },
      {
        "https": {
          "base": "https://myapp.azurestaticapps.net/"
        }
      }
    ]
  }
}
```

### Private Azure DevOps Repos

For private repositories, use authentication:

```json
{
  "manifest": {
    "auth": {
      "required": true,
      "documentation": "https://docs.example.com/access"
    },
    "roots": [
      {
        "git": {
          "remote": "git@ssh.dev.azure.com:v3/org/project/repo",
          "ref": "refs/heads/main"
        }
      }
    ]
  }
}
```

Clients will use SSH key authentication configured in their Git credentials.

---

## Static Hosting

For HTTPS-only burrows (without Git), use any static host:

### Netlify

```toml
# netlify.toml
[build]
  publish = "docs"
  command = "cp .burrow.json docs/"

[[redirects]]
  from = "/.burrow.json"
  to = "/docs/.burrow.json"
  status = 200
```

### Vercel

```json
// vercel.json
{
  "buildCommand": "cp .burrow.json public/",
  "outputDirectory": "public",
  "routes": [
    {
      "src": "/.burrow.json",
      "dest": "/public/.burrow.json"
    }
  ]
}
```

### AWS S3 + CloudFront

```bash
# Upload to S3
aws s3 sync ./docs s3://my-burrow/ --acl public-read

# Ensure .burrow.json is at root
aws s3 cp .burrow.json s3://my-burrow/.burrow.json --acl public-read --content-type application/json
```

---

## Local and Network File Shares

RBT supports accessing burrows directly via file paths. This is ideal for:
- Local development
- Internal documentation on network shares
- Air-gapped environments
- High-performance local access

The client uses **native OS file access**, which means network shares (SMB/CIFS, NFS) work automatically when mounted on the system.

### Local File System

For burrows on the local file system:

```json
{
  "manifest": {
    "roots": [
      {
        "file": {
          "path": "/home/user/documentation/"
        }
      }
    ]
  }
}
```

**Accessing your burrow:**
```bash
rabit burrow /home/user/documentation/
```

### Network File Shares (SMB/CIFS)

For burrows on Windows file shares:

**Windows (mapped drive or UNC path):**
```json
{
  "manifest": {
    "roots": [
      {
        "file": {
          "path": "\\\\fileserver\\docs\\api-reference\\"
        }
      }
    ]
  }
}
```

**Linux (mounted share):**
```bash
# First, mount the SMB share
sudo mount -t cifs //fileserver/docs /mnt/docs -o username=user

# Then access the burrow
rabit burrow /mnt/docs/api-reference/
```

**.burrow.json for cross-platform access:**
```json
{
  "manifest": {
    "roots": [
      {
        "file": {
          "path": "/mnt/docs/api-reference/"
        }
      },
      {
        "git": {
          "remote": "https://github.com/org/api-docs.git",
          "ref": "refs/heads/main"
        }
      }
    ]
  }
}
```

### NFS Mounts

For burrows on NFS shares:

```bash
# Mount the NFS share
sudo mount -t nfs nfsserver:/exports/docs /mnt/nfs-docs

# Access the burrow
rabit burrow /mnt/nfs-docs/
```

**.burrow.json:**
```json
{
  "manifest": {
    "roots": [
      {
        "file": {
          "path": "/mnt/nfs-docs/"
        }
      }
    ]
  }
}
```

### Authentication Note

File roots rely on the operating system for authentication:
- **SMB/CIFS**: Uses Windows credentials, Kerberos, or mount credentials
- **NFS**: Uses NFSv4 authentication or host-based access
- **Local**: Uses standard POSIX file permissions

The RBT client does not implement these protocols directly—it simply uses the paths as they appear to the file system.

---

## Human-Readable Companion Files

Both `.burrow.md` and `.warren.md` serve as human-readable companions to their JSON counterparts. These files are recommended for publisher friendliness.

### Creating .burrow.md

The `.burrow.md` file helps humans understand your burrow when browsing via file managers, GitHub, or text editors.

**Example `.burrow.md`:**

```markdown
# Acme API Documentation

Welcome to the Acme API documentation burrow.

## Contents

- **[Getting Started](guides/quickstart.md)** — Installation and first API call
- **[Authentication](auth.md)** — API keys and OAuth setup
- **[API Reference](endpoints.md)** — Complete endpoint documentation
- **[OpenAPI Spec](openapi.yaml)** — Machine-readable API specification

## About This Burrow

This burrow contains official documentation for the Acme API v2.0.

**Machine-readable manifest:** [.burrow.json](.burrow.json)

## Access Methods

| Method | URL |
|--------|-----|
| Git | `https://github.com/acme/api-docs.git` |
| Web | `https://docs.acme.com/api/` |
| File | `/mnt/shared/api-docs/` (internal only) |

## Contact

Questions? Open an issue at https://github.com/acme/api-docs/issues
```

### Creating .warren.md

The `.warren.md` file helps humans discover burrows in your registry.

**Example `.warren.md`:**

```markdown
# Acme Corp Documentation Registry

Welcome to Acme's central documentation hub!

## Public Documentation

| Burrow | Description |
|--------|-------------|
| [API Reference](https://docs.acme.com/api/) | REST API documentation |
| [User Guide](https://docs.acme.com/guide/) | End-user tutorials |
| [SDK Docs](https://docs.acme.com/sdk/) | Client library reference |

## Internal Resources

*(Requires VPN or internal network access)*

| Burrow | Description |
|--------|-------------|
| [Internal Wiki](smb://wiki.acme.internal/docs/) | Employee-only docs |
| [Architecture Docs](smb://arch.acme.internal/docs/) | System design documents |

## Machine-Readable Registry

For programmatic access, see [.warren.json](.warren.json).

## Access Help

- **Public docs**: Open to all
- **Internal docs**: Requires Acme network access
- **Questions**: Contact docs-team@acme.com
```

---

## Enterprise Warrens

Publish a warren to list multiple burrows across your organization:

### Example: Enterprise Warren

**.warren.json:**
```json
{
  "rbt": "0.2",
  "$schema": "https://rabit.dev/schemas/warren-0.2.json",
  "registry": {
    "title": "Acme Corp Documentation Registry",
    "description": "Central registry of all Acme Corp documentation burrows",
    "updated": "2026-01-12T00:00:00Z"
  },
  "entries": [
    {
      "name": "api-docs",
      "title": "API Reference",
      "summary": "REST API documentation for Acme Platform",
      "roots": [
        {
          "git": {
            "remote": "https://github.com/acme/api-docs.git",
            "ref": "refs/heads/main"
          }
        },
        {
          "https": {
            "base": "https://docs.acme.com/api/"
          }
        }
      ],
      "tags": ["api", "reference"]
    },
    {
      "name": "user-guide",
      "title": "User Guide",
      "summary": "End-user documentation and tutorials",
      "roots": [
        {
          "git": {
            "remote": "https://dev.azure.com/acme/docs/_git/user-guide",
            "ref": "refs/heads/main"
          }
        }
      ],
      "tags": ["guide", "tutorial"]
    },
    {
      "name": "internal-wiki",
      "title": "Internal Wiki",
      "summary": "Internal documentation for employees only",
      "roots": [
        {
          "git": {
            "remote": "git@github.com:acme/internal-wiki.git",
            "ref": "refs/heads/main"
          }
        }
      ],
      "tags": ["internal", "private"]
    }
  ]
}
```

**.warren.md** (companion Markdown for humans):
```markdown
# Acme Corp Documentation Registry

Welcome to Acme's documentation hub!

## Public Documentation

- **[API Reference](https://docs.acme.com/api/)** - REST API docs
- **[User Guide](https://docs.acme.com/guide/)** - Tutorials and guides

## Internal Resources

- **[Internal Wiki](https://wiki.acme.internal/)** - Employee-only docs

## Access

Public docs are open to all. For internal resources, contact IT.
```

### Hosting the Warren

**Option 1: GitHub Pages**
```bash
# docs.acme.com repo
docs/
  .warren.json
  .warren.md
```

**Option 2: Internal Web Server**
```bash
# Nginx config
location /.warren.json {
    root /var/www/docs;
    add_header Content-Type application/json;
}

location /.warren.md {
    root /var/www/docs;
    add_header Content-Type text/markdown;
}
```

**Option 3: Azure Storage**
```bash
az storage blob upload \
  --account-name acdocs \
  --container-name '$web' \
  --file .warren.json \
  --name .warren.json \
  --content-type application/json
```

---

## Automation

### Auto-Generate Manifests from Directory Structure

**Using Rabit Server**

The rabit-server Docker image auto-generates manifests:

```yaml
# docker-compose.yml
services:
  docs-burrow:
    image: rabit-server
    environment:
      - BURROW_TITLE=My Docs
      - GIT_REMOTE=https://github.com/me/docs.git
      - GIT_REF=refs/heads/main
    volumes:
      - ./docs:/burrow
    ports:
      - "8080:80"
```

This automatically creates `.burrow.json` from directory contents.

### Using Build Tools

**package.json script:**
```json
{
  "scripts": {
    "manifest": "bun run scripts/generate-manifest.ts",
    "prebuild": "bun run manifest"
  }
}
```

**Integration with Static Site Generators:**

**11ty (_data/manifest.js):**
```javascript
module.exports = async function() {
  const manifest = {
    rbt: "0.2",
    manifest: {
      title: "My Blog",
      updated: new Date().toISOString(),
      roots: [...]
    },
    entries: []
  };

  // Populate from 11ty collections
  return manifest;
};
```

**Next.js (scripts/postbuild.ts):**
```typescript
import { writeFile } from 'fs/promises';

async function postBuild() {
  // Generate manifest from public/ directory
  const manifest = await generateFromPublic();
  await writeFile('public/.burrow.json', JSON.stringify(manifest));
}
```

---

## Best Practices

### 1. Always Include RIDs

RIDs enable content verification and deduplication:

```bash
# Compute RID for a file
bun run -e "import { computeRid } from '@rabit/client'; \
  const content = await Bun.file('README.md').arrayBuffer(); \
  console.log(await computeRid(new Uint8Array(content)));"
```

### 2. Use Git as Primary Root

Git provides:
- Versioning (track changes over time)
- Integrity (cryptographic verification)
- Mirroring (easy replication)
- Collaboration (pull requests, reviews)

Always prefer Git roots when possible:

```json
{
  "roots": [
    { "git": {...} },     // Primary
    { "https": {...} }    // Fallback
  ]
}
```

### 3. Provide Agent Instructions

Help AI agents understand your content:

```json
{
  "manifest": {
    "agents": {
      "context": "API documentation for the Acme Platform",
      "entryPoint": "quickstart",
      "hints": [
        "Start with quickstart guide for orientation",
        "Code examples are executable",
        "Versioned by API version number"
      ],
      "ignore": ["internal/*", "drafts/*"],
      "permissions": {
        "index": true,
        "summarize": true,
        "quote": "with-attribution",
        "train": false
      }
    }
  }
}
```

### 4. Include Repository Metadata

Link to standard files:

```json
{
  "manifest": {
    "repo": {
      "readme": "README.md",
      "license": "LICENSE",
      "contributing": "CONTRIBUTING.md",
      "security": "SECURITY.md",
      "changelog": "CHANGELOG.md"
    }
  }
}
```

### 5. Set Cache Directives

Control client caching behavior:

```json
{
  "manifest": {
    "cache": {
      "maxAge": 3600,
      "staleWhileRevalidate": 86400
    }
  }
}
```

### 6. Use Semantic Relation Types

Tag entries with appropriate relations:

```json
{
  "entries": [
    { "rel": ["index", "about"] },      // Main entry point
    { "rel": ["item"] },                // Regular document
    { "rel": ["collection"] },          // Group of entries
    { "rel": ["license"] },             // License info
    { "rel": ["author"] }               // Author info
  ]
}
```

### 7. Validate Your Manifest

Use JSON Schema for validation:

```bash
bun x ajv validate \
  -s https://rabit.dev/schemas/burrow-0.2.json \
  -d .burrow.json
```

### 8. Test with Rabit Client

Verify your burrow works:

```bash
# Install client
bun install -g @rabit/client

# Test burrow
rabit burrow https://yourdomain.com/

# Test traversal
rabit traverse https://yourdomain.com/

# Generate report
rabit report https://yourdomain.com/
```

---

## Example Use Cases

### Use Case 1: OSS Project on GitHub

**Scenario**: You maintain an open-source project with docs in `/docs`.

**Solution**:
1. Add `.burrow.json` to `/docs`
2. Enable GitHub Pages from `/docs` directory
3. Add Git and HTTPS roots
4. Use GitHub Actions to auto-update manifest

**Benefits**:
- Docs versioned alongside code
- Available via Git and HTTPS
- Automatic updates on commit

### Use Case 2: Enterprise Warren Across Azure DevOps Repos

**Scenario**: Your company has 50+ internal documentation repos across Azure DevOps.

**Solution**:
1. Add `.burrow.json` to each repo
2. Create central warren in a dedicated repo
3. List all doc repos in `.warren.json`
4. Host warren on internal web server
5. Configure SSH auth for private repos

**Benefits**:
- Centralized discovery
- Works with existing Azure DevOps infrastructure
- Proper authentication for internal docs

### Use Case 3: Public Docs with Private Extensions

**Scenario**: You have public docs and private enterprise features.

**Solution**:
1. Public burrow at https://docs.example.com
2. Private burrow at https://enterprise.example.com
3. Warren lists both with appropriate tags
4. Use `auth.required: true` for private burrow

**Benefits**:
- Single discovery endpoint
- Clear separation of public/private
- Enterprise customers see all docs

---

## Troubleshooting

### Manifest not found

**Problem**: `manifest_not_found` error

**Solution**:
- Ensure `.burrow.json` is at burrow root
- Check file has correct name (with leading dot)
- Verify file is committed to Git
- Confirm HTTPS URL ends with trailing slash

### RID verification failed

**Problem**: `verification_failed` error

**Solution**:
- Recompute RIDs after editing files
- Ensure no line-ending conversions (Git autocrlf)
- Use binary mode for non-text files

### Git clone failed

**Problem**: `transport_error` when using Git roots

**Solution**:
- Verify Git is installed (`git --version`)
- Check remote URL is correct
- Ensure ref exists (`refs/heads/main`, not just `main`)
- For private repos, configure SSH keys or credentials

### Private IP rejected

**Problem**: `transport_error: Private IP access forbidden`

**Solution**:
- Don't use internal IPs in manifests
- Use public DNS names
- For internal use, configure allowlist in client

---

## Additional Resources

- **RBT Specification**: [rabit-spec-draft-2026-01-12.md](../../rabit-spec-draft-2026-01-12.md)
- **Client README**: [README.md](../README.md)
- **Example Burrows**: [../../rabit-examples/burrows/](../../rabit-examples/burrows/)
- **Server Implementation**: [../../rabit-server/](../../rabit-server/)

---

## Questions?

Open an issue at https://github.com/itlackey/rabit/issues
