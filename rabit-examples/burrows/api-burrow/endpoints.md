# API Endpoints

## Resources

### List Resources

```http
GET /v1/resources
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `limit` | integer | Max results (default: 20) |
| `offset` | integer | Pagination offset |
| `filter` | string | Filter expression |

**Example:**

```bash
curl https://api.acme.example.com/v1/resources?limit=10
```

**Response:**

```json
{
  "data": [
    {
      "id": "res_123",
      "name": "My Resource",
      "createdAt": "2025-01-15T12:00:00Z"
    }
  ],
  "meta": {
    "total": 42,
    "limit": 10,
    "offset": 0
  }
}
```

### Create Resource

```http
POST /v1/resources
```

**Body:**

```json
{
  "name": "New Resource",
  "tags": ["production", "critical"]
}
```

**Response:** `201 Created`

```json
{
  "id": "res_456",
  "name": "New Resource",
  "tags": ["production", "critical"],
  "createdAt": "2025-01-15T12:00:00Z"
}
```

### Get Resource

```http
GET /v1/resources/:id
```

### Update Resource

```http
PUT /v1/resources/:id
```

### Delete Resource

```http
DELETE /v1/resources/:id
```

**Response:** `204 No Content`

## Users

### Get Current User

```http
GET /v1/users/me
```

**Response:**

```json
{
  "id": "usr_789",
  "email": "user@example.com",
  "name": "Jane Doe",
  "role": "admin"
}
```

### Update Current User

```http
PUT /v1/users/me
```

## Webhooks

### List Webhooks

```http
GET /v1/webhooks
```

### Create Webhook

```http
POST /v1/webhooks
```

**Body:**

```json
{
  "url": "https://example.com/webhook",
  "events": ["resource.created", "resource.deleted"]
}
```
