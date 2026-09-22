# Day 4 — HTTP Protocol & the `http` Module (TypeScript)

**Previous:** [Day 3 — Buffers & Events](../01-node-internals/day-3-buffers-eventemitter.md)
**Next:** [Day 5 — Express Introduction](day-5-express-intro.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Explain the HTTP request/response model
- Identify common methods, status codes, and headers
- Start a typed server with Node's `http` module
- Read request data and send responses with `IncomingMessage` / `ServerResponse`
- Serve a small JSON API with raw typed Node

---

## 1. HTTP — The Language of the Web

HTTP is a **request/response protocol** built on TCP.

```text
 Client (browser/curl)                Server (Node)
 ────────────────────                 ─────────────
  1. send REQUEST ──────────────────▶
  2.                  ◀───────────────── receive RESPONSE
```

### Anatomy of a Request

```http
POST /api/users HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Authorization: Bearer <token>

{"name": "Ada"}
```

| Part | Meaning |
|------|---------|
| `POST` | The method (verb) |
| `/api/users` | The path + query |
| `HTTP/1.1` | Protocol version |
| headers | metadata (Host, Content-Type, …) |
| `{"name":"Ada"}` | The body (payload) |

---

## 2. HTTP Methods (the verbs)

| Method | Purpose | Idempotent | Has body? |
|--------|---------|------------|-----------|
| `GET` | Read data | ✅ | Usually no |
| `POST` | Create a resource | ❌ | ✅ |
| `PUT` | Replace a resource | ✅ | ✅ |
| `PATCH` | Partial update | ❌ | ✅ |
| `DELETE` | Remove a resource | ✅ | Usually no |
| `OPTIONS` | What's allowed (CORS preflight) | ✅ | No |
| `HEAD` | Headers only, no body | ✅ | No |

> Idempotent = calling it 10 times behaves like calling it once.

---

## 3. Status Codes (the classic ranges)

```text
1xx → informational
2xx → success
3xx → redirection
4xx → client error (your problem)
5xx → server error (my problem)
```

### The Ones You'll Actually Use

| Code | Meaning | When |
|------|---------|------|
| `200` | OK | success (with body) |
| `201` | Created | POST success |
| `204` | No Content | DELETE success (no body) |
| `400` | Bad Request | malformed input |
| `401` | Unauthorized | not logged in |
| `403` | Forbidden | logged in but no permission |
| `404` | Not Found | bad path |
| `422` | Unprocessable Entity | valid JSON, bad data |
| `500` | Internal Server Error | unhandled exception |

---

## 4. Headers Cheat Sheet

### Common request headers
```text
Host, Accept, Content-Type, Content-Length,
Authorization, User-Agent, Cookie, Cache-Control
```

### Common response headers
```text
Content-Type, Content-Length, Location, Set-Cookie, Cache-Control
```

### Content-Type examples
```text
application/json
application/x-www-form-urlencoded
text/html
text/plain
```

---

## 5. Node's `http` Module — Hello Server (typed)

```ts
import http from "node:http";

const server: http.Server = http.createServer(
  (req: http.IncomingMessage, res: http.ServerResponse) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Hello from Node");
  }
);

const PORT: number = Number(process.env.PORT ?? 3000);

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
```

```bash
curl http://localhost:3000
# Hello from Node
```

### The Two Objects (typed)

| Object | Type | Useful |
|--------|------|--------|
| `req` | `http.IncomingMessage` (a Readable) | method, url, headers, body stream |
| `res` | `http.ServerResponse` (a Writable) | statusCode, setHeader, write, end |

### If you need `req.headers` typed

```ts
const contentType: string | undefined = req.headers["content-type"];
const auth: string | undefined = req.headers.authorization;   // lower-cased keys
```

---

## 6. Reading the Request (typed)

### Method & URL

```ts
const method: string = req.method ?? "GET";
const url: string = req.url ?? "/";
console.log(method, url);   // "GET" "/api/users?page=2"
```

### Query string with `URL`

```ts
import { URL } from "node:url";

const parsed = new URL(req.url ?? "/", "http://localhost");
const pathname: string = parsed.pathname;
const page: string | null = parsed.searchParams.get("page");
```

### The Body (a Readable stream — typed)

```ts
async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}
```

```ts
// handler
const raw = await readBody(req);

let body: unknown;
try {
  body = JSON.parse(raw);
} catch {
  sendJson(res, 400, { error: { message: "invalid JSON body" } });
  return;
}
```

> Another reason streams matter: a giant body can be stream-handled, not fully buffered.

---

## 7. Sending Responses (typed helpers)

```ts
import type { ServerResponse } from "node:http";

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload)
  });
  res.end(payload);
}
```

### Streaming a response (big payload, low memory)

```ts
import fs from "node:fs";
import type { ServerResponse } from "node:http";

function sendFile(res: ServerResponse, filePath: string): void {
  res.writeHead(200, { "Content-Type": "text/csv" });
  fs.createReadStream(filePath).pipe(res);
}
```

---

## 8. Routing in Raw Node (typed routes)

```ts
import http from "node:http";
import { URL } from "node:url";

interface User {
  id: number;
  name: string;
}

interface ApiError {
  status: number;
  message: string;
}

const users: User[] = [{ id: 1, name: "Ada" }];

const server = http.createServer(async (req, res) => {
  const method = req.method ?? "GET";
  const parsed = new URL(req.url ?? "/", "http://localhost");
  const path = parsed.pathname;

  try {
    if (method === "GET" && path === "/api/users") {
      sendJson(res, 200, users);
      return;
    }

    if (method === "GET" && path.startsWith("/api/users/")) {
      const id = Number(path.split("/").pop());
      const user = users.find((u) => u.id === id);
      if (!user) {
        sendJson(res, 404, { error: { message: "user not found" } });
        return;
      }
      sendJson(res, 200, user);
      return;
    }

    if (method === "POST" && path === "/api/users") {
      const raw = await readBody(req);
      const body = JSON.parse(raw) as { name?: string };

      if (!body.name) {
        sendJson(res, 400, { error: { message: "name is required" } });
        return;
      }

      const created: User = { id: users.length + 1, name: body.name };
      users.push(created);
      res.setHeader("Location", `/api/users/${created.id}`);
      sendJson(res, 201, created);
      return;
    }

    sendJson(res, 404, { error: { message: "route not found" } });
  } catch (err) {
    const error = err as ApiError;
    sendJson(res, error.status ?? 500, {
      error: { message: error.message ?? "internal error" }
    });
  }
});

server.listen(3000);
```

> You can see why Express evolves out of this: routing, parsing, and responses get tedious fast — but you'll be fluent with the underlying types when you hit Express tomorrow.

---

## 9. Testing With curl

```bash
# Basic
curl http://localhost:3000/api/users

# POST JSON
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Grace"}'

# Show response headers
curl -i http://localhost:3000/api/users

# 404
curl -i http://localhost:3000/nope
```

---

## 10. What Not to Do

```text
❌ Blocking the event loop in a handler → server freezes for ALL requests
❌ Forgetting res.end() → request hangs until timeout
❌ Not catching body-parsing errors → crash on invalid JSON
❌ Using sync fs in a request handler
❌ Mixing req.params-style assumptions (raw http doesn't parse them!)
```

---

## Exercises

1. Start the "Hello from Node" server and curl it.
2. Serve `/api/time` returning `{ now: <ISO string> }`.
3. Implement GET `/api/users`, GET `/api/users/:id`, POST `/api/users` by hand with types.
4. Return proper `404` vs `400` (bad JSON) vs `201` for your routes.
5. Stream a large file back via `res` on route `/file`.
6. Run `npx tsc --noEmit` — zero errors required.

---

## Key Takeaways

- HTTP = request/response over TCP; method + path + headers + body
- Status codes: 2xx success, 3xx redirect, 4xx client, 5xx server
- `http.createServer` gives you typed `(IncomingMessage, ServerResponse)`
- `req` is a Readable stream (`for await (const chunk of req)` works)
- `res.writeHead` + `res.end` (or a typed `sendJson` helper) close the loop
- Raw Node routing works but is tedious → enter Express (tomorrow)