# Day 3 (Hands-on) — Node + pg, Connection Pooling & Parameterized Queries

**Previous:** [Day 2 — Subqueries, CTEs, Indexes, Transactions & ACID](day-2-advanced-sql-ctes-indexes-transactions-acid.md)

## Learning Objectives

- Install and configure `pg` in a TypeScript Express app
- Use `Pool` (not a single `Client`) for web apps
- Keep DB config in `.env` and typed in `config.ts`
- Write parameterized queries with `$1,$2,...` to prevent SQL injection
- Map DB rows to typed domain objects (mappers)
- Implement a repository/data-access layer (`db/userRepo.ts`, `db/taskRepo.ts`)
- Run a transaction from Node (`client.query('BEGIN')/.../COMMIT/ROLLBACK`)
- Handle connection errors and keep code strict (`zero any`)

---

## 1. Install Dependencies

```bash
npm install pg
npm install -D typescript tsx @types/node @types/express @types/pg
```

---

## 2. Environment Config

Never hardcode DB credentials.

```env
# .env (DO NOT COMMIT)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/task_manager_week9
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=task_manager_week9
NODE_ENV=development
```

```ts
// config.ts
import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3000),
  db: {
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "postgres",
    database: process.env.PGDATABASE ?? "task_manager_week9"
  },
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret"
} as const;
```

---

## 3. Connection Pooling with `pg.Pool`

For HTTP servers, **use a Pool**. Opening/closing a `Client` per request is slow and will exhaust connections.

```ts
// db/pool.ts
import { Pool } from "pg";
import { config } from "../config.js";

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  // optional: max connections, idle timeout, ssl etc.
  max: 10,
  idleTimeoutMillis: 30000
});

// log pool errors (don't crash silently)
pool.on("error", (err) => {
  console.error("Unexpected PG pool error", err);
});
```

### Test the pool

```ts
// db/health.ts
export async function pingDb(): Promise<string> {
  const res = await pool.query("SELECT NOW() AS now");
  return res.rows[0].now;
}
```

---

## 4. Parameterized Queries (Anti-SQL Injection)

**Rule:** Never do string concatenation. Use `$1, $2, ...`

### ❌ DANGEROUS (SQL injection)

```ts
const email = req.body.email; // user-controlled
const q = `SELECT * FROM users WHERE email = '${email}'`; // vulnerable!
await pool.query(q);
```

Example payload: `admin@x.com' OR '1'='1` breaks it.

### ✅ SAFE (parameterized)

```ts
const { email, password } = req.body;
const { rows } = await pool.query(
  "SELECT * FROM users WHERE email = $1",
  [email] // values go here, in order
);
```

Postgres treats values as data, not executable SQL.

---

## 5. Row Types & Mappers (TypeScript Strict)

Define the shape Postgres returns, then map to domain types.

```ts
// db/rows.ts
export interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: "admin" | "user";
  created_at: Date; // pg returns Date for TIMESTAMP
}

export interface TaskRow {
  id: number;
  owner_id: number;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  created_at: Date;
  updated_at: Date;
}
```

```ts
// db/mappers.ts
import type { Task, User, PublicUser } from "../types.js";
import type { TaskRow, UserRow } from "./rows.js";

export function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at.toISOString()
  };
}

export function toPublicUser(u: User): PublicUser {
  const { passwordHash, ...pub } = u; // strip hash
  return pub;
}

export function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}
```

---

## 6. Repository Layer (Data Access)

Keep SQL **inside the repo**, not in controllers. Controllers call `userRepo.findByEmail`, etc.

