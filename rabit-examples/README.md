# Rabit Reference Client

A proof-of-concept CLI client demonstrating the Rabit Burrow Traversal (RBT) specification.

## Structure

```
rabit-examples/
└── client/                  # Bun.js CLI client
    ├── package.json
    ├── types.ts             # TypeScript types for RBT
    ├── rabit.ts             # Client library
    └── cli.ts               # CLI commands
```

## Usage

```bash
cd client
bun install

# List burrows in a warren
bun run cli.ts warren <warren-url>

# Show burrow info
bun run cli.ts burrow <burrow-url>

# List entries
bun run cli.ts entries <burrow-url>

# Fetch a specific entry
bun run cli.ts fetch <burrow-url> <entry-id>

# Traverse all entries
bun run cli.ts traverse <burrow-url>

# Search entries
bun run cli.ts search <burrow-url> <query>

# Show agent instructions
bun run cli.ts agent-info <burrow-url>
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `warren <url>` | List all burrows registered in a warren |
| `burrow <url>` | Show burrow manifest metadata |
| `entries <url>` | List all entries in a burrow |
| `fetch <url> <id>` | Fetch and display a specific entry |
| `traverse <url>` | Traverse and fetch all entries (BFS) |
| `search <url> <q>` | Search entries by title/summary |
| `agent-info <url>` | Show agent instructions and hints |

## Limitations

- This is a proof-of-concept implementation
- Only supports HTTPS roots (not Git)
- RID verification is not implemented
- Child pagination is not implemented

For a production implementation, see the full RBT specification.
