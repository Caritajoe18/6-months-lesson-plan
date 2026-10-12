# Day 3 (Hands-on) — Migrations, Seeding, Transactions & Raw Queries

**Previous:** [Day 2 — Relations, Nested Queries, Filtering & Pagination](day-2-relations-nested-queries-filtering-pagination.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Evolve a schema with the ORM 8 flow: `contract emit` → `migration plan` → `db migrate`
- Read a generated `migration.ts` and know when to **edit** it
- Understand `db init` / `db update` / `db verify` / `db sign`, and handle **drift**
- Write a typed **seed script** (ORM 8 has no `db seed` command)
- Use **`db.transaction()`** correctly, and set an isolation level by hand
- Drop to **raw SQL** (`db.raw.sql`) safely, parameterized, when the query builder can't express it

> ORM 8 renamed the migration commands. `prisma migrate dev` / `deploy` / `reset` do not exist. See [Generating a migration](https://www.prisma.io/docs/orm/migrations/generating-a-migration).

---

## 1. The ORM 8 Migration Workflow

```text
edit contract.prisma
      │
      ▼
prisma contract emit                      # compile contract → contract.json + contract.d.ts
      │
      ▼
prisma migration plan --name <change>      # write a migration folder (does NOT touch the DB)
      │
      ▼
prisma migration show <dir>                # review what it will do
      │
      ▼
prisma db migrate --advance-ref db         # apply it to the dev DB, update the `db` ref
```

Key differences from ORM 7:

- **Emit first.** `migration plan` reads `contract.json`, so if you forget `contract emit` it plans from the previous state (or prints "No changes detected").
- **Planning never connects to a database.** You can plan in CI with no credentials.
- A migration folder contains **`migration.ts`** (TypeScript you own), `ops.json`, and `migration.json` — **no `migration.sql`**. The change is a list of method calls.

### Command cheat sheet

| Command | Use it for |
|---------|-----------|
| `npx prisma contract emit` | Compile the contract (replaces `generate`) |
| `npx prisma migration plan --name <n>` | Write a migration folder to review/commit |
| `npx prisma migration show <dir>` | Print a migration's operations + DDL preview (no DB) |
| `npx prisma migration graph` | Show the whole history |
| `npx prisma migration check` | Integrity check (exit `0` ok, `4` failure) |
| `npx prisma db migrate --advance-ref db` | Apply planned migrations in development |
| `npx prisma db migrate --to <ref>` | Apply up to a ref (CI/production — no `--advance-ref`) |
| `npx prisma db init` | Create tables in an **empty** database (once) |
| `npx prisma db update` | Apply changes to a dev DB **without** keeping migration files |
| `npx prisma db verify` | Check the database still matches the contract |
| `npx prisma db sign` | Record that the DB matches the contract (rare) |

> There is **no `migrate reset`**. To reset: drop and recreate the database with `psql`, then `npx prisma db init`.

---

## 2. Your First Migration

```prisma
// use prisma-8

model User {
  id    Int     @id @default(autoincrement())
  email String
  name  String?

  @@map("user")
}
```

```bash
npx prisma contract emit
npx prisma migration plan --name init
```

```text
✔ Planned 2 operation(s)
migrations/app/20260707T1005_init
├─ Create schema "public"
└─ Create table "user"

ℹ DDL preview
CREATE SCHEMA IF NOT EXISTS "public";
CREATE TABLE "public"."user" (
  "email" text NOT NULL,
  "id" int4 NOT NULL,
  "name" text,
  PRIMARY KEY ("id")
);
```

Read the folder and commit it:

```ts
// migrations/app/20260707T1005_init/migration.ts (excerpt)
export default class M extends Migration<never, End> {
  override get operations() {
    return [
      this.createSchema({ schema: "public" }),
      this.createTable({
        schema: "public",
        table: "user",
        columns: [
          col("email", "text", { notNull: true, codecRef: { codecId: "pg/text@1" } }),
          col("id", "int4", { notNull: true, codecRef: { codecId: "pg/int4@1" } }),
          col("name", "text", { codecRef: { codecId: "pg/text@1" } }),
        ],
        constraints: [primaryKey(["id"])],
      }),
    ];
  }
}
```

Then apply it:

```bash
npx prisma db migrate --advance-ref db
```

`--advance-ref db` points the `db` ref (in `migrations/app/refs/db.json`) at the new contract state, so the next `migration plan` knows where to start. **Commit `refs/db.json`** with the migrations.

---

## 3. Common Changes & Migration Behavior

| Change | Migration does |
|--------|----------------|
| Add nullable column | `ADD COLUMN` (safe) |
| Add non-null column **with** default | add + default (safe) |
| Add non-null column **without** default | plans `ADD COLUMN` + `SET NOT NULL` with a **placeholder** you must fill (see below) |
| Rename a field | planned as **drop + add** — destructive! See the fix below |
| Drop a column | destructive; `db update` asks before dropping |
| Add `@@index` / unique | `CREATE INDEX` / `CREATE UNIQUE INDEX` (safe) |

### The placeholder (required column on an existing table)

Adding a required column with no default can't be planned in full — only you know what existing rows should hold. `migration plan` writes the `ADD COLUMN` and `SET NOT NULL`, with `placeholder(...)` calls marking where your backfill queries go. Fill them with the SQL query builder, recompile (`node migration.ts`), and only then can it run.

### The rename problem

`migration plan` does **not** detect renames; it plans drop + add and warns about data loss. To keep the data, edit `migration.ts`, replace the drop/add pair with a `rawSql` operation running `ALTER TABLE ... RENAME COLUMN`, and recompile.

```ts
this.rawSql({ schema: "public", sql: "ALTER TABLE \"user\" RENAME COLUMN \"name\" TO \"display_name\"" }),
```

Alternatively, keep the DB column name and rename only the Prisma field with `@map`:

```prisma
model User {
  displayName String @map("name")   // field renamed, column stays "name" → no data loss
}
```

### Drift

```text
Drift = the DB no longer matches the migrations (someone ran db update / psql directly).
Check:  npx prisma db verify
Fix:    db update (dev)  •  db sign (if it already matches)  •  follow rollbacks-and-recovery
```

---

## 4. Seeding

ORM 8 has **no `prisma db seed` command**. A seed is just a TypeScript file that imports `db` and runs queries. Keep it **idempotent** (use `upsert`) so re-running is safe.

```ts
// src/prisma/seed.ts
import { db } from "./db.js";
import bcrypt from "bcryptjs";

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("password123", 10);

  const ada = await db.orm.public.User.upsert({
    create: { email: "ada@x.com", name: "Ada Lovelace", passwordHash, role: "ADMIN" },
    update: {},
    conflictOn: { email: "ada@x.com" },
  });

  const grace = await db.orm.public.User.upsert({
    create: { email: "grace@x.com", name: "Grace Hopper", passwordHash, role: "USER" },
    update: {},
    conflictOn: { email: "grace@x.com" },
  });

  const urgent = await db.orm.public.Tag.upsert({
    create: { label: "urgent" },
    update: {},
    conflictOn: { label: "urgent" },
  });

  await db.orm.public.Task.createAll(
    [
      { title: "Ship week 10 notes", ownerId: ada.id, priority: "HIGH" },
      { title: "Solve exercises", ownerId: grace.id, priority: "HIGH" },
    ],
    { onConflict: "skip" },
  );

  console.log(`Seeded ${ada.email}, ${grace.email} (tag: ${urgent.label})`);
}

main()
  .then(() => db.close())
  .catch(async (error) => {
    console.error(error);
    await db.close();
    process.exit(1);
  });
```

Run it the way you run any TS file:

```bash
npx tsx src/prisma/seed.ts
```

> `upsert` on PostgreSQL needs `conflictOn` naming a unique column; the value is required but ignored. `update: {}` means "do nothing if it exists".

---

## 5. Transactions

There is no `$transaction` and no array form. Everything is **`db.transaction(async (tx) => ...)`**, and inside you query through `tx` (`tx.orm`), not `db`.

```ts
import { db } from "./db.js";

const result = await db.transaction(async (tx) => {
  const user = await tx.orm.public.User.create({
    email: "jane@prisma.io",
    name: "Jane",
  });
  const task = await tx.orm.public.Task.create({
    title: "Hello",
    ownerId: user.id,
  });
  return { userId: user.id, taskId: task.id };
});
// both exist, or neither does
```

### Rules

- The transaction **commits when the callback returns** and **rolls back when it throws**.
- Use **`tx`, not `db`**, for every query inside — a `db` query runs on its own connection, outside the transaction, and won't roll back.
- **No nested transactions.** Calling `db.transaction` inside a callback starts a *separate* transaction. Pass `tx` to helpers instead.
- Transactions are **not** for side effects: never send an email inside the callback (it won't roll back). Return what you need, then act after commit.

### Isolation level (there is no option)

`db.transaction()` takes only the callback — no `isolationLevel`, `timeout`, or `maxWait`. Every transaction runs at the database default (`READ COMMITTED`). To change it, set it as the **first statement**:

```ts
import { db } from "./db.js";

await db.transaction(async (tx) => {
  await tx.execute(
    db.raw.sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`.affectedCount().build(),
  );
  // ... your writes
});
```

### Write conflicts

When two transactions touch the same rows, PostgreSQL aborts one. The error carries `sqlState` `40001` (serialization) or `40P01` (deadlock); if it surfaces at commit the code is `RUNTIME.TRANSACTION_COMMIT_FAILED` with the DB error on `cause`. Prisma **does not retry** — write the retry yourself:

```ts
async function withRetry<T>(run: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      const source = error instanceof Error && error.cause ? error.cause : error;
      const code = typeof source === "object" && source && "sqlState" in source
        ? (source as { sqlState?: string }).sqlState
        : null;
      if ((code !== "40001" && code !== "40P01") || attempt === attempts) throw error;
    }
  }
}
```

### Read-modify-write (because there is no `increment`)

ORM 8 dropped `{ increment: n }` / `{ decrement: n }`. Either read then write inside a transaction, or use raw SQL:

```ts
await db.transaction(async (tx) => {
  const product = await tx.orm.public.Product.where({ id: 1 }).all().firstOrThrow();
  if (product.stock < 2) throw new Error("insufficient stock");
  await tx.orm.public.Product.where({ id: 1 }).update({ stock: product.stock - 2 });
});
```

---

## 6. Raw Queries

When the typed APIs and the SQL builder can't express it, drop to raw SQL. Two forms:

- **`fns.raw`** — a fragment used *inside* a builder query (Day 3 bonus; stays typed).
- **`db.raw.sql`** — a whole statement.

A whole statement that **returns rows** ends with `.returnsRow(spec).build()`, then runs through `db.runtime().query(...)`. A statement that **changes rows** ends with `.affectedCount().build()`, then runs through `db.runtime().execute(...)`.

```ts
import { db } from "./db.js";