```ts
// db/userRepo.ts
import { pool } from "./pool.js";
import type { UserRow } from "./rows.js";
import { mapUser } from "./mappers.js";
import type { User } from "../types.js";

export const userRepo = {
  async findByEmail(email: string): Promise<User | undefined> {
    const { rows } = await pool.query<UserRow>(
      `SELECT id, email, name, password_hash, role, created_at
         FROM users
        WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    return rows[0] ? mapUser(rows[0]) : undefined;
  },

  async findById(id: number): Promise<User | undefined> {
    const { rows } = await pool.query<UserRow>(
      `SELECT id, email, name, password_hash, role, created_at
         FROM users
        WHERE id = $1`,
      [id]
    );
    return rows[0] ? mapUser(rows[0]) : undefined;
  },

  async create(input: { email: string; name: string; passwordHash: string; role: "admin"|"user" }): Promise<User> {
    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (email, name, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, password_hash, role, created_at`,
      [input.email.toLowerCase().trim(), input.name.trim(), input.passwordHash, input.role]
    );
    return mapUser(rows[0]);
  },

  async list(): Promise<User[]> {
    const { rows } = await pool.query<UserRow>(
      `SELECT id, email, name, password_hash, role, created_at
         FROM users
        ORDER BY id ASC`
    );
    return rows.map(mapUser);
  }
};
```

### Task repo (with filters + pagination)

```ts
// db/taskRepo.ts
import { pool } from "./pool.js";
import type { TaskRow } from "./rows.js";
import { mapTask } from "./mappers.js";
import type { Task, TaskStatus } from "../types.js";

export interface ListTasksParams {
  ownerId?: number;
  status?: TaskStatus;
  limit: number;
  offset: number;
}

export const taskRepo = {
  async list(params: ListTasksParams): Promise<{ items: Task[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.ownerId !== undefined) {
      conditions.push(`owner_id = $${idx++}`);
      values.push(params.ownerId);
    }
    if (params.status !== undefined) {
      conditions.push(`status = $${idx++}`);
      values.push(params.status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const dataSql = `
      SELECT id, owner_id, title, description, status, priority, created_at, updated_at
        FROM tasks
       ${where}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(params.limit, params.offset);

    const countSql = `SELECT COUNT(*)::int AS total FROM tasks ${where}`;
    const countValues = values.slice(0, values.length - 2); // drop limit/offset

    const [dataRes, countRes] = await Promise.all([
      pool.query<TaskRow>(dataSql, values),
      pool.query<{ total: number }>(countSql, countValues)
    ]);

    return {
      items: dataRes.rows.map(mapTask),
      total: countRes.rows[0]?.total ?? 0
    };
  },

  async findById(id: number): Promise<Task | undefined> {
    const { rows } = await pool.query<TaskRow>(
      `SELECT id, owner_id, title, description, status, priority, created_at, updated_at
         FROM tasks
        WHERE id = $1`,
      [id]
    );
    return rows[0] ? mapTask(rows[0]) : undefined;
  },

  async create(input: { ownerId: number; title: string; description?: string; status: TaskStatus; priority: "low"|"medium"|"high" }): Promise<Task> {
    const { rows } = await pool.query<TaskRow>(
      `INSERT INTO tasks (owner_id, title, description, status, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, owner_id, title, description, status, priority, created_at, updated_at`,
      [input.ownerId, input.title, input.description ?? null, input.status, input.priority]
    );
    return mapTask(rows[0]);
  },

  async update(id: number, patch: Partial<{ title: string; description?: string; status: TaskStatus; priority: "low"|"medium"|"high" }>): Promise<Task | undefined> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (patch.title !== undefined) { sets.push(`title = $${idx++}`); values.push(patch.title); }
    if (patch.description !== undefined) { sets.push(`description = $${idx++}`); values.push(patch.description); }
    if (patch.status !== undefined) { sets.push(`status = $${idx++}`); values.push(patch.status); }
    if (patch.priority !== undefined) { sets.push(`priority = $${idx++}`); values.push(patch.priority); }
    sets.push(`updated_at = NOW()`);

    if (sets.length === 1) return this.findById(id); // nothing to change except updated_at? skip noop

    values.push(id);
    const sql = `
      UPDATE tasks
         SET ${sets.join(", ")}
       WHERE id = $${idx}
       RETURNING id, owner_id, title, description, status, priority, created_at, updated_at
    `;
    const { rows } = await pool.query<TaskRow>(sql, values);
    return rows[0] ? mapTask(rows[0]) : undefined;
  },

  async remove(id: number): Promise<boolean> {
    const { rowCount } = await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }
};
```

---

## 7. Transactions from Node

Use a **client** from the pool for the transaction scope.

```ts
// db/tx.ts (example)
import { pool } from "./pool.js";
import type { User } from "../types.js";

