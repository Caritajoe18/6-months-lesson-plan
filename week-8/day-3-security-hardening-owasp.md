# Day 3 (Hands-on) — Hardening: Helmet, CORS, Rate Limiting & OWASP Top 10

**Previous:** [Day 2 — JWT Sign/Verify, Protected Routes & Refresh Tokens](day-2-jwt-rbac-refresh-tokens.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Set base security headers with `helmet`
- Configure strict CORS for your API
- Prevent brute-force / abuse with `express-rate-limit`
- Validate and sanitize input with `zod`
- Recognize and defend against the OWASP Top 10 (2021)

---

## 1. Helmet — Security Headers in One Line

Helmet sets a stack of HTTP response headers that browsers enforce.

```bash
npm install helmet
```

```ts
import helmet from "helmet";       // default export
import { createApp } from "./app.js";

const app = createApp();
app.use(helmet());                 // the whole suite, first
app.use(express.json());
```

### What it sets (a few)

| Header | Blocks / enables |
|--------|------------------|
| `Content-Security-Policy` | inline script injection (XSS) |
| `X-Content-Type-Options: nosniff` | MIME-type confusion |
| `Strict-Transport-Security` | only HTTPS for that domain |
| `X-Frame-Options: DENY` | clickjacking |
| `Referrer-Policy` | leaking URL when linking out |

Check the headers:

```bash
curl -sI http://localhost:3000/health | grep -iE "content-security|x-content|x-frame|strict-transport"
```

---

## 2. CORS — Who May Call Our API

```bash
npm install cors
npm install -D @types/cors
```

### The naive (insecure) way

```ts
app.use(cors());                    // "*" — ANY origin can call us. Fine for public APIs, terrible with auth.
```

### Strict, origin-aware CORS

```ts
import cors from "cors";
import type { CorsOptions } from "cors";

const ALLOWED_ORIGINS = new Set(["http://localhost:5173", "https://tasks.example.com"]);

const corsOptions: CorsOptions = {
  origin: (origin, cb) => {
    // origin is undefined for same-origin / curl / non-browser clients → allow
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      cb(null, true);
      return;
    }
    cb(new HttpErrorForbidden("origin not allowed"));
  },
  credentials: true,                // needed if tokens travel in httpOnly cookies
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
```

### CORS + credentials rules

```text
httpOnly-cookie auth  → origin must be explicit (never "*") AND credentials: true
Bearer-token auth     → credentials can be false; you still want a whitelist
```

---

## 3. Rate Limiting — Slow Down the Attackers

```bash
npm install express-rate-limit
```

### One limiter for everything

```ts
import { rateLimit } from "express-rate-limit";

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,     // 15 minutes
  limit: 100,                   // max 100 requests per window per IP
  standardHeaders: true,        // send RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "too many requests, slow down" }
  }
});

app.use(globalLimiter);
```

### A stricter limiter for auth endpoints

```ts
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,                        // 5 attempts/minute on login/register
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: "too many login attempts" } }
});

app.use("/auth/login", authLimiter);
app.use("/auth/register", authLimiter);
```

Why: brute-force password guessing happens against `/auth/login`, not `/api/tasks`.

### Behind a proxy?

```ts
app.set("trust proxy", 1);        // one hop (nginx). Needed for correct client IP with express-rate-limit.
```

> Only do this if your app actually sits behind a reverse proxy, otherwise anyone can spoof `X-Forwarded-For`.

---

## 4. Input Validation & Sanitization with zod

zod = schema-first validation that gives you **typed** output.

```bash
npm install zod
```

### A typed schema

```ts
import { z } from "zod";

// The schema IS the type via z.infer
const createTaskSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().datetime().optional()
});

type CreateTaskInput = z.infer<typeof createTaskSchema>;
// → { title: string; description?: string; priority: "low"|"medium"|"high"; dueDate?: string }
```

### Validate in a middleware (reusable)

```ts
import type { RequestHandler } from "express";
import type { ZodType, ZodError } from "zod";

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);          // NEVER throws, returns { success }
    if (!result.success) {
      const issues = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
      fail(res, issues.join("; "), 422);                // 422 = valid JSON, bad data
      return;
    }
    req.body = result.data as unknown;                  // narrowed, trimmed, coerced
    next();
  };
}
```

### And also sanitize defensively

```ts
// Keep trimming at input time so stored data is clean:
const schema = z.object({
  title: z.string().trim().min(1).max(120),     // kill leading/trailing spaces
  email: z.string().trim().toLowerCase().email()
});
```

```text
Sanitize = normalize input (trim, lowercase, strip dangerous chars).
NEVER rely on sanitization for security — validate with schemas AND
don't trust any passed-through HTML: escape on OUTPUT (res.render / {{ }}),
not on input. Stripping on input destroys legit data ("<3").
```

### zod vs joi

| | zod | joi |
|--|-----|-----|
| Types | `z.infer` gives perfect TS types | manually duplicated types |
| Style | modern, TS-native | older, well-known |
| Our pick | ✅ recommended | fine if you know it |

---

## 5. The OWASP Top 10 (2021) → What To Do About It

| # | Risk | Our defense |
|----|------|-------------|
| A01 | Broken Access Control | `requireAuth` + `requireRole` + **ownership checks** |
| A02 | Cryptographic Failures | bcrypt for passwords, strong `JWT_SECRET`, HTTPS only |
| A03 | Injection | parameterized queries (never string-concat SQL), zod validation |
| A04 | Insecure Design | least privilege, no debug routes in prod |
| A05 | Security Misconfiguration | helmet, no default secrets, proper error messages |
| A06 | Vulnerable Dependencies | `npm audit`, keep deps up to date |
| A07 | Identification/Authn Failures | rate-limited login, strong exp, refresh rotation |
| A08 | Software/Data Integrity | sign tokens, verify, pin dependency versions |
| A09 | Logging/Monitoring Failures | structured logs, never log passwords, alert on 429/401 spikes |
| A10 | SSRF | validate/allow-list any server-side URLs you fetch |

### The three you'll actually be graded on this week

```text
A01 access control  → roles + ownership (assignment 2)
A02 crypto          → bcrypt + JWT (assignment 1)
A05 misconfig       → helmet + CORS + rate limit (assignment 3)
```

---

## 6. A Hardened Wiring (app.ts, order matters)

```ts
app.set("trust proxy", 1);          // only if behind nginx
app.use(helmet());                  // headers first
app.use(cors(strictCorsOptions));   // origins second
app.use(express.json());            // body parsing
app.use(authLimiter);               // tight limit on /auth/*   (path-matched below)
app.use("/auth", authLimiter);
app.use(globalLimiter);             // wide limit on everything
app.use(logger);                    // our logger
app.use(publicRouter);              // public routes
app.use(protectedRouter);           // requireAuth routes
app.use(notFound);                  // 404
app.use(errorHandler);              // last
```

---

## 7. What Not to Do

```text
❌ app.use(cors()) with "*" + credentials
❌ Skipping rate limits on /auth/login
❌ Parsing SQL with string concatenation from req.body
❌ Committing real secrets / JWT secrets to the repo
❌ Returning full stack traces to clients (error handler shows "Internal server error")
❌ Sanitizing by stripping HTML out of every input ("<3" becomes "")
```

---

## Exercises

1. `app.use(helmet())` and inspect 4 new headers via `curl -sI`.
2. Block `http://evil.com` with a strict CORS whitelist; allow `localhost:5173`.
3. Rate-limit `/auth/login` to 5/min; confirm `429` on the 6th attempt.
4. Build a `zod` schema for a task and confirm `422` on bad input, typed data on good.
5. `npm audit` a project and explain three findings.
6. Add an ownership check that stops a `user` from DELETEing another owner's task.

---

## Key Takeaways

- helmet = base headers in one line; run it first
- CORS: explicit origin whitelist; `credentials: true` forbids `*`
- Rate limit everything, and stricter on `/auth/*`
- zod gives typed, validated input (`z.infer`); 422 for contract violations
- OWASP Top 10 maps to concrete code: access control, crypto, misconfig
- Validate at input, escape at output, keep secrets out of the repo
- Never leak stack traces or hash data in production responses