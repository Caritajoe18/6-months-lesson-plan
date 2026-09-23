# Project: Personal Notes/Blog REST API (TypeScript + Express)

## Objective

Build a **full CRUD REST API** for a personal notes/blog app with **Express in TypeScript**. Frontend optional; the API is the deliverable, battle-tested with curl and (stretch) supertest.

## Features

```text
GET    /api/notes                 list (support filtering/sorting/pagination)
GET    /api/notes/:id             single note
POST   /api/notes                 create note
PUT    /api/notes/:id             full update
PATCH  /api/notes/:id             partial update
DELETE /api/notes/:id             delete note       → 204

GET    /health                    health check
GET    /api/stats                 total notes, avg word count
```

## Data Model (typed)

```ts
// types.ts
export interface Note {
  id: number;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteInput {
  title: string;
  content: string;
  tags?: string[];
}

export interface ListQuery {
  tag?: string;
  sort?: "newest" | "oldest";
  page?: number;
  limit?: number;
}
```

## Why Notes With Tags?

The tags field makes the exercise interesting — you'll implement:

```text
// tag filter
GET /api/notes?tag=node

// multiple tags
GET /api/notes?tags=node,express
```

## Requirements

| Area | Requirement |
|------|-------------|
| Routing | CRUD routes with proper methods and status codes |
| Body parsing | `express.json()` + validation (422 for bad data, 400 for malformed JSON) |
| Query handling | filter by tag, sort, paginate (`?page&limit`) |
| Static files | serve a `/public` folder with a tiny index.html |
| 404 + errors | catch-all 404 and centralized error handler (envelope) |
| Middleware | logger (`METHOD path ms`), and auth-protect POST/PUT/PATCH/DELETE |
| Health | `GET /health` returns `{ status: "ok", uptime }` |
| Types | every module typed, `strict: true`, **zero `any`** |

## Suggested Structure

```
notes-api/
├── src/
│   ├── app.ts            # express app (exported for testing)
│   ├── server.ts         # listen() entry
│   ├── store.ts          # in-memory repository (CRUD + query)
│   ├── routes.ts         # route definitions
│   ├── middleware.ts     # logger, auth, error handler, 404
│   ├── validator.ts      # validateNote() returning errors
│   ├── helpers.ts        # ok/fail response helpers
│   └── types.ts          # Note, inputs, query types
├── public/
│   └── index.html
├── test/
│   └── api.test.ts       # stretch: supertest
├── tsconfig.json
├── package.json
└── README.md
```

## Setup

```bash
npm init -y
npm install express
npm install -D typescript tsx @types/node @types/express supertest @types/supertest
npx tsc --init   # ensure strict: true, esModuleInterop: true, module: node16
```

```jsonc
// package.json scripts
{
  "dev": "tsx watch src/server.ts",
  "start": "tsx src/server.ts",
  "typecheck": "tsc --noEmit",
  "build": "tsc",
  "test": "vitest run"
}
```

> 🔴 **Do not use `any`.** If you reach for `any`, refactor to `unknown` + a type guard.

---

## The Store (typed in-memory repository)

```ts
// store.ts
import type { CreateNoteInput, ListQuery, Note } from "./types.js";

export class NoteStore {
  private notes: Note[] = [];
  private nextId = 1;

  create(input: CreateNoteInput): Note {
    const now = new Date().toISOString();
    const note: Note = {
      id: this.nextId++,
      title: input.title,
      content: input.content,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now
    };
    this.notes.push(note);
    return note;
  }

  findById(id: number): Note | undefined {
    return this.notes.find((n) => n.id === id);
  }

  update(id: number, patch: Partial<Pick<Note, "title" | "content" | "tags">>): Note | undefined {
    const note = this.findById(id);
    if (!note) return undefined;
    Object.assign(note, patch, { updatedAt: new Date().toISOString() });
    return note;
  }

  remove(id: number): boolean {
    const before = this.notes.length;
    this.notes = this.notes.filter((n) => n.id !== id);
    return this.notes.length < before;
  }

  find(query: Required<ListQuery>): { items: Note[]; total: number } {
    let results: Note[] = this.notes.slice();

    if (query.tag) {
      results = results.filter((n) => n.tags.includes(query.tag));
    }

    if (query.sort === "newest") {
      results.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    } else if (query.sort === "oldest") {
      results.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    }

    const start = (query.page - 1) * query.limit;
    return { items: results.slice(start, start + query.limit), total: results.length };
  }

  stats(): { total: number; avgWords: number } {
    const total = this.notes.length;
    const avgWords = total
      ? this.notes.reduce((sum, n) => sum + n.content.trim().split(/\s+/).length, 0) / total
      : 0;
    return { total, avgWords: Math.round(avgWords * 10) / 10 };
  }
}
```

