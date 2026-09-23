# Week 7: Node Internals + HTTP & Express (in TypeScript)

## Overview

A double-week combined into one folder — two halves, six total lessons — taught entirely in **TypeScript**. First, the Node.js runtime: the event loop, streams, buffers, and events. Second, building web servers: raw HTTP, then Express with routing, middleware, and structured JSON APIs. Every lesson, assignment, and project ships `.ts` code that runs via `tsx` and is type-checked with `tsc --noEmit`.

---

## TypeScript Setup Used All Week

```bash
npm init -y
npm install express
npm install -D typescript tsx @types/node @types/express
npx tsc --init
```

```json
// tsconfig.json (baseline for the week)
{
  "compilerOptions": {
    "target": "es2022",
    "module": "node16",
    "moduleResolution": "node16",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "sourceMap": true
  },
  "include": ["src"]
}
```

```json
// package.json scripts
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Part A — Node Internals

### Day 1 (Theory): Event Loop & Runtime
- Blocking vs non-blocking; why sync I/O freezes a server
- The event loop phases (timers → poll → check → close) and libuv's role
- `process.nextTick` vs `setImmediate` vs `setTimeout` execution order
- Typed worker-threads example (CPU-bound escape hatch)
- CPU-bound work and when worker threads matter

### Day 2 (Theory): Streams
- Readable / Writable / Duplex / Transform — typed in TypeScript
- Chunked processing — constant memory for huge files
- `.pipe()` vs `pipeline()` (error handling & cleanup)
- Custom generic Transform streams (`Transform` typed with generics)
- `zlib`: `createGzip` / `createGunzip`, brotli vs deflate

### Day 3 (Hands-on): Buffers, Large Files & Events
- Buffers: `Buffer.from`, `toString`, `concat`, multi-byte safety (`setEncoding`)
- Streaming large files in constant memory
- **Typed EventEmitter**: `on`/`once`/`emit`, error events, subclassing
- Building an evented file watcher with strongly-typed events

### Assignments (Part A) — TypeScript
1. **Streaming CSV → JSON transformer** (generic typed Transform, edge cases)
2. **Custom EventEmitter message bus** (typed `subscribe`/`publish`/`once`/`topics`)
3. **Large-file copy with gzip + live progress** (`pipeline` + `bytesRead`, typed counters)

### Project (Part A): Real-Time Log Tailer CLI — TypeScript
Follows a log file live, filters by pattern/level, colorizes output, shows live stats (`?`). Built on typed streams, file watching, and a typed `FileTailer extends EventEmitter`. Ships a `LogEntry` type and a parse-with-narrowing pipeline.

---

## Part B — HTTP & Express

### Day 4 (Theory): HTTP & the `http` Module
- The HTTP protocol: request/response anatomy
- Methods, status codes (2xx/3xx/4xx/5xx), headers, Content-Type
- `http.createServer` with typed listeners (`IncomingMessage`, `ServerResponse`)
- Raw-Node routing and a typed `ApiError` handling path

### Day 5 (Theory): Express — Routing & Middleware
- Why Express: routing, `req.params`, `req.query`, `Request`/`Response`/`NextFunction`
- Middleware pipeline — respond OR call `next()`
- Typed request augmentation (`req.user`, `req.startedAt`)
- Built-ins: `express.json`, `express.urlencoded`, `express.static`

### Day 6 (Hands-on): Bodies, Static, 404s & JSON
- `express.json()` + validation with typed guards (400 vs 422)
- Serving static files
- Consistent JSON envelope typed as `ApiResponse<T>` / `ApiError`
- Typed catch-all 404 + centralized 4-arg error handler (`HttpError` class)

### Assignments (Part B) — TypeScript
1. **Bare Node HTTP server** — small JSON API, zero deps, typed routes
2. **Express app with 5+ routes** — products + users CRUD, filter/search/sort, typed entities
3. **Middleware chain** — typed logging → auth → error handler, 6-case test matrix

### Project (Part B): Personal Notes/Blog REST API — TypeScript
Full CRUD Express API: typed `Note` entity, tag filters, sorting, pagination, `express.json()` validation, auth-protected writes, typed error envelope, health/stats — tested end-to-end with curl (+ optional supertest).

---

## Folder Layout

```
week-7/
├── syllabus.md
├── 01-node-internals/
│   ├── day-1-event-loop.md
│   ├── day-2-streams.md
│   ├── day-3-buffers-eventemitter.md
│   ├── assignments.md
│   └── project-log-tailer.md
└── 02-http-express/
    ├── day-4-http-module.md
    ├── day-5-express-intro.md
    ├── day-6-body-parsing-json.md
    ├── assignments.md
    └── project-notes-api.md
```

---

## Grading Weights (combined week)

| Area | Weight |
|------|--------|
| Streams/events assignments (Part A) | 20% |
| Log tailer project (Part A) | 25% |
| HTTP/Express assignments (Part B) | 20% |
| Notes API project (Part B) | 25% |
| TypeScript setup + repo hygiene | 10% |

## Skills Acquired

- Deep understanding of the event loop and non-blocking I/O
- Streaming large data with low, constant memory
- Event-driven architecture with **typed** EventEmitter
- Building servers with Node's `http` module and Express in TypeScript
- Middleware pipelines, structured JSON APIs (typed envelopes), consistent error handling
- `tsx` for dev, `tsc --noEmit` for CI-safe type checking