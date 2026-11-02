# Week 12 — Caching, Redis & Scheduled Jobs

## Overview

This week adds a fast, shared data layer and background work to the Node.js applications built in previous weeks. You will apply cache-aside to database reads, use Redis for atomic rate limits and server-side sessions, and schedule a report or synchronization job with `node-cron`.

Caching improves latency and reduces repeated database work, but introduces a consistency problem: cached values can become stale. Every cache needs an expiration policy and a deliberate invalidation strategy. Redis is an in-memory data store, not a substitute for the system of record; durable business data should remain in the database.

## Prerequisites

- Week 7–8: Node.js, async/await, Express, middleware, authentication, and input validation
- Week 9–11: SQL/ORM or MongoDB repositories and database query patterns
- Node.js, npm, and a Redis instance (local or hosted)

## Files

| File | Topic | Type |
|------|-------|------|
| [Day 1](day-1-caching-strategies-redis-node-redis.md) | Cache strategies, TTL, invalidation, Redis data types, `node-redis` | Theory + code |
| [Day 2](day-2-api-caching-rate-limiting-sessions.md) | API response caching, Redis rate limiting, session stores | Theory + code |
| [Day 3](day-3-node-cron-queues-scheduled-sync.md) | `node-cron`, queues, scheduled data synchronization | Hands-on |
| [Assignments](assignments.md) | Database cache, rate limiter/session store, scheduled report | Practice |

## Tools & Packages

Use the Redis server or hosted Redis service approved for your project. Install only the packages needed for your chosen framework:

```bash
npm install redis dotenv
npm install express-session connect-redis
npm install node-cron
npm install bullmq
```

`express-session`, `connect-redis`, `node-cron`, and `bullmq` are used in the relevant lessons; a project does not need every package if it does not use that feature.

Keep connection details and secrets outside source control:

```dotenv
REDIS_URL=redis://127.0.0.1:6379
SESSION_SECRET=replace-with-a-long-random-secret
```

Commit an `.env.example` with placeholders, not actual credentials. Use the connection URL and TLS settings provided by a hosted Redis provider when applicable.

## Learning Outcomes

By the end of the week, you should be able to:

- Explain cache-aside, write-through, TTL, cache invalidation, and stale-data trade-offs
- Use Redis strings, hashes, lists, sets, sorted sets, and understand when streams or other structures fit
- Connect to Redis with `node-redis`, reuse the client, and handle its lifecycle and errors
- Cache database/API reads with bounded keys, expiration, and a clear invalidation strategy
- Implement an atomic Redis-backed rate limit that works across multiple app instances
- Store Express sessions in Redis without treating the session store as the source of user data
- Schedule a job with `node-cron` and make it safe to retry, observe, and run in a multi-instance deployment
- Explain when a durable queue is more appropriate than an in-process timer

## Suggested Rhythm

```text
Mon Day 1 — caching strategies, Redis data types, node-redis
Tue Day 2 — API response caching, rate limits, Redis session store
Wed Day 3 — node-cron, queues, scheduled data sync
Thu–Fri   — assignments 1–3, tests, and documentation
```

## Ground Rules

- Cache data that is safe to recompute; keep the database or other durable store authoritative.
- Every cache entry must have a bounded lifetime or a documented invalidation path. Prefer both for data that changes.
- Keep cache keys namespaced and include parameters that change the result, such as tenant, locale, filters, and page.
- Invalidate related cache entries after a successful write; do not invalidate before the database operation succeeds.
- Rate-limit by a carefully chosen identity. Do not trust arbitrary forwarded-IP headers unless the Express proxy configuration is correct.
- Use HTTP-only, secure-in-production, appropriately scoped session cookies; never put session identifiers in URLs.
- A `node-cron` task runs only while its process is alive. In a multi-instance deployment, prevent duplicate work with a queue, distributed coordination, or a single designated scheduler.
- Scheduled work should be idempotent, bounded, observable, and safe to retry.
- Do not log Redis URLs, session secrets, session IDs, or sensitive cached values.

## Sources

- [Redis data types](https://redis.io/docs/latest/develop/data-types/)
- [Redis Node.js guide](https://redis.io/docs/latest/develop/clients/nodejs/)
- [node-redis documentation](https://github.com/redis/node-redis)
- [Express session documentation](https://expressjs.com/en/resources/middleware/session.html)
- [connect-redis documentation](https://github.com/tj/connect-redis)
- [node-cron documentation](https://nodecron.com/)
- [BullMQ documentation](https://docs.bullmq.io/)