// rows: every column you select needs a declared type
const user = db.sql.public.User;
const select = db.raw.sql`
  SELECT status, COUNT(*)::int AS count
  FROM "task"
  WHERE owner_id = ${ownerId}
  GROUP BY status
  ORDER BY count DESC
`
  .returnsRow({ status: user.columns.id, count: "pg/int8@1" })
  .build();

const rows = await db.runtime().query(select);

// writes: ask for the affected count
const update = db.raw.sql`
  UPDATE "task" SET priority = ${"HIGH"}
  WHERE owner_id = ${ownerId} AND status = ${"TODO"}
`.affectedCount().build();

const { affectedRows } = await db.runtime().execute(update);
```

### Parameterization (injection safety)

Values interpolated with `${...}` are sent as **bound parameters** (`$1`, `$2`, …), never pasted into the SQL. So this is safe:

```ts
const rows = await db.raw.sql`SELECT * FROM "user" WHERE email = ${email}` /* ... */.build();
```

Bare `number`, `bigint`, `string`, `boolean`, and `Uint8Array` are interpolated directly and get a type id automatically. Anything else — a `Temporal.Instant`, a decimal, a `uuid` — wrap in `param(value, { codecId })`:

```ts
import { param } from "@prisma/orm-postgres/relational-core/expression";

