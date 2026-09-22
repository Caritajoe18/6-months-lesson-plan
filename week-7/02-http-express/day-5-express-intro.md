# Day 5 — Express Introduction: Routing, Params, Query & Middleware (TypeScript)

**Previous:** [Day 4 — HTTP with the http Module](day-4-http-module.md)
**Next:** [Day 6 — Body Parsing, Static & JSON Responses](day-6-body-parsing-json.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Explain what Express simplifies versus raw `http`
- Create typed routes with methods and path patterns
- Read URL params and query strings (typed)
- Understand Express's **middleware** pipeline in TypeScript
- Write and register your own typed middleware

---

## 1. Why Express?

Express is a thin, battle-tested framework that **wraps Node's `http` module** and removes boilerplate.

```ts
// Raw http — you do everything manually
import http from "node:http";
http.createServer((req, res) => {
  // parse URL, route by hand, set headers by hand, parse body by hand...
});
```

```ts
// Express — you declare routes and middleware
import express from "express";
const app = express();

app.get("/api/users", (req, res) => res.json(users));

app.listen(3000);
```

### What Express Gives You

| Feature | Raw `http` | Express |
|---------|-----------|---------|
| Routing | switch/if manually | `app.get`, `app.post` |
| URL params | manual parse | `req.params` |
| Query string | manual `URL` | `req.query` |
| JSON body | manual concat+parse | `express.json()` |
| Static files | manual streaming | `express.static` |
| Errors | try/catch per route | centralized error handler |
| Middleware | — | first-class pipeline |

---

## 2. Install & Types

```bash
npm install express
npm install -D typescript tsx @types/node @types/express
npx tsc --init
```

```ts
// tsconfig.json must have:
//   "esModuleInterop": true
//   "module": "node16"   (or "nodenext")
```

```ts
// ESM style (recommended)
import express from "express";
import type { Request, Response, NextFunction } from "express";

// CJS style
// import express = require("express");
```

> `@types/express` provides all the `Request`, `Response`, `NextFunction`, `RequestHandler`, `ErrorRequestHandler` types.

---

## 3. Minimal Typed App

```ts
import express from "express";

const app = express();
const PORT: number = Number(process.env.PORT ?? 3000);

app.get("/", (_req, res) => {
  res.send("Hello world");
});

app.listen(PORT, () => console.log(`listening on :${PORT}`));
```

```bash
npm run dev   # tsx watch src/index.ts
curl http://localhost:3000
```

---

## 4. Routing (typed)

### Method + Path

```ts
app.get("/", handler);
app.post("/api/users", handler);
app.put("/api/users/:id", handler);
app.delete("/api/users/:id", handler);

// Any method
app.all("/health", handler);

// Chained
app.route("/api/products").get(handler).post(handler);
```

### Route Parameters (`:id`) — typed

```ts
import type { Request, Response } from "express";

interface User {
  id: number;
  name: string;
}
const users: User[] = [{ id: 1, name: "Ada" }];

app.get("/api/users/:id", (req: Request, res: Response) => {
  const idParam: string = req.params.id;       // params are strings!
  const id = Number(idParam);

  const user = users.find((u) => u.id === id);
  if (!user) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(user);
});
```

> ⚠️ `req.params.id` is typed `string`. `Number()` it before comparisons — this is where TypeScript catches a whole class of silent bugs.

### Typed route params via generics (optional, clean)

```ts
app.get("/api/users/:id", (req: Request<{ id: string }>, res: Response) => {
  const id: string = req.params.id;
  // fully inferred
});
```

### Query Strings — typed

```ts
interface ProductQuery {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  page?: string;
}

app.get("/api/products", (req: Request<{}, {}, {}, ProductQuery>, res: Response) => {
  const { category, minPrice, maxPrice, page = "1" } = req.query;
  // filter logic...
});
```

| URL | `req.query` |
|-----|-------------|
| `?page=2` | `{ page: "2" }` (string) |
| `?a=1&a=2` | `{ a: ["1", "2"] }` |

---

## 5. Middleware — the Pipeline (typed)

Middleware = functions that run **between request and handler**, in order.

```ts
import type { Request, Response, NextFunction } from "express";

function logger(req: Request, res: Response, next: NextFunction): void {
  console.log(`${req.method} ${req.originalUrl}`);
  next();   // pass control to the next function
}
```

### The Three Jobs of a Middleware

```text
1. run side effects    (logging, timing)
2. modify req/res      (req.user = ..., res.locals.x = ...)
3. end the response    (res.json / res.send) — or call next()
```

### Rule: always either **respond** or **call `next()`**

```ts
// ❌ neither → request hangs forever
app.use((req, res) => {});

// ✅ respond
app.use((_req, res) => res.json({ ok: true }));

// ✅ or pass on
app.use((req, res, next) => next());
```

---

## 6. Common Built-In Middleware

### express.json()

```ts
const app = express();
app.use(express.json());   // parses JSON bodies into req.body (typed as any → cast/narrow)
```

### express.urlencoded()

```ts
app.use(express.urlencoded({ extended: true }));
```

### express.static()

```ts
import path from "node:path";
app.use(express.static(path.join(__dirname, "public")));
```

---

## 7. Route-Level vs App-Level Middleware

```ts
// App-level
app.use(express.json());
app.use(logger);

// Route-level (typed RequestHandler)
app.get("/admin", requireAuth, handler);

// Grouped by path prefix
app.use("/api/v2/*", versionMiddleware);
```

---

## 8. Typed Request Augmentation

Extend `Request` with your own fields via declaration merging:

```ts
// types.ts
import "express";

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; name: string };
      startedAt?: number;
    }
  }
}

// middleware
app.use((req, res, next) => {
  req.startedAt = Date.now();   // ✅ now allowed by TS
  next();
});
```

---

## 9. A Working Example (typed users API skeleton)

```ts
import express from "express";
import type { Request, Response } from "express";

interface User {
  id: number;
  name: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

const app = express();
app.use(express.json());

const users: User[] = [{ id: 1, name: "Ada" }];

app.get("/api/users", (_req: Request, res: Response<ApiResponse<User[]>>) => {
  res.json({ success: true, data: users });
});

app.get("/api/users/:id", (req: Request, res: Response<ApiResponse<User>>) => {
  const id = Number(req.params.id);
  const user = users.find((u) => u.id === id);

  if (!user) {
    res.status(404).json({ success: false, error: { message: "user not found" } });
    return;
  }
  res.json({ success: true, data: user });
});

app.post("/api/users", (req: Request, res: Response<ApiResponse<User>>) => {
  const { name } = req.body as { name?: string };

  if (!name) {
    res.status(400).json({ success: false, error: { message: "name is required" } });
    return;
  }

  const created: User = { id: users.length + 1, name };
  users.push(created);
  res.status(201).json({ success: true, data: created });
});

// catch-all 404
app.use((_req, res) =>
  res.status(404).json({ success: false, error: { message: "route not found" } })
);

app.listen(3000);
```

---

## 10. Middleware Order Matters

```text
app.use(express.json())        // 1. parse body
app.use("/api", logger)        // 2. log requests
app.get("/api/users", ...)     // 3. route handler
app.use(notFound)              // 4. 404 after routes
app.use(errorHandler)          // 5. 4-arg error handler (last)

If express.json() were last, req.body would be undefined in handlers.
```

---

## 11. `req` / `res` Shortcuts (typed)

### `res` helpers

```ts
res.json(obj);
res.send("text");
res.status(404);
res.sendStatus(204);
res.redirect("/login");
res.location("/api/users/2");
```

### `req` shortcuts

```ts
req.params       // Record<string, string>
req.query        // ParsedQs (strings or string[])
req.body         // any (cast/narrow after express.json())
req.headers      // IncomingHttpHeaders
req.originalUrl
req.path
```

---

## 12. Common Traps (TS-specific)

```text
❌ req.body is `any` — validate/cast it before use
❌ req.params.id is string — Number() it
❌ Forgetting next() → hang
❌ Wrong middleware order (json() after routes)
❌ Error handler with only 3 args → won't be picked up as error middleware
❌ Mixing CJS/ESM import styles without esModuleInterop
```

---

## Exercises

1. Create a minimal typed Express app with all five HTTP verbs.
2. Implement `GET /api/products`, `GET /api/products/:id`, `POST /api/products`.
3. Add typed query support: `?category=electronics&maxPrice=100`.
4. Write a typed `logger` middleware: `METHOD path ms`.
5. Register `express.json()` **after** a route reading `req.body` and observe the failure.
6. `npx tsc --noEmit` — zero errors.

---

## Key Takeaways

- Express removes manual URL/body handling from raw `http`
- `req.params.id` is a **string** — cast before numeric logic; TS catches this
- Middleware pipeline: respond OR `next()` — never neither
- `express.json()` must register before routes that read `req.body`
- Declaration merging augments `Request` with your own typed fields
- Error handlers need **4 args** (`err, req, res, next`) to be recognized