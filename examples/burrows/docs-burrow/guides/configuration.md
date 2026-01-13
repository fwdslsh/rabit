# Configuration Guide

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ACME_PORT` | Server port | `3000` |
| `ACME_ENV` | Environment | `development` |
| `ACME_LOG_LEVEL` | Log verbosity | `info` |

## Configuration File

Create `acme.config.js` in your project root:

```javascript
export default {
  port: process.env.ACME_PORT || 3000,
  database: {
    host: 'localhost',
    port: 5432,
    name: 'acme_db'
  },
  features: {
    analytics: true,
    caching: true
  }
};
```

## Per-Environment Config

Use `acme.config.{env}.js` for environment-specific overrides.
