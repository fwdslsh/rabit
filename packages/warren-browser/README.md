# @fwdslsh/warren-browser

> **Lightweight browser client for navigating Warren and Burrow files - vanilla HTML/JS with no dependencies**

A sleek, zero-dependency browser client for exploring Rabit warrens and burrows. Built with vanilla HTML, CSS, and JavaScript for maximum portability and simplicity.

[![License](https://img.shields.io/badge/License-CC--BY--4.0-blue.svg)](LICENSE)
[![Rabit Spec](https://img.shields.io/badge/Rabit-v0.4.0-green.svg)](../../docs/rabit-spec.md)

## Features

- **Zero dependencies** - Pure vanilla HTML, CSS, and JavaScript
- **Lightweight** - Under 50KB total (unminified)
- **Dynamic navigation** - Browse warrens and burrows with an intuitive UI
- **Content viewer** - View file contents directly in the browser
- **Dark/Light theme** - Toggle between themes with a single click
- **URL parameters** - Share links to specific locations
- **Responsive design** - Works on desktop and mobile devices
- **Built-in caching** - Reduces redundant network requests

## Quick Start

### Option 1: Open directly in browser

Simply open `index.html` in your browser:

```bash
cd packages/warren-browser
open index.html    # macOS
xdg-open index.html # Linux
start index.html    # Windows
```

### Option 2: Serve locally

For full functionality (CORS), serve the files with any HTTP server:

```bash
# Using Python
python3 -m http.server 8080

# Using Bun
bunx serve .

# Using Node.js
npx serve .
```

Then open http://localhost:8080 in your browser.

### Option 3: Deploy to any static host

Simply upload the three files to any static hosting service:
- `index.html`
- `styles.css`
- `app.js`

## Usage

1. **Enter a warren address** in the address bar (default: `warren.fwdslsh.dev`)
2. **Click "Go"** or press Enter to navigate
3. **Browse entries** in the sidebar navigation
4. **Click entries** to view content or navigate deeper into burrows
5. **Use breadcrumbs** to navigate back to parent locations

### URL Parameters

You can link directly to a specific warren or burrow:

```
index.html?url=https://example.com/docs/
```

### Keyboard Shortcuts

- **Enter** (in address bar): Navigate to entered address
- **Click theme toggle (◐)**: Switch between light and dark themes

## Entry Types

The browser displays different icons for each entry type:

| Icon | Kind | Description |
|------|------|-------------|
| 📄 | file | Single file entry |
| 📁 | dir | Directory without its own burrow |
| 🐰 | burrow | Nested burrow (sub-directory with manifest) |
| 🗺️ | map | Direct reference to a burrow file |
| 🔗 | link | External URL reference |
| 🏠 | warren | Warren registry |

## Architecture

```
warren-browser/
├── index.html   # Main HTML structure
├── styles.css   # Lightweight CSS (theming, layout, components)
├── app.js       # Vanilla JS (fetching, navigation, state management)
└── README.md    # This file
```

### Key Components

- **Address Bar**: Enter warren/burrow URLs
- **Sidebar**: Navigation tree with entry list
- **Breadcrumb**: Path navigation
- **Content Area**: Entry cards and file content viewer
- **Status Bar**: Current status and cache info

### State Management

The app maintains state for:
- Current warren/burrow
- Navigation stack (for breadcrumb navigation)
- Cache (in-memory, with 1-hour TTL)
- Theme preference (persisted in localStorage)

## Customization

### Theming

Modify CSS variables in `:root` and `[data-theme="dark"]` selectors in `styles.css`:

```css
:root {
  --accent-color: #6366f1;
  --bg-primary: #ffffff;
  /* ... */
}

[data-theme="dark"] {
  --bg-primary: #1a1b1e;
  /* ... */
}
```

### Default Address

Change the default warren address in `app.js`:

```javascript
const CONFIG = {
  defaultAddress: 'warren.fwdslsh.dev',
  // ...
};
```

## Browser Compatibility

Works in all modern browsers:
- Chrome/Chromium 90+
- Firefox 90+
- Safari 14+
- Edge 90+

## Development

No build step required! Edit the files directly and refresh your browser.

For development with live reload:

```bash
# Using browser-sync
npx browser-sync start --server --files "*.html, *.css, *.js"
```

## Security Notes

- The client only makes read-only HTTP GET requests
- All content is fetched via HTTPS (HTTP addresses are upgraded)
- No data is sent to external servers beyond fetching manifests and content
- Cache is stored only in browser memory (cleared on page refresh)

## License

This project is licensed under [CC-BY-4.0](../../LICENSE).

## Links

- **Rabit Specification**: [docs/rabit-spec.md](../../docs/rabit-spec.md)
- **CLI Client**: [@fwdslsh/rabit-client](../rabit-client/)
- **Repository**: https://github.com/fwdslsh/rabit
- **Issues**: https://github.com/fwdslsh/rabit/issues
