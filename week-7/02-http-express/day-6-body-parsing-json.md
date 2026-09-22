# Day 6 (Hands-on) — Body Parsing, Static Files, 404s & Structured JSON (TypeScript)

**Previous:** [Day 5 — Express Introduction](day-5-express-intro.md)
**Next:** [Assignments](assignments.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Parse and **validate** JSON request bodies safely in TypeScript
- Serve static files with `express.static`
- Handle 404s with a structured JSON response
- Design a typed JSON response envelope
- Add a typed centralized error handler

---

## 1. Structured Responses — Pick an Envelope, Be Consistent

APIs are consumed by code. Pick a response shape and **use it everywhere**.

### A typed envelope

```ts
// types.ts
export interface ApiError {
  message: string;
  status: number;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;
```

### Helpers

```ts
import type { Response } from "express";
import type { ApiErrorResponse, ApiResponse } from "./types.js";

export function ok<T>(res: Response, data: T, status = 200): Response<ApiResponse<T>> {
  return res.status(status).json({ success: true, data });
}

export function fail(res: Response, message: string, status = 400): Response<ApiErrorResponse> {
  return res.status(status).json({ success: false, error: { message, status } });
}
```

---

## 2. Body Parsing with express.json() — typed

### Register it once

```ts
import express from "express";
const app = express();
app.use(express.json());
```

### Read and narrow the body

> ⚠️ `req.body` is `any` after `express.json()`. Never trust it — validate and **cast explicitly**.

```ts
interface CreateNoteInput {
  title?: unknown;
  content?: unknown;
}
```

### A typed validation helper (no `any` leaks)

```ts
// validators.ts
export type ValidationErrors = string[];

export function validateCreateNote(body: unknown): body is CreateNoteInput {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.title === "string" &&
    b.title.trim().length > 0 &&
    typeof b.content === "string" &&
    b.content.trim().length > 0
  );
}
```

### Using it in a route

```ts
app.post("/api/notes", (req, res) => {
  const input: unknown = req.body;

  if (!isValidNoteInput(input)) {
    return fail(res, "title and content are required (strings)", 422);
  }

  const note = store.create({ title: input.title, content: input.content });
  return ok(res, note, 201);
});
```

> 422 = "valid JSON but bad data"; 400 = malformed/unparseable body.

---

## 3. Malformed JSON → the error handler

If a client sends `{"title": "x"` (invalid JSON), `express.json()` throws a `SyntaxError`. Express forwards it to your error handler. Register one (section 5) so it's a clean **400**, not a 500.

---

## 4. Static Files

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.static(path.join(__dirname, "public")));
```

- `public/logo.png` → served at `/logo.png`
- `express.static` sets correct `Content-Type` and caching headers

> With ESM, there's no `__dirname` — compute it from `import.meta.url` as above.

---

## 5. Typed Centralized Error Handler

Express matches error middleware by **4 args**.

```ts
import type { ErrorRequestHandler, Request, Response, NextFunction } from "express";

// A custom error carrying an HTTP status
export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);   // log the detail server-side

  const status = err instanceof HttpError ? err.status : 500;
  const message =
    status >= 500
      ? "Internal server error"     // hide details from clients on 5xx
      : err instanceof Error
        ? err.message
        : "Unknown error";

  res.status(status).json({ success: false, error: { message, status } });
};
```

### Triggering it

```ts
// sync throw → forwarded
app.get("/boom", () => {
  throw new HttpError(500, "kaboom");
});

// async rejection → Express 5 forwards; still catch explicitly for clarity
app.get("/async", async (req, res, next) => {
  try {
    await doStuff();
  } catch (err) {
    next(err);
  }
});
```

---

## 6. 404 for Anything Else

Place **after all routes**.

```ts
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { message: `Cannot ${req.method} ${req.originalUrl}`, status: 404 }
  });
});
```

---

## 7. The Typed Notes/Blog Starter (foundation for the project)

```ts
// types.ts
export interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
```

```ts
// app.ts
import express from "express";
import type { Request, Response, NextFunction } from "express";
import path, { fileURLToPath } from "node:url";
import { HttpError, errorHandler } from "./errorHandler.js";
import { ok, fail } from "./responses.js";
import { validateCreateNote, validateUpdateNote } from "./validators.js";
import type { Note } from "./types.js";