export async function createUserWithFirstTask(input: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<User> {
  const client = await pool.connect(); // checkout a client
  try {
    await client.query("BEGIN");

    const userRes = await client.query(
      `INSERT INTO users (email, name, password_hash, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, email, name, password_hash, role, created_at`,
      [input.email, input.name, input.passwordHash]
    );

    const userId = userRes.rows[0].id;
    await client.query(
      `INSERT INTO tasks (owner_id, title, status, priority)
       VALUES ($1, 'Get started', 'todo', 'medium')`,
      [userId]
    );

    await client.query("COMMIT");
    // map userRes.rows[0] → return
    return mapUser(userRes.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK"); // undo on any error
    throw err;
  } finally {
    client.release(); // return client to pool
  }
}
```

**Golden rule:** `connect()` → `BEGIN` → queries → `COMMIT` or `ROLLBACK` → `release()`.

---

## 8. Wiring into Express (Minimal Example)

```ts
// app.ts (excerpt)
import express from "express";
import { userRepo } from "./db/userRepo.js";
import { toPublicUser } from "./db/mappers.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();
app.use(express.json());

app.get("/api/users", requireAuth, async (_req, res, next) => {
  try {
    const users = await userRepo.list();
    res.json({ success: true, data: users.map(toPublicUser) });
  } catch (err) {
    next(err);
  }
});

// health check (optional)
app.get("/health/db", async (_req, res, next) => {
  try {
    const now = await pingDb();
    res.json({ success: true, data: { db: "ok", now } });
  } catch (err) {
    next(err);
  }
});
```

---

## 9. SQL Migrations (Simple, Manual)

Keep schema in versioned `.sql` files. Run with `psql`.

```sql
-- migrations/001_init.sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NOT NULL, -- note: fix typo in mind, write correctly
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','user')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('todo','in_progress','done')) DEFAULT 'todo',
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('low','medium','high')) DEFAULT 'medium',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks (owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_status ON tasks (owner_id, status);
```

```bash
psql -U postgres -d task_manager_week9 -f migrations/001_init.sql
```

Optionally add `migrations/002_seed.sql` for dev data.

---

## 10. Exercises

1. Create DB + run `001_init.sql` in `psql`
2. Wire `pool.ts` + test `SELECT NOW()` via `/health/db`
3. Implement `userRepo.findByEmail` + `create` with parameterized queries
4. Implement `taskRepo.list` with `ownerId/status` filters + `LIMIT/OFFSET`
5. Convert one controller in your Task Manager to use repo (keep rest same)
6. Do a transaction: create user + task atomically; `ROLLBACK` on error
7. `EXPLAIN (ANALYZE)` a filtered query **before** and **after** adding an index

---

## Key Takeaways

- **Pool > Client per request** — use `pg.Pool` for web servers
- **Parameterized queries (`$1,$2`)** — required. Never concatenate SQL
- **Repo layer** decouples HTTP/controllers from SQL (easy to swap later)
- **Mappers** keep DB snake_case separate from TS camelCase
- **Transactions** use `BEGIN/COMMIT/ROLLBACK` + `client.release()`
- **Migrations** version schema; run manually with `psql` for now
- **EXPLAIN (ANALYZE)** tells the truth about index usage
- Keep secrets in `.env`; never commit `.env`

**Next:** [Assignments](assignments.md) | [Project: Migrate Task Manager to PostgreSQL](project-migrate-task-manager-to-postgres.md)