# Project: Authenticated Task Manager API (TypeScript + Express)

## Objective

Build a production-shaped **Task Manager REST API** with real authentication, role-based access, and hard security defaults. This is the capstone that ties **Week 7 (Express + structure)** to **Week 8 (auth + security)**.

## Non-negotiable Requirements

| Area | Requirement |
|------|-------------|
| Auth | `bcryptjs` hashing, `jsonwebtoken` access tokens, refresh rotation |
| Authorization | roles (`admin` / `user`) + ownership checks on every resource route |
| Validation | `zod` schemas for every body + query; 422 for contract violations |
| Error handling | centralized 4-arg handler, consistent envelope, no stack traces on 5xx |
| Response contracts | one envelope: `{ success: true, data }` / `{ success: false, error }` |
| Security | `helmet`, strict CORS, `express-rate-limit`, secrets from env |
| REST | correct methods, status codes, and **resource naming** |
| Types | `strict: true`, **zero `any`**, `tsc --noEmit` clean |

---

## REST Principles & Resource Naming

### Noun-plural resources, verbs via methods

```text
POST   /api/tasks            CREATE   (never /api/createTask)
GET    /api/tasks            READ list
GET    /api/tasks/:id        READ one
PUT    /api/tasks/:id        REPLACE (full)
PATCH  /api/tasks/:id        PARTIAL update
DELETE /api/tasks/:id        DELETE
```

### Sub-resources & relations

```text
GET /api/users/:userId/tasks        tasks owned by that user (admin)
```

### Status codes

| Action | Status |
|--------|--------|
| Create | `201 Created` + `Location` header |
| Read | `200 OK` |
| Update | `200 OK` (or `204`) |
| Delete | `204 No Content` |
| Invalid body | `400` malformed JSON / `422` valid but bad data |
| Not found | `404` |
| Not authenticated | `401` |
| Authenticated, not allowed | `403` |

---

## Data Model

```ts
// types.ts
export type Role = "admin" | "user";

export interface User {
  id: number;
  email: string;
  name: string;
  passwordHash: string;      // NEVER returned in responses
  role: Role;
  createdAt: string;
}

export type PublicUser = Omit<User, "passwordHash">;   // what routes actually send

export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: number;
  ownerId: number;           // who the task belongs to (ownership checks!)
  title: string;
  description?: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
}
```

---

## Endpoints

### Auth (public)

```text
POST   /auth/register        → 201 PublicUser
POST   /auth/login           → 200 { accessToken, user }        (rate limited)
POST   /auth/refresh         → 200 { accessToken, refreshToken } (rotation)
POST   /auth/logout          → 204                              (revoke refresh)
```

### Tasks (requireAuth + ownership)

```text
GET    /api/tasks?status=&priority=&page=1&limit=10   → 200 { items, total, page, limit }
GET    /api/tasks/:id                                → 200 task | 404
POST   /api/tasks                                    → 201 task
PUT    /api/tasks/:id                                → 200 task | 404 | 422
PATCH  /api/tasks/:id                                → 200 task | 404 | 422
DELETE /api/tasks/:id                                → 204 | 404
```

### Admin only (requireAuth + requireRole("admin"))

```text
GET    /api/users                → 200 PublicUser[]
GET    /api/users/:userId/tasks  → 200 tasks[]
DELETE /api/users/:id            → 204
```

---

## Project Structure

```
task-manager/
├── src/
│   ├── server.ts            # entry: init store → listen
│   ├── app.ts               # wiring order (helmet, cors, json, limits, routers...)
│   ├── config.ts            # ports, secrets, TTLs, CORS origins
│   ├── types.ts             # Role, User, Task, PublicUser, envelopes
│   ├── db/
│   │   ├── database.ts      # load/save JSON file persistence
│   │   └── store.ts         # userStore / taskStore repositories
│   ├── helpers/
│   │   ├── responses.ts     # ok() / fail() envelope builders
│   │   └── jwt.ts           # sign/verify typed tokens
│   ├── middleware/
│   │   ├── auth.ts          # requireAuth (attaches req.user)
│   │   ├── role.ts          # requireRole(...)
│   │   ├── ownership.ts     # requireTaskOwner
│   │   ├── validate.ts      # validateBody(schema) + validateQuery(schema)
│   │   ├── logger.ts
│   │   ├── notFound.ts
│   │   └── error.ts         # HttpError + errorHandler
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── tasks.routes.ts
│   │   └── users.routes.ts
│   └── controllers/
│       ├── auth.controller.ts
│       ├── tasks.controller.ts
│       └── users.controller.ts
├── data/db.json
├── .env.example             # JWT_ACCESS_SECRET=... etc (never committed)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Key Code Sketches

### Envelope contract (`helpers/responses.ts`)

```ts
import type { Response } from "express";

export interface ApiPayload<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: { message: string; status: number };
}

export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data } satisfies ApiPayload<T>);
}

export function fail(res: Response, message: string, status = 400): void {
  res.status(status).json({ success: false, error: { message, status } } satisfies ApiFailure);
}
```

### Validation (`middleware/validate.ts` + zod)

```ts
import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";

