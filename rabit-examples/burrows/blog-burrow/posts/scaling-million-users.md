# Scaling to 1 Million Users

*Published: January 10, 2025 | Author: Jane Chen, Principal Engineer*

Last month, we hit a major milestone: 1 million active users on the Acme Platform. Here's how we got there.

## The Challenge

When we started, our architecture was simple: a monolithic Rails app backed by PostgreSQL. It worked great for our first 10,000 users. Then things got interesting.

## Key Optimizations

### 1. Database Sharding

We implemented horizontal sharding based on tenant ID. Each shard handles roughly 100K users.

```
Shard 0: tenant_id % 10 == 0
Shard 1: tenant_id % 10 == 1
...
```

### 2. Caching Layer

We added Redis clusters for:

- Session storage
- API response caching
- Rate limiting counters

Cache hit rate improved from 60% to 94%.

### 3. Async Processing

Moved all non-critical operations to background jobs:

- Email sending
- Analytics events
- Webhook delivery
- Report generation

## Results

| Metric | Before | After |
|--------|--------|-------|
| P99 Latency | 2.3s | 180ms |
| Requests/sec | 500 | 15,000 |
| Error Rate | 2.1% | 0.03% |

## Lessons Learned

1. **Measure first.** We spent too long optimizing things that didn't matter.
2. **Shard early.** Migration at scale is painful.
3. **Cache aggressively.** But invalidate carefully.

## What's Next

We're targeting 10 million users by end of year. Stay tuned for part 2!