---

## Validation (typed guard, returns errors)

```ts
// validator.ts
import type { CreateNoteInput } from "./types.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function isNoteBody(body: unknown): body is CreateNoteInput {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  const titleOk = typeof b.title === "string" && b.title.trim().length > 0;
  const contentOk = typeof b.content === "string" && b.content.trim().length > 0;
  const tagsOk =
    b.tags === undefined ||
    (Array.isArray(b.tags) && b.tags.every((t): boolean => typeof t === "string"));
  return titleOk && contentOk && tagsOk;
}

export function validateNote(body: unknown, { partial = false } = {}): ValidationResult {
  const errors: string[] = [];
  if (typeof body !== "object" || body === null) {
    return { valid: false, errors: ["body must be a JSON object"] };
  }

  const b = body as Record<string, unknown>;

  if (b.title !== undefined && (typeof b.title !== "string" || b.title.trim() === "")) {
    errors.push("title must be a non-empty string");
  }
  if (b.content !== undefined && (typeof b.content !== "string" || b.content.trim() === "")) {
    errors.push("content must be a non-empty string");
  }
  if (b.tags !== undefined && (!Array.isArray(b.tags) || b.tags.some((t) => typeof t !== "string"))) {
    errors.push("tags must be an array of strings");
  }
  if (!partial && b.title === undefined) errors.push("title is required");
  if (!partial && b.content === undefined) errors.push("content is required");

  return { valid: errors.length === 0, errors };
}
```

---

## Middleware (typed)

```ts
// middleware.ts
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";
import { HttpError } from "./helpers.js";

export const logger: RequestHandler = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
};

const TOKEN: string = process.env.AUTH_TOKEN ?? "secret";

export const requireAuth: RequestHandler = (req, res, next) => {
  const token: string = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  if (token !== TOKEN) {
    res.status(401).json({ success: false, error: { message: "unauthorized" } });
    return;
  }
  next();
};

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ success: false, error: { message: `Cannot ${req.method} ${req.originalUrl}` } });
};

export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  console.error(err);
  const status = err instanceof HttpError ? err.status : 500;
  const message =
    status >= 500 ? "Internal server error" : err instanceof Error ? err.message : "unknown error";
  res.status(status).json({ success: false, error: { message } });
};
```

---

## Response Helpers + Error Class (typed)

```ts
// helpers.ts
import type { Response } from "express";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

export function fail(res: Response, message: string, status = 400): void {
  res.status(status).json({ success: false, error: { message } });
}
```

---

## Routes (typed handlers)

```ts
// routes.ts
import { Router } from "express";
import type { Request, Response } from "express";
import { NoteStore } from "./store.js";
import { getListParams } from "./queryParams.js";
import { validateNote } from "./validator.js";
import { fail, HttpError, ok } from "./helpers.js";
import { requireAuth } from "./middleware.js";
import type { ListQuery, Note } from "./types.js";

export function createRouter(store: NoteStore): Router {
  const router = Router();

  // GET /api/notes — list + filter/sort/paginate
  router.get("/api/notes", (req: Request, res: Response) => {
    const query = getListParams(req);
    const result = store.find(query);
    ok(res, result);
  });

  // GET /api/notes/:id
  router.get("/api/notes/:id", (req: Request<{ id: string }>, res: Response<Note>) => {
    const note = store.findById(Number(req.params.id));
    if (!note) throw new HttpError(404, "note not found");
    ok(res, note);
  });

  // POST /api/notes — protected
  router.post("/api/notes", requireAuth, (req: Request, res: Response) => {
    const body: unknown = req.body;
    const { valid, errors } = validateNote(body);
    if (!valid) return fail(res, errors.join("; "), 422);

    if (!isNoteBody(body)) return fail(res, "invalid note body", 422);
    const note = store.create({ title: body.title, content: body.content, tags: body.tags });
    return ok(res, note, 201);
  });

  // PUT /api/notes/:id — full update (all fields required)
  router.put("/api/notes/:id", requireAuth, (req: Request<{ id: string }>, res: Response) => {
    const body: unknown = req.body;
    const { valid, errors } = validateNote(body);
    if (!valid) return fail(res, errors.join("; "), 422);

    const updated = store.update(Number(req.params.id), body);
    if (!updated) throw new HttpError(404, "note not found");
    return ok(res, updated);
  });

  // PATCH /api/notes/:id — partial update
  router.patch("/api/notes/:id", requireAuth, (req: Request<{ id: string }>, res: Response) => {
    const body: unknown = req.body;
    const { valid, errors } = validateNote(body, { partial: true });
    if (!valid) return fail(res, errors.join("; "), 422);

    const updated = store.update(Number(req.params.id), body);
    if (!updated) throw new HttpError(404, "note not found");
    return ok(res, updated);
  });

  // DELETE /api/notes/:id — 204
  router.delete("/api/notes/:id", requireAuth, (req: Request<{ id: string }>, res: Response) => {
    const removed = store.remove(Number(req.params.id));
    if (!removed) throw new HttpError(404, "note not found");
    res.status(204).end();
  });

  return router;
}
```