export function validateBody<T>(schema: ZodSchema<T>): RequestHandler {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const detail = parsed.error.errors
        .map((e) => `${e.path.join(".") ?? "body"}: ${e.message}`)
        .join("; ");
      fail(res, `validation failed: ${detail}`, 422);
      return;
    }
    req.body = parsed.data;                    // now narrow+typed
    next();
  };
}
```

### Tasks schema

```ts
import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium")
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial();   // PATCH
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
```

### Auth middleware (JWT)

```ts
// middleware/auth.ts
export const requireAuth: RequestHandler = (req, res, next) => {
  const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  if (!token) { fail(res, "missing token", 401); return; }

  try {
    const decoded = verifyAccessToken(token);            // throws if bad/expired
    req.user = { id: Number(decoded.sub), email: decoded.email, role: decoded.role };
    next();
  } catch {
    fail(res, "invalid or expired token", 401);
  }
};
```

### Ownership middleware

```ts
// middleware/ownership.ts
export const requireTaskOwner: RequestHandler = async (req, res, next) => {
  const task = await taskStore.findById(Number(req.params.id));
  if (!task) { fail(res, "task not found", 404); return; }

  const user = req.user;
  if (!user) { fail(res, "unauthorized", 401); return; }
  if (task.ownerId !== user.id && user.role !== "admin") {
    fail(res, "forbidden", 403);                         // authenticated but not the owner
    return;
  }
  req.task = task;                                       // augment: handler skips re-fetch
  next();
};
```

### Login controller (typed, sanitized)

```ts
// controllers/auth.controller.ts
export const login: RequestHandler = async (req, res) => {
  const input = req.body as LoginInput;                  // already validated by middleware
  const user = await userStore.findByEmail(input.email);

  // Same generic message for missing user OR wrong password (anti-enumeration)
  const hash = user?.passwordHash ?? "";                 // compare against "" so timing is similar
  const okPassword = hash !== "" && (await verifyPassword(input.password, hash));
  if (!user || !okPassword) {
    fail(res, "invalid credentials", 401);
    return;
  }

  const tokenPayload: TokenPayload = { sub: String(user.id), email: user.email, role: user.role };
  ok(res, {
    accessToken: signAccessToken(tokenPayload),
    user: toPublicUser(user)
  });
};
```

### Error handler (never leaks internals)

```ts
// middleware/error.ts
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  console.error(err);
  const status = err instanceof HttpError ? err.status : 500;
  const message = status >= 500 ? "Internal server error" : err instanceof Error ? err.message : "unknown error";
  fail(res, message, status);
};
```

---

## Persistence

Same JSON-file approach as Week 7 (a `db.json`), so the app restarts with its data. Store both users and tasks:

```ts
// db/database.ts (shape)
export interface DbShape {
  users: User[];
  tasks: Task[];
}
```

> Stretch: swap for SQLite/Postgres — only the store changes, controllers don't.

---

## Testing Script

```bash
# boot
npm run dev

# register + login
curl -i -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@x.com","password":"supersecret1"}'
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@x.com","password":"supersecret1"}' | node -pe 'JSON.parse(await new Response(process.stdin.fs).text()).data.accessToken' 2>/dev/null || true)
TOKEN="<paste from login response>"

# CRUD
curl -s http://localhost:3000/api/tasks -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:3000/api/tasks -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"title":"Ship week 8","priority":"high"}'
curl -s http://localhost:3000/api/tasks?status=todo -H "Authorization: Bearer $TOKEN"
curl -si -X PATCH http://localhost:3000/api/tasks/1 -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"status":"done"}'
curl -si -X DELETE http://localhost:3000/api/tasks/1 -H "Authorization: Bearer $TOKEN"

# auth & access control
curl -si http://localhost:3000/api/tasks                          # 401 (no token)
curl -si http://localhost:3000/api/users -H "Authorization: Bearer $TOKEN"   # 403 (not admin)
curl -si -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":""}'                                                # 422 (zod)
curl -si -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@x.com","password":"wrongpass"}'                # ×6 → 429

# hardening
curl -sI http://localhost:3000/auth/login | grep -iE "content-security|x-frame"
curl -si http://localhost:3000/auth/login -H "Origin: http://evil.com"

# type health
npm run typecheck           # tsc --noEmit, zero errors
```

---

## Deliverables

1. Full `src/` in the structure above + `data/` + `.env.example` + `README.md`
2. `package.json` scripts: `dev`, `start`, `typecheck`, `build`, `test`
3. curl transcript covering every endpoint: happy paths **and** 401/403/404/409/422/429
4. `tsc --noEmit` output showing zero errors (paste it)
5. (stretch) supertest suite in `test/`

---

## Stretch Goals

```text
1. Refresh-token rotation persisted (revoked list in db.json)
2. Pagination cursor or offset on GET /api/tasks (already query-shaped)
3. supertest + vitest covering auth + ownership + hardening
4. SQLite/Postgres via Prisma — isolate behind the store interface
5. Audit log: who changed which task, when (append-only log file)
```

---

## Grading Rubric

| Criteria | Points |
|----------|--------|
| JWT auth: register/login/refresh/logout, typed tokens, expiry handling | 15% |
| Authorization: `requireRole` + ownership, correct 401/403/404 semantics | 20% |
| CRUD correctness: methods, status codes, RESTful resource naming | 15% |
| zod validation on all bodies/queries with 422 | 10% |
| Centralized error handling + consistent response contracts | 10% |
| Hardening: helmet, strict CORS, rate limits, no stack traces, env secrets | 10% |
| **Type discipline: `strict`, zero `any`, `tsc --noEmit` clean** | 20% |