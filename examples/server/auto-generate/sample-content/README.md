# Auto-Generated Burrow Sample

This is sample content to demonstrate the auto-generate burrow server.

## How It Works

The server automatically scans this directory and generates a `burrow.json` manifest on the fly. No manual manifest creation needed!

## Try It

1. Start the server: `docker compose up -d`
2. View the manifest: `curl http://localhost:8095/burrow.json`
3. Add more files to this directory and the manifest updates automatically

## Supported Conventions

The manifest is available at all three convention locations:
- `http://localhost:8095/burrow.json` (non-dotfile)
- `http://localhost:8095/.burrow.json` (dotfile)
- `http://localhost:8095/.well-known/burrow.json` (RFC 8615)

## Customization

Edit `docker-compose.yml` to:
- Change the port
- Mount your own directory
- Set a custom title
- Configure exclusion patterns
- Adjust scan depth

## Next Steps

- Mount your own directory by editing `docker-compose.yml`
- Check the [README](../README.md) for all environment variables
- See the [Rabit specification](../../../docs/rabit-spec.md) for details
