# Week 7 — Part B Assignments: HTTP & Express (TypeScript)

> All submissions must compile clean: `npx tsc --noEmit` with `strict: true`.
> Run with `npx tsx src/index.ts`. Install: `express`, `@types/express`, `@types/node`, `tsx`, `typescript`.

---

## Assignment 1: Bare Node HTTP Server — a Typed JSON API

**Objective:** Build a small REST API with **only `node:http`** (no Express). Types come from `@types/node`.

### Setup

```bash
npm init -y
npm install -D typescript @types/node tsx
npx tsc --init   # ensure strict: true, module: node16
```

### Endpoints

```text
GET    /api/users           → 200 [ ...users ]
GET    /api/users/:id       → 200 {user} | 404
POST   /api/users           → 201 {user} | 400
PUT    /api/users/:id       → 200 {user} | 404 | 400
DELETE /api/users/:id       → 204 (no body) | 404
GET    /api/health          → 200 { status: "ok", uptime: <seconds> }
```

### Core Types

```ts
// types.ts
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface ApiMessage {
  error?: { message: string };
}
```

### Typed helpers

```ts
// server.ts
import http from "node:http";
import { URL } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { User } from "./types.js";

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}
```

### A typed ApiError for the catch path

```ts
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}
```

### Routing (typed switch)

```ts
const server: http.Server = http.createServer(async (req, res) => {
  const method: string = req.method ?? "GET";
  const parsed = new URL(req.url ?? "/", "http://localhost");
  const path = parsed.pathname;

  // GET /api/users
  // GET /api/users/:id
  // POST /api/users  (parse + validate body)
  // DELETE /api/users/:id  → 204
  // 404 otherwise
});

server.listen(3000);
```

### Requirements
- No Express; pure `node:http`
- In-memory `User[]` with 2 seeds
- Correct codes: 201, 204, 400 (bad JSON), 404
- Consistent `{ error: { message } }` shape

### Test

```bash
curl -i http://localhost:3000/api/users
curl -i -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"name":"Ada","email":"ada@x.com"}'
curl -i -X DELETE http://localhost:3000/api/users/1
curl -i -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{bad'   # 400
```

### Submission
- `types.ts`, `server.ts`
- curl proof of all 6 endpoints + `tsc --noEmit` passing

---

## Assignment 2: Express App with 5+ Routes (typed entities)

**Objective:** CRUD for **users** and **products** with full typing.

### Types

```ts
// types.ts
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

export type CreateUserInput = Omit<User, "id">;
export type CreateProductInput = Omit<Product, "id">;
export type UpdateProductInput = Partial<Omit<Product, "id">>;
```

### Routes

| Resource | Routes |
|----------|--------|
| users | GET `/api/users`, GET `/api/users/:id`, POST, PUT, DELETE |
| products | GET `/api/products`, GET `/api/products/:id`, POST, PUT, DELETE |

### Query features (typed generics)

```ts
interface ProductQuery {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: "price" | "name";
}

app.get("/api/products", (req: Request<{}, {}, {}, ProductQuery>, res) => {
  const { category, minPrice, maxPrice, sort } = req.query;
  const min = Number(minPrice ?? 0);
  const max = Number(maxPrice ?? Infinity);
  // filter, then sort
});
```

```ts
interface UserQuery {
  q?: string;
}
// GET /api/users?q=ada → name/email contains "ada" (case-insensitive)
```

### Validation (typed guards)

```ts
export function isCreateProduct(body: unknown): body is CreateProductInput {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.name === "string" && b.name.length > 0 &&
    typeof b.price === "number" && b.price >= 0 &&
    typeof b.category === "string"
  );
}
```

### Requirements
- Envelope: `{ success: true, data }` / `{ success: false, error: { message } }`
- `express.json()` + guards → 422 on bad data
- `q` search for users; `category`/`minPrice`/`maxPrice`/`sort` for products

### Submission
- `types.ts`, `validators.ts`, `server.ts`, `package.json`
- curl transcript: list, filter, search, sort, create, update, delete, 404, 400

---

## Assignment 3: Typed Middleware Chain — Logging → Auth → Error Handler

**Objective:** Prove you can build and order typed middleware.

### The Chain

```text
request → logger → authentication → route handler → 404 → error handler
```

### 1. Logger (typed)

```ts
import type { Request, Response, NextFunction } from "express";

function logger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}
```

### 2. Auth with type augmentation

```ts
// augment Request with a user
declare global {
  namespace Express {
    interface Request {
      auth?: { user: string };
    }
  }
}

const TOKEN = process.env.AUTH_TOKEN ?? "supersecret";

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header: string = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (token !== TOKEN) {
    res.status(401).json({ success: false, error: { message: "unauthorized" } });
    return;
  }
  req.auth = { user: "ada" };
  next();
}
```

### 3. Error handler + HttpError

```ts
export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  const status = err instanceof HttpError ? err.status : 500;
  const message = status >= 500 ? "Internal server error" : err instanceof Error ? err.message : "unknown";
  res.status(status).json({ success: false, error: { message } });
}
```

### Routes
- `POST /api/posts` → `requireAuth` (protected)
- `GET /api/posts` → public
- one route that `throw new HttpError(500, ...)` to exercise the handler

### Test Matrix

```bash
# 1. GET /api/posts        → 200
# 2. POST w/o token        → 401
# 3. POST wrong token      → 401
# 4. POST correct token    → 201
# 5. GET /api/nothing      → 404 leaf
# 6. route that throws     → 500 envelope
```

### Submission
- `middleware.ts` (or split files), `server.ts`
- Log lines for every request
- The 6-case matrix result

---

## Grading Criteria (Part B)

| Criteria | Points |
|----------|--------|
| Correct status codes & response shapes | 30% |
| Typed entities + typed guards (no `any`) | 25% |
| Middleware ordering & type augmentation | 20% |
| Query features (filter/search/sort) work | 15% |
| `tsc --noEmit` clean + curl proof | 10% |

---

## Tips
1. `req.params.id` → `Number()` it; TypeScript reminds you it's a string
2. Guard `req.body` with `unknown` → type-predicate functions (`body is X`)
3. 4-arg error handlers; `unknown` errors → `instanceof HttpError`
4. Curl with `-i` to show status codes in output
5. `tsc --noEmit` after every file — first error, fix, re-run