const app = express();
app.use(express.json());
app.use(logger);
app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), "public")));

let notes: Note[] = [];
let nextId = 1;

// ---- routes ----
app.get("/api/notes", (_req, res) => ok(res, notes));

app.get("/api/notes/:id", (req: Request<{ id: string }>, res) => {
  const note = notes.find((n) => n.id === Number(req.params.id));
  if (!note) throw new HttpError(404, "note not found");
  ok(res, note);
});

app.post("/api/notes", (req: Request, res) => {
  if (!validateCreateNote(req.body)) return fail(res, "title and content required", 422);
  const now = new Date().toISOString();
  const note: Note = {
    id: nextId++,
    title: req.body.title,
    content: req.body.content,
    createdAt: now,
    updatedAt: now
  };
  notes.push(note);
  ok(res, note, 201);
});

app.put("/api/notes/:id", (req: Request<{ id: string }>, res) => {
  const note = notes.find((n) => n.id === Number(req.params.id));
  if (!note) throw new HttpError(404, "note not found");
  if (!validateUpdateNote(req.body)) return fail(res, "title or content required", 422);
  note.title = req.body.title ?? note.title;
  note.content = req.body.content ?? note.content;
  note.updatedAt = new Date().toISOString();
  ok(res, note);
});

app.delete("/api/notes/:id", (req: Request<{ id: string }>, res) => {
  const before = notes.length;
  notes = notes.filter((n) => n.id !== Number(req.params.id));
  if (notes.length === before) throw new HttpError(404, "note not found");
  res.status(204).end();
});

// 404 + error handler (AFTER all routes)
app.use((req: Request, res: Response) =>
  res.status(404).json({
    success: false,
    error: { message: `Cannot ${req.method} ${req.originalUrl}`, status: 404 }
  })
);

app.use(errorHandler);

export default app;
```

```ts
// server.ts
import app from "./app.js";

const PORT: number = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
```

---

## 8. Testing Your API

```bash
curl -i http://localhost:3000/api/notes                     # 200 []
curl -i -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"hello","content":"world"}'                  # 201 note

curl -i http://localhost:3000/api/notes/1                   # 200 note
curl -i http://localhost:3000/api/notes/99                  # 404
curl -i -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" -d '{bad json'        # 400 clean

curl -i http://localhost:3000/nope                          # 404 envelope
```

---

## 9. Pitfalls Recap (TS-specific)

```text
❌ req.body is `any` — validate + cast; never pass it raw into typed functions
❌ Error handler must be 4 args (err, req, res, next) → TS's ErrorRequestHandler enforces this
❌ res.json after res.status().json → "Cannot set headers after they are sent"
❌ 204 must NOT carry a body
❌ With ESM: compute __dirname from import.meta.url
❌ Returning errors as 500 by accident → map known failures to 4xx explicitly
```

---

## Exercises

1. Build the notes starter above and hit every route with curl.
2. Add a `HttpError(422, ...)` usage for a bad update payload.
3. Serve a static page under `public/` beside the API.
4. Make `DELETE` return `204` with no body; verify with `curl -i`.
5. Send malformed JSON and confirm a clean 400 envelope (not 500).

---

## Key Takeaways

- One typed envelope everywhere: `ApiResponse<T>` / `ApiErrorResponse`
- `express.json()` — register before routes; **validate + narrow** `req.body`
- 422 vs 400: bad *data* vs bad *format*
- Static = `express.static` (+ `import.meta.url` for `__dirname` in ESM)
- 404 catcher after all routes; 4-arg `ErrorRequestHandler` last
- Error handler: log server-side, hide details on 5xx, map to proper status