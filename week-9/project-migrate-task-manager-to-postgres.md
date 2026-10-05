# Project: Migrate the Task Manager from In-Memory to PostgreSQL

## Objective

Take your **Week 8 Task Manager API** (JWT auth, roles, zod validation, JSON-file store) and move its persistence to **PostgreSQL** — without changing the HTTP contract. This is the capstone for Week 9.

---

## Success Criteria

```text
The API responds EXACTLY as before, but data now lives in Postgres.
Same routes, same status codes, same response envelope — different backing store.
```

---

## Why This Matters

| In-memory / JSON file | PostgreSQL |
|----------------------|------------|
| Lost on restart (or whole-file rewrite) | Durable, transactional |
| No constraints (duplicate emails possible) | PK/FK/UNIQUE/CHECK enforced |
| O(n) scans in JS | Indexed queries |
| No concurrent writes | ACID + concurrency safety |
| Doesn't scale | Connection pooling + replicas (later) |

---

## What You Must Deliver

### 1. Schema (via migrations)

```sql
-- migrations/001_create_users.sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- migrations/002_create_tasks.sql
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- migrations/003_indexes.sql
CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks (owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_status ON tasks (owner_id, status);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
```

### 2. Data-access layer (repository pattern)

```text
src/
├── config.ts              # add db config from env
├── db/
│   ├── pool.ts            # pg.Pool
│   ├── rows.ts            # UserRow, TaskRow
│   ├── mappers.ts         # row → domain mapping
│   ├── userRepo.ts        # findByEmail, findById, create, list, remove
│   ├── taskRepo.ts        # list(filters), findById, create, update, remove
│   └── tx.ts              # createUserWithFirstTask (transaction demo)
├── controllers/           # SAME as Week 8, but call repos instead of store
├── middleware/            # UNCHANGED (auth, role, ownership, validate)
├── routes/                # UNCHANGED
├── app.ts                 # unchanged except pool error logging
└── server.ts              # ping DB on boot; fail fast if unreachable
```

### 3. Same HTTP contract

Every endpoint from Week 8 must behave identically:

```text
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
GET    /api/tasks?status=&priority=&page=&limit=
GET    /api/tasks/:id
POST   /api/tasks
PUT    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
GET    /api/users                (admin)
GET    /api/users/:userId/tasks  (admin)
DELETE /api/users/:id            (admin)
```

---

## Implementation Notes

### Handle `SERIAL` returning bigint

`pg` returns `BIGINT`/`SERIAL` (int8) as a **string** by default. Either:

```ts
pool.on("connect", (client) => client.query("SET SESSION SETTINGS ...")); // no
```

Simplest safe approach:

```ts
// parse explicitly when mapping
const id = Number(row.id);  // row.id may come back as "1"
```

Or set `pg.types`:

```ts
import pg from "pg";
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v)); // global
```

> Pick one approach and use it consistently in mappers.

### Timestamps

`TIMESTAMP` comes back as JS `Date`. Convert with `.toISOString()` in mappers so the API response shape stays a string (same as Week 8).

### Ownership checks now run against the DB

```ts
// middleware/ownership.ts
const task = await taskRepo.findById(Number(req.params.id));
if (!task) { fail(res, "task not found", 404); return; }
if (task.ownerId !== req.user?.id && req.user?.role !== "admin") {
  fail(res, "forbidden", 403);
  return;
}
req.task = task;
next();
```

### Duplicate email → 409

Let the DB be the source of truth:

```ts
// Postgres error code 23505 = unique_violation
try {
  return await userRepo.create(input);
} catch (err) {
  if (isUniqueViolation(err)) { fail(res, "email already registered", 409); return; }
  throw err;
}
```

```ts
// helpers/pgErrors.ts
interface PgErrorLike { code?: string }
export function isUniqueViolation(err: unknown): boolean {
  return (err as PgErrorLike).code === "23505";
}
```

### Fail fast on boot

```ts
// server.ts
import { pool } from "./db/pool.js";

async function main(): Promise<void> {
  try {
    await pool.query("SELECT 1");
    console.log("DB connected ✓");
  } catch (err) {
    console.error("Cannot reach Postgres. Check .env / migrations.", err);
    process.exit(1);
  }
  createApp().listen(config.port, () => console.log(`API on :${config.port}`));
}

void main();
```

### Graceful shutdown

```ts
// server.ts (bottom)
process.on("SIGINT", async () => {
  await pool.end();     // close pool before exiting
  process.exit(0);
});
```

---

## Testing Script

```bash
npm run dev

# register (should behave like Week 8)
curl -i -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@x.com","password":"supersecret1"}'

# duplicate → 409 (now enforced by UNIQUE)
curl -i -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada2","email":"ada@x.com","password":"supersecret1"}'

# login + CRUD as in Week 8
TOKEN="<from login>"

# restart the server, then GET tasks — data must still be there (durability proof)
curl -s http://localhost:3000/api/tasks -H "Authorization: Bearer $TOKEN"

# verify in psql
psql -U postgres -d task_manager_week9 -c "\dt"
psql -U postgres -d task_manager_week9 -c "SELECT count(*) FROM tasks;"
```

### Required proof-of-durability test

```text
1. Create 2 users + 3 tasks
2. Stop the server (Ctrl+C)
3. Start it again
4. GET /api/tasks → same data present
5. psql shows the rows
```

---

## Stretch Goals

```text
1. Seed script that inserts N users/tasks (for load testing)
2. Load-test a filtered list endpoint; EXPLAIN (ANALYZE) it; add an index; re-EXPLAIN
3. Add a transaction endpoint: "transfer task ownership" atomically
4. Soft delete tasks (deleted_at column) instead of hard DELETE
5. Add created_by audit column on tasks
```

---

## Deliverables

1. Full `src/` (repo layer, unchanged controllers/routes/middleware) + `migrations/*.sql`
2. `.env.example` (never commit real `.env`)
3. curl transcript: register/login/CRUD/admin + 401/403/404/409/422
4. Durability proof (before/after restart)
5. `tsc --noEmit` output (zero errors) + explanation of any `INT8` parsing choice
6. README: how to run migrations + start the app

---

## Grading Rubric

| Criteria | Points |
|----------|--------|
| Schema + constraints + indexes (migrations run cleanly) | 15% |
| Repository layer (parameterized, typed, no `any`) | 20% |
| HTTP contract unchanged (status codes + envelope identical) | 15% |
| Auth still works (JWT, roles, ownership) against Postgres | 15% |
| Transactions + error mapping (409 unique, etc.) | 10% |
| Durability & restart proof | 10% |
| **Type discipline: `strict`, zero `any`, `tsc --noEmit` clean** | 15% |