const cutoff = param(Temporal.Instant.from("2026-01-01T00:00:00Z"), {
  codecId: "pg/timestamptz-temporal@1",
});
const q = db.raw.sql`
  SELECT id FROM "task" WHERE created_at >= ${cutoff}
`.returnsRow({ id: db.sql.public.Task.columns.id }).build();
const rows = await db.runtime().query(q);
```

Common type ids: `pg/text@1`, `pg/int4@1`, `pg/int8@1`, `pg/bool@1`, `pg/uuid@1`, `pg/numeric@1`, `pg/jsonb@1`. A column's own id is `db.sql.public.<table>.columns.<col>.codecId`.

### Type pitfalls

- **`COUNT(*)` is `int8`/`bigint`**, not `number`. Declare `"pg/int8@1"` and handle a `bigint`, or cast in SQL (`COUNT(*)::int`).
- Rows come back as `unknown` unless you supply `.returnsRow(...)` — name every column, and mark nullable columns `{ codecId: "pg/text@1", nullable: true }`.
- A missing column in the spec throws `RUNTIME.RAW_ROW_COLUMN_MISSING`; a failing statement throws a `SqlQueryError` whose `sqlState` is the PG code (`23505` etc.).

### When to drop to raw SQL

```text
prisma task.where(...).include(...)     → normal CRUD, relations, simple filters
db.transaction(async tx => ...)         → multi-step writes
db.sql.public.Task...                   → typed builder for joins/aggregates
db.raw.sql`...`                         → window functions, CTEs, bulk, list filters,
                                          read-modify-write arithmetic, JSON path queries