### Parsing the query (typed helper)

```ts
// queryParams.ts
import type { Request } from "express";
import type { ListQuery } from "./types.js";

export function getListParams(req: Request): Required<ListQuery> {
  const tag: string | undefined = typeof req.query.tag === "string" ? req.query.tag : undefined;
  const sort: "newest" | "oldest" | undefined =
    req.query.sort === "newest" || req.query.sort === "oldest" ? req.query.sort : undefined;
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 10) || 10));
  return { tag: tag ?? "", sort: sort ?? "newest", page, limit };
}
```

---

## app.ts — the wiring (order matters!)

```ts
// app.ts
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NoteStore } from "./store.js";
import { createRouter } from "./routes.js";
import { errorHandler, logger, notFound } from "./middleware.js";
import { fail, ok } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const store = new NoteStore();
store.create({ title: "Welcome", content: "My first note about Node.", tags: ["node"] });

const app = express();
app.use(express.json());
app.use(logger);
app.use(express.static(path.join(__dirname, "../public")));

app.get("/health", (_req, res) => {
  ok(res, { status: "ok", uptime: Math.round(process.uptime()) });
});

app.get("/api/stats", (_req, res) => {
  ok(res, store.stats());
});

app.use(createRouter(store));

app.use(notFound);     // after all routes
app.use(errorHandler); // last, 4 args

export default app;
```

```ts
// server.ts
import app from "./app.js";

const PORT: number = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  console.log(`Notes API on :${PORT}`);
});
```

> Note the `.js` extension on relative imports — with `module: node16` ESM, TypeScript compiles `./store.js` back to the file that *is* `store.ts`. `tsx` and `tsc` both respect this.

---

## Pagination & Filtering (requirements detail)

```text
GET /api/notes?page=2&limit=5
GET /api/notes?sort=newest
GET /api/notes?tag=node
GET /api/notes?tag=node&sort=newest&page=1&limit=3
```

Response shape:

```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 43,
    "page": 2,
    "limit": 5
  }
}
```

---

## Testing Script

```bash
# create
curl -i -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" -H "Authorization: Bearer secret" \
  -d '{"title":"Async","content":"Streams, events, loop.","tags":["node"]}'

# list + filter
curl "http://localhost:3000/api/notes?tag=node"
curl "http://localhost:3000/api/notes?sort=newest"

# update, partial
curl -X PATCH http://localhost:3000/api/notes/1 \
  -H "Authorization: Bearer secret" -H "Content-Type: application/json" \
  -d '{"tags":["node","advanced"]}'

# delete
curl -i -X DELETE http://localhost:3000/api/notes/1  -H "Authorization: Bearer secret"   # 204

# error paths
curl -i http://localhost:3000/api/notes/999          # 404
curl -i -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" -d '{"title":""}'      # 422
curl -i -X POST http://localhost:3000/api/notes       # 401 (no token)
curl -i http://localhost:3000/nope                    # 404

# health + stats
curl http://localhost:3000/health
curl http://localhost:3000/api/stats

# typecheck
npx tsc --noEmit
```

---

## Stretch

```text
1. supertest: test res.status, body shape, and error paths (test/api.test.ts)
2. Data persisted to data/notes.json (store flushes on write)
3. The public/index.html uses fetch() to list notes in the browser
4. Environment config via .env (PORT, AUTH_TOKEN)
5. Rate limiting: limit 100 requests / minute per IP
```

---

## Deliverables

1. Full `src/` (all `.ts`) + `public/index.html`
2. `package.json` (scripts: dev, start, typecheck, build, test) + `tsconfig.json`
3. curl transcript covering every endpoint + every error path
4. **`npx tsc --noEmit` clean output** (proof of zero type errors, no `any`)
5. (stretch) `test/api.test.ts` passing with supertest

---

## Grading Rubric

| Criteria | Points |
|----------|--------|
| All CRUD endpoints correct (+ status codes) | 25% |
| Validation (400 vs 422) & auth (401) correct | 15% |
| Filtering/sorting/pagination implemented | 10% |
| 404 + centralized error handler in envelope | 10% |
| Middleware order stable, logger fires | 10% |
| Health/stats endpoints | 5% |
| **Typed end-to-end: no `any`, `tsc --noEmit` clean** | 25% |