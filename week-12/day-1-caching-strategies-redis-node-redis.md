# Day 1 — Caching Strategies, Redis & `node-redis`

**Next:** [Day 2 — API Caching, Rate Limiting & Sessions](day-2-api-caching-rate-limiting-sessions.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Explain why caching helps and what consistency cost it introduces
- Compare cache-aside, write-through, and write-behind at a high level
- Choose a TTL and invalidation strategy for changing data
- Recognize common Redis data types and select one for a use case
- Connect to Redis with `node-redis`, reuse the client, and close it cleanly
- Cache a database query without making Redis the source of truth

---

## 1. Why Cache?

A cache stores a temporary copy of data so repeated reads can avoid expensive work:

```text
Request → cache hit → return cached value
        ↘ cache miss → query database → cache result → return result
```

Caching can lower response time and database load. It also adds operational and correctness costs: cached values consume memory, may become stale, and can disappear when Redis restarts or evicts keys. Treat the database as authoritative unless the application has deliberately chosen a different durable store.

### Cache-aside (lazy loading)

The application checks the cache, loads on a miss, then stores the result. This is a useful default for read-heavy API data because unused data is not cached.

### Write-through

The application writes to the database and updates the cache as part of the same application operation. Reads can be fresh, but coordinating both stores is not a true atomic transaction; failures must be handled.

### Write-behind

The application writes to a cache first and persists later. This can improve write throughput, but losing or delaying writes can lose business data. Do not use it for ordinary application records without a carefully designed durable queue and recovery plan.




Caching strategies dictate **how and when data moves between your application, your database, and your cache** (like Redis). Choosing the right strategy affects how fast your app runs, how fresh your data is, and what happens if your system crashes.


Deeper, practical breakdown of the **three main caching strategies** using a real-world example: an **online shopping app** where users view and update product details.

---

### 1. Cache-Aside (Lazy Loading)

*This is the strategy you felt comfortable with—and it is the most common default for read-heavy apps.*

* **How it works:**
1. When a user requests a product (`GET /products/42`), the application **checks the cache first**.
2. **If it’s a Cache Hit:** The cache returns the data instantly.
3. **If it’s a Cache Miss:** The app queries the **database**, gets the product, **saves a copy into the cache** for future requests, and then returns it to the user.
4. **On a Write/Update:** When the product details change, the application updates the database and then **invalidates (deletes)** that key from the cache so the next read fetches fresh data.


* **Why use it:** It is efficient. **Only data that is actually requested gets cached.** If you have 1 million products in your database, but users only look at 500 of them today, Cache-aside only keeps those 500 in memory.
* **Trade-off:** The very first person to request a newly updated or rarely viewed item will experience a "cache miss" delay because the app has to go to the database first.

---

### 2. Write-Through

*This strategy treats the cache as an active participant in every write operation.*

* **How it works:**
1. When a user updates a product (e.g., changes the price), the application sends the update to a caching layer or a service.
2. That layer **simultaneously writes the new data to the database AND updates the cache** in the same general operation.
3. Subsequent reads always hit the cache and are **guaranteed to be fresh**.


* **Why use it:** There is **zero stale data**. Because the cache is updated the exact moment the database is updated, readers never see old information. It is great for applications where users cannot tolerate seeing outdated info even for a few seconds.
* **Trade-off:** **Wasted memory and slower writes.** Every single write operation updates the cache, even if nobody ever reads that product again. Also, writing to two different places at once introduces complexity—what happens if the database write succeeds, but the cache write fails?

---

### 3. Write-Behind (Write-Back)

*This is the high-performance, high-risk speed demon of caching.*

* **How it works:**
1. When data is created or updated, the application **writes it *only* to the cache** and immediately tells the user, "Success!"
2. The cache system quietly, in the background, batches these changes and **writes them to the database asynchronously** a few seconds or minutes later.


* **Why use it:** **Blazing fast write performance.** If your app is getting thousands of writes per second (like real-time chat messages, click tracking, or IoT sensor logs), writing straight to a fast in-memory cache and letting it bulk-save to the database later saves massive amounts of database strain.
* **Trade-off:** **Risk of data loss.** Because the cache acknowledges success before the data safely reaches the permanent database, if Redis crashes or loses power before the background sync happens, **those changes vanish forever**. You should never use write-behind for critical business data (like financial transactions or user accounts) unless you have a bulletproof durable queue backing it up.

---

### Summary Table

| Strategy | When does data get into the cache? | Where do writes go first? | Best used for | Main Risk |
| --- | --- | --- | --- | --- |
| **Cache-Aside** | On a read "miss" (lazy) | Database, then delete cache key | Read-heavy product catalogs, user profiles | First reader hits a slow database query |
| **Write-Through** | Immediately on every write | Database **and** Cache simultaneously | Data that must never be stale | Extra write overhead; unused data fills memory |
| **Write-Behind** | Immediately on write | Cache first, Database later (background) | High-throughput logs, metrics, counters | Data loss if the cache crashes before syncing |



For this week, use **cache-aside** and invalidate after successful database writes.

---

## 2. TTL and Invalidation

A **time to live (TTL)** limits how long a key remains available. A TTL bounds staleness and cleans up old keys automatically:

```text
product:42 → value expires after 5 minutes
```

TTL is not a substitute for invalidation when a write should be visible immediately. A common policy uses both:

1. Read through the cache.
2. Set a short, appropriate TTL.
3. After a successful create/update/delete, invalidate all affected keys.
4. On the next read, reload from the database.

Example: changing a product may affect the detail key `product:42`, a category listing, and a search result. Identify those dependencies before implementing invalidation.

| Strategy | Advantage | Trade-off |
|----------|-----------|-----------|
| Short TTL | Simple, bounds staleness | A value may be stale until expiry |
| Delete key on write | Next read gets current data | Must know every affected key |
| Versioned key | Easy to move readers to a new version | Old versions remain until TTL/eviction |
| No cache for that data | No invalidation complexity | More database work |

Add a small random **TTL jitter** when many keys are populated together, so they do not all expire at once. Avoid caching errors as successful empty results; if caching negative results, give them a deliberate short TTL.

### Cache stampede

If a popular key expires, many concurrent requests can all miss and query the database. Start with sensible TTLs and monitor database load. For high-traffic keys, consider request coalescing, a short lock, or stale-while-revalidate. Do not add distributed locking until measurement shows it is needed.

---

## 3. Redis Data Types

Redis keys hold values of different types. Select a type based on the operations the application needs:

| Type | Typical use | Example |
|------|-------------|---------|
| String | Cached JSON, counters, simple values | `product:42` |
| Hash | Fields of one object, such as a profile | `user:17` |
| List | Ordered items / simple queues | recent events |
| Set | Unique membership | users in a group |
| Sorted set | Ranked values or time-ordered scores | leaderboard |
| Stream | Append-oriented event log with consumer groups | integration events |

Redis also supports structures such as geospatial indexes and probabilistic data types. Choose based on required commands and consistency; do not store every value as a serialized string by habit.

Strings and JSON are convenient for cached database results. Hashes can be useful for field-level operations, but the application must consider how partial updates interact with database records.

---

## 4. Connect with `node-redis`

Install the Redis client and `dotenv`:

```bash
npm install redis dotenv
```

Create one reusable client when the application starts. Do not create a new connection for every request:

```js
// src/redis.js
import "dotenv/config";
import { createClient } from "redis";

const url = process.env.REDIS_URL;
if (!url) {
  throw new Error("REDIS_URL is required");
}

export const redis = createClient({ url });

redis.on("error", (error) => {
  console.error("Redis client error", error);
});

export async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
  return redis;
}
```

Connect during startup and close during graceful shutdown:

```js
import { connectRedis, redis } from "./redis.js";

await connectRedis();

async function shutdown() {
  if (redis.isOpen) {
    await redis.quit();
  }
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
```

In a real server, coordinate shutdown with the HTTP server and database pool too. Surface a failed startup connection rather than silently pretending Redis is available.

### Basic commands

```js
// String with an expiration of 300 seconds
await redis.set("week12:message", "hello", { EX: 300 });
const message = await redis.get("week12:message");

// Hash
await redis.hSet("week12:user:17", {
  displayName: "Riley",
  role: "student",
});
const userFields = await redis.hGetAll("week12:user:17");

// Set
await redis.sAdd("week12:class:members", "user:17", "user:18");
const members = await redis.sMembers("week12:class:members");

// Sorted set: member with its score
await redis.zAdd("week12:leaderboard", [
  { score: 18, value: "user:17" },
  { score: 22, value: "user:18" },
]);
const leaders = await redis.zRange("week12:leaderboard", 0, 9, { REV: true });
```

Namespacing (`week12:` here) prevents unrelated features from colliding. Production key names should encode the feature and every input that affects the value.

---

## 5. Cache a Database Query

Use a repository or service so routes do not need to know about Redis commands:

```js
const PRODUCT_TTL_SECONDS = 300;

export function createProductService({ products, redis }) {
  return {
    async findById(id) {
      const key = `product:${id}`;
      const cached = await redis.get(key);
      if (cached !== null) {
        return JSON.parse(cached);
      }

      const product = await products.findById(id);
      if (product !== null) {
        await redis.set(key, JSON.stringify(product), {
          EX: PRODUCT_TTL_SECONDS,
        });
      }
      return product;
    },

    async update(id, input) {
      const updated = await products.update(id, input);
      await redis.del(`product:${id}`);
      return updated;
    },
  };
}
```

The example assumes the repository returns JSON-serializable values and validates the stored representation. In a real application, decide how to handle Redis failures: a cache read/write failure may be allowed to fall back to the database, but log and measure it explicitly. Do not catch every error and return an empty object, because that disguises database failures as successful cache misses.

Only cache what the caller is allowed to see. Include tenant or authorization scope in the key when it changes the result. Never use an untrusted string directly as an unbounded key.

### Invalidation order

Update the durable database first. If that succeeds, invalidate the relevant cache keys. If invalidation fails, the TTL provides an upper bound on stale data, and the failure should be observable. For especially sensitive data, choose a stronger coordination strategy rather than assuming two independent writes are atomic.

---

## Check Your Understanding

1. Why is cache-aside a reasonable default for a read-heavy product endpoint?
2. What is the difference between TTL and invalidation?
3. Which Redis type best matches unique group membership? Which fits a leaderboard?
4. Why should a database update happen before the related cache key is deleted?
5. What additional cache-key input may be needed for a multi-tenant API?
