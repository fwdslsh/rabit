# Authentication

## Overview

The Acme API uses Bearer token authentication. All requests must include a valid token in the `Authorization` header.

## Obtaining a Token

### Via Dashboard

1. Log in to https://app.acme.example.com
2. Navigate to Settings → API Tokens
3. Click "Generate New Token"
4. Copy the token (it won't be shown again)

### Via OAuth2

```bash
curl -X POST https://auth.acme.example.com/oauth/token \
  -d grant_type=client_credentials \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET
```

Response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## Using the Token

Include the token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.acme.example.com/v1/resources
```

## Token Scopes

| Scope | Description |
|-------|-------------|
| `read` | Read-only access |
| `write` | Read and write access |
| `admin` | Full administrative access |

## Token Expiration

- Dashboard tokens: Never expire (can be revoked)
- OAuth2 tokens: Expire after 1 hour (use refresh tokens)

## Revoking Tokens

Revoke tokens via the dashboard or API:

```bash
curl -X DELETE https://api.acme.example.com/v1/tokens/TOKEN_ID \
  -H "Authorization: Bearer ADMIN_TOKEN"
```