```

Keep raw SQL in a **repository**, never in a controller.

---

## 7. Mapping Errors to HTTP

```ts
// src/app.ts (excerpt)
import { isStructuredError } from "@prisma/orm-postgres/utils/structured-error";

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Error && "sqlState" in err && (err as { sqlState?: string }).sqlState === "23505") {
    res.status(409).json({ success: false, error: { message: "already exists" } });
    return;
  }
  if (isStructuredError(err) && err.code === "RUNTIME.NO_ROWS") {
    res.status(404).json({ success: false, error: { message: "not found" } });
    return;
  }
  res.status(500).json({ success: false, error: { message: "Internal server error" } });
});
```

---

## 8. What Not to Do

```text
❌ Running `prisma db update` against production (use migration plan + db migrate)
❌ Forgetting `contract emit` before `migration plan`
❌ Editing ops.json / migration.json by hand (edit migration.ts, then recompile)
❌ Expecting renames to be detected — plan is drop+add; use rawSql RENAME or @map
❌ Non-idempotent seeds (use upsert / { onConflict: "skip" })
❌ Using `db` inside `db.transaction(tx => ...)` instead of `tx`
❌ Relying on `isolationLevel` / `timeout` options — they don't exist
❌ `$queryRawUnsafe`-style string building — interpolate `${...}` or `param(...)`
❌ Forgetting `await db.close()` on shutdown
```

---

## Exercises

1. Add `Profile` (1:1) and the `Tag`/`TaskTag` N:M; run `contract emit` + `migration plan --name relations` + `db migrate --advance-ref db`.
2. Read the new `migration.ts` and explain each operation.
3. Add a required column with a default (migrate). Then add one **without** a default and fill the placeholder.
4. Demonstrate the rename problem, then fix it with `@map`, then with a `rawSql` RENAME.
5. Write `src/prisma/seed.ts` (3 users, tasks, tags); run it twice; confirm idempotency.
6. `db verify`; deliberately drift with a direct `psql` change and recover.
7. `db.transaction` that creates a user + task; make the task fail and confirm both roll back.
8. Set `SERIALIZABLE` via raw SQL, then demonstrate a `40001` conflict and retry.
9. `db.raw.sql` a `GROUP BY status` count and compare with `groupBy`.

---

## Key Takeaways

- Flow is `contract emit` → `migration plan` → review → `db migrate`; planning never touches the DB
- Migration folders hold `migration.ts` + JSON, not SQL; edit the TS and recompile
- No `migrate reset`; drop/recreate + `db init`. `db update`/`db init`/`db verify`/`db sign` cover dev and CI
- Renames are drop+add — keep data with `@map` or a `rawSql` RENAME
- No `db seed`; write `src/prisma/seed.ts` and run `npx tsx`; make it idempotent
- `db.transaction(async tx => ...)` only; always use `tx`; no options, no nesting
- No `increment` — read-modify-write in a transaction, or raw SQL
- Raw SQL: `db.raw.sql` + `.returnsRow().build()`/`.affectedCount().build()` + `db.runtime().query/execute`
- Interpolated `${...}` values are bound parameters; wrap exotic values in `param(...)`
- Map `sqlState === "23505"` → 409 and structured codes → 404/400

**Sources:** [Generating a migration](https://www.prisma.io/docs/orm/migrations/generating-a-migration) · [Transactions](https://www.prisma.io/docs/orm/fundamentals/transactions) · [Raw queries](https://www.prisma.io/docs/orm/reference/raw-queries) · [Error reference](https://www.prisma.io/docs/orm/reference/error-reference)

**Next:** [Assignments](assignments.md) | [Project: E-commerce Backend with Prisma](project-ecommerce-backend-prisma.md)
