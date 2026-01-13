# API Overview

The Acme API is a RESTful JSON API for managing resources.

## Base URL

```
https://api.acme.example.com/v1
```

## Authentication

All requests require a Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.acme.example.com/v1/resources
```

## Endpoints

### Resources

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/resources` | List all resources |
| `POST` | `/resources` | Create a resource |
| `GET` | `/resources/:id` | Get a resource |
| `PUT` | `/resources/:id` | Update a resource |
| `DELETE` | `/resources/:id` | Delete a resource |

### Users

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users/me` | Get current user |
| `PUT` | `/users/me` | Update current user |

## Rate Limiting

- 1000 requests per hour for authenticated users
- 100 requests per hour for unauthenticated requests

## Errors

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found"
  }
}
```
