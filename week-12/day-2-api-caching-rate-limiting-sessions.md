# Day 2 — API Caching, Rate Limiting & Redis Sessions

**Previous:** [Day 1 — Caching Strategies, Redis & `node-redis`](day-1-caching-strategies-redis-node-redis.md)  
**Next:** [Day 3 — `node-cron`, Queues & Scheduled Data Sync](day-3-node-cron-queues-scheduled-sync.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Choose which API responses are safe to cache and construct a complete cache key
- Use HTTP caching headers separately from server-side Redis caching
- Explain why rate-limit updates must be atomic across app instances
- Implement a fixed-window Redis limiter using a Lua script
- Configure an Express session store backed by Redis
- Apply safe session-cookie settings and distinguish sessions from JWTs

---

## 1. Cache API Responses Deliberately

An API response can be cached in Redis by the application, by a browser, or by an intermediary HTTP cache. These are different layers:

- **Redis response/data cache:** controlled by application code; can be shared across server instances.
- **HTTP cache headers:** tell clients and proxies whether and how to reuse a response.
- **Database query cache:** stores a result close to the data-access layer, often shared by multiple endpoints.

Before caching a response, ask:

1. Is it identical for every caller?
2. Which query parameters, locale, tenant, or authorization scope affect it?
3. How stale may it be?
4. Which writes make it stale?
5. Is it safe to persist this response in Redis?

For example, a public list endpoint might use:

```js
const key = `api:products:v1:category=${category}:page=${page}:locale=${locale}`;
```

Use stable, validated values in keys. Include all result-shaping inputs; omitting one can return the wrong page, locale, tenant's data, or permission-specific result. Set a TTL and invalidate affected list keys when products change. If listing invalidation is difficult, a short TTL may be a deliberate consistency trade-off.

Do not cache personalized or sensitive responses under a key shared by different users. For private responses, either avoid shared caching or include a safe authorization scope and use appropriate HTTP directives such as `Cache-Control: private, no-store` when the response should not be stored by shared caches.

Example cache-aside route using a service:

```js
app.get("/api/products", async (req, res, next) => {
  try {
    const result = await productService.list({
      category: parseCategory(req.query.category),
      page: parsePage(req.query.page),
      locale: req.acceptsLanguages()[0] ?? "en",
    });
    res.set("Cache-Control", "public, max-age=30");
    res.json(result);
  } catch (error) {
    next(error);
  }
});
```

The service should own Redis keys and invalidation. The route still validates query inputs and returns the correct HTTP response.

---

## 2. Atomic Redis Rate Limiting

A rate limiter bounds requests over time. An in-memory JavaScript counter is not sufficient when the application has multiple processes or instances: each has a different counter. Redis provides shared state, but a sequence such as `GET`, increment in JavaScript, and `SET` can race when requests arrive concurrently.

Use an atomic Redis operation. This fixed-window script increments a counter and sets its expiration only on the first request:

```js
const fixedWindowScript = `
  local count = redis.call("INCR", KEYS[1])
  if count == 1 then
    redis.call("PEXPIRE", KEYS[1], ARGV[1])
  end
  return { count, redis.call("PTTL", KEYS[1]) }
`;

export async function consumeRateLimit(redis, key, windowMs) {
  const [count, remainingMs] = await redis.eval(fixedWindowScript, {
    keys: [key],
    arguments: [String(windowMs)],
  });
  return { count: Number(count), remainingMs: Number(remainingMs) };
}
```

`EVAL` executes the counter and expiry logic atomically on Redis. A fixed window is easy to understand, but a caller may make requests on both sides of a window boundary. Sliding-window or token-bucket algorithms have different trade-offs; choose based on the product requirement.

Express middleware sketch:

```js
function createRateLimitMiddleware({ redis, limit, windowMs }) {
  return async (req, res, next) => {
    try {
      const identity = req.user?.id ?? req.ip;
      const key = `rate-limit:api:${identity}`;
      const { count, remainingMs } = await consumeRateLimit(redis, key, windowMs);

      res.set("RateLimit-Limit", String(limit));
      res.set("RateLimit-Remaining", String(Math.max(0, limit - count)));

      if (count > limit) {
        res.set("Retry-After", String(Math.ceil(remainingMs / 1000)));
        return res.status(429).json({ error: "Too many requests" });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
```

The failure policy is a product decision: failing open keeps the API available but removes protection during Redis outages; failing closed preserves the limit but may reject legitimate traffic. Make the choice explicit, log/measure failures, and consider different policies for login, public reads, and internal endpoints.

Use a trusted authenticated user ID where available. For anonymous clients, `req.ip` is meaningful only when Express `trust proxy` is configured to match the actual deployment. Do not trust a caller-supplied identity header or arbitrary `X-Forwarded-For` value.

---

## 3. Redis-Backed Express Sessions

An Express session keeps a session identifier in a browser cookie while server-side session data lives in a store. A Redis store lets multiple app instances access the same session and avoids the in-memory store's restart and scaling limitations.

Install compatible versions of the middleware and store:

```bash
npm install express-session connect-redis
```

Example with a connected `node-redis` client:

```js
import session from "express-session";
import { RedisStore } from "connect-redis";
import { redis } from "./redis.js";

app.use(
  session({
    store: new RedisStore({ client: redis, prefix: "app:sess:" }),
    name: "sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8,
    },
  }),
);
```

Validate `SESSION_SECRET` at startup rather than allowing an empty or predictable secret. If TLS terminates at a trusted reverse proxy, configure Express `trust proxy` correctly so secure cookies work; do not blindly trust all proxies.

After login, regenerate the session ID to reduce session-fixation risk, then store only the minimum session data needed (for example, the user ID and a small set of claims). On logout, destroy the session and clear the cookie. Do not put secrets, passwords, or full user records in the session.

Sessions and JWTs solve different problems. A session is server-managed and can be invalidated centrally; a JWT is a signed token whose revocation and storage require separate decisions. Redis being the session store does not make the session cookie itself a JWT.

---

## 4. Operational Considerations

- **Key expiration:** rate-limit keys and sessions need finite lifetimes.
- **Privacy:** avoid email addresses or other personal data in plaintext key names.
- **Monitoring:** measure hit rate, Redis latency/errors, evictions, rate-limit rejections, and session-store failures.
- **Availability:** decide what the API does when Redis is unavailable; do not hide failures behind empty success responses.
- **Memory:** set Redis memory/eviction policies according to the deployment. A cache can be evicted; a session store still needs an appropriate availability and persistence plan.
- **Testing:** test concurrent increments and verify that separate application instances share the same limit and session.

---

## Check Your Understanding

1. Which values must be part of a cached list-response key?
2. Why can a JavaScript `Map` not enforce a limit shared by several Node processes?
3. What race does the Lua script prevent?
4. Why might a response for one logged-in user not be safe in a shared cache?
5. What information should a session store contain, and what should it avoid storing?
