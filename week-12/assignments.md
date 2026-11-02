# Week 12 — Assignments: Caching, Redis & Scheduled Jobs

> Use Node.js with JavaScript or TypeScript. Keep Redis configuration in environment variables, include an `.env.example` with placeholders, and document how to start the required database and Redis service. Never commit credentials or session secrets.

---

## Assignment 1: Database Query Cache with Invalidation

**Objective:** Add cache-aside caching to an existing database-backed API or build a small product/catalog API.

### Required behavior

- Cache at least one database read, such as `GET /api/products/:id` or a filtered list.
- Use a namespaced key that includes every input affecting the result.
- Set a finite TTL and explain the chosen duration.
- On a successful create, update, or delete, invalidate the affected detail and/or list keys.
- Keep database reads and writes in a repository/service layer rather than directly in route handlers.

### Requirements

- The database remains the source of truth.
- Do not cache personalized responses under keys shared between users or tenants.
- Redis failures must be handled deliberately and logged/observable; do not silently return fake data.
- Demonstrate a cache hit, cache miss, and invalidation in tests or a reproducible request sequence.
- Explain the maximum expected stale-data interval if invalidation fails.

### Grading

| Criteria | Points |
|----------|--------|
| Correct cache-aside flow and TTL | 25% |
| Complete key design and invalidation strategy | 30% |
| Database/cache separation and error handling | 25% |
| Tests, setup instructions, and explanation | 20% |

---

## Assignment 2: Redis Rate Limiter and Session Store

**Objective:** Add a shared rate limiter and Redis-backed Express sessions to an API with a login flow.

### Required behavior

1. Apply a per-user or per-client rate limit to at least one route.
2. Use Redis so limits are shared across server instances.
3. Return HTTP `429` with a retry hint when the limit is exceeded.
4. Store Express sessions in Redis and demonstrate login, an authenticated request, and logout.

### Requirements

- Rate-limit counter updates must be atomic (for example, a Lua script or a suitable Redis atomic operation).
- Document whether the limiter is fixed-window, sliding-window, or token-bucket and explain its boundary behavior.
- Configure session cookies with `httpOnly`, `sameSite`, a finite lifetime, and `secure` in production.
- Regenerate the session ID after successful login and destroy the session on logout.
- Configure proxy trust only for the actual deployment topology; do not trust arbitrary client-provided IP headers.
- Do not store plaintext passwords, session secrets, or unnecessary personal data in Redis.
- Add tests for the allowed limit, the first rejected request, session persistence, and logout.

### Grading

| Criteria | Points |
|----------|--------|
| Atomic distributed rate limiting | 30% |
| Correct Redis session lifecycle and cookie settings | 30% |
| Identity/proxy handling and safe failure policy | 20% |
| Tests and setup documentation | 20% |

---

## Assignment 3: `node-cron` Scheduled Report Generator

**Objective:** Generate and persist a daily report on a schedule, with a manual way to run the same report logic.

### Required behavior

- Create a report for a specified date, such as daily order count and total revenue.
- Schedule it with `node-cron` at a documented time and timezone.
- Persist the result so it can be retrieved without regenerating it.
- Make rerunning the same report date safe (for example, use a unique date key and upsert).
- Log start, successful completion, duration, and useful counts; report failures explicitly.

### Requirements

- Put report calculation in a service function independent of the cron callback.
- Do not depend on the machine's implicit local timezone; document the reporting timezone.
- Stop the cron task and close resources during graceful shutdown.
- Document that in-process cron is not durable and explain how you would avoid duplicate execution with multiple app instances.
- Test the report service directly and verify repeated execution does not create duplicate reports.

### Grading

| Criteria | Points |
|----------|--------|
| Correct date-bounded report calculations | 25% |
| Scheduler configuration and timezone correctness | 20% |
| Idempotent persistence and test coverage | 25% |
| Logging, shutdown, and operational explanation | 20% |
| Setup and usage documentation | 10% |

## Overall Assignment Weight

| Assignment | Weight |
|------------|--------|
| 1. Database query cache | 35% |
| 2. Rate limiter and session store | 35% |
| 3. Scheduled report generator | 30% |
