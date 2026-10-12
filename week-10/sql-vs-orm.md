# Week 10 — SQL vs. ORM: Same Query, Two Ways

A side-by-side reference comparing the **raw SQL** you wrote in Week 9 (via `node-postgres`, `pg`) with the equivalent **Prisma ORM 8** call. Same database, same results — different trade-offs.

> Both columns target **PostgreSQL**. The ORM column is **Prisma ORM 8** (`@prisma/orm-postgres`): queries go through `db.orm.public.Model`, and terminal methods (`.all()`, `.first()`) actually run the query. ORM 7 syntax (`prisma.user.findMany`, `$queryRaw`) is **not** used here.

---

## 0. Setup Comparison

| | Raw `pg` (Week 9) | Prisma ORM 8 (Week 10) |
|---|---|---|
| Install | `npm i pg` | `npm i @prisma/orm-postgres` + `npm i -D prisma` |
| Schema | hand-written `CREATE TABLE` / `.sql` files | `contract.prisma` (starts with `// use prisma-8`) |
| Types | manual: `interface UserRow` written by hand | generated: `npx prisma contract emit` |
| Connect | `new Pool({ connectionString })` | `db` from `src/prisma/db.ts` |
| Migrations | you track `.sql` + a runner | `migration plan` → review → `db migrate` |
| Result typing | `QueryResult<UserRow>` (you cast) | inferred from the contract |

```ts
// Raw pg
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [email]);
```

```ts
// Prisma ORM 8
import { db } from "./prisma/db.js";
const user = await db.orm.public.User.first({ email });
```

---

## 1. SELECT — all rows

```sql
SELECT id, email, display_name FROM users ORDER BY created_at DESC LIMIT 20;
```
```ts
await db.orm.public.User
  .select("id", "email", "displayName")
  .orderBy((u) => u.createdAt.desc())
  .limit(20)
  .all();
```

> ORM 7 equivalent: `prisma.user.findMany({ select: {...}, orderBy: {...}, take: 20 })`.

---

## 2. SELECT — one row / one-or-throw

```sql
SELECT * FROM users WHERE email = $1 LIMIT 1;
```
```ts
// returns User | null
const user = await db.orm.public.User.first({ email });

// throws RUNTIME.NO_ROWS instead of returning null
const must = await db.orm.public.User
  .where({ email })
  .all()
  .firstOrThrow();
```

---

## 3. WHERE — equality, ranges, patterns

```sql
SELECT * FROM tasks
WHERE owner_id = $1
  AND status = 'TODO'
  AND title ILIKE '%sql%'
  AND priority IN ('HIGH', 'URGENT');
```
```ts
import { and } from "@prisma/orm-postgres/orm-client";

await db.orm.public.Task
  .where((t) =>
    and(
      t.ownerId.eq(ownerId),
      t.status.eq("TODO"),
      t.title.ilike("%sql%"),
      t.priority.in(["HIGH", "URGENT"]),
    ),
  )
  .all();
```

| SQL | ORM operator |
|-----|--------------|
| `=` / `<>` | `.eq` / `.neq` |
| `>` `>=` `<` `<=` | `.gt` `.gte` `.lt` `.lte` |
| `LIKE` / `ILIKE` | `.like` / `.ilike` (write `%` yourself) |
| `IN (...)` / `NOT IN (...)` | `.in([...])` / `.notIn([...])` |
| `IS NULL` / `IS NOT NULL` | `.isNull()` / `.isNotNull()` |

> ORM 7's `contains: { mode: "insensitive" }` → ORM 8 `.ilike("%...%")`.
> `AND` = chain `.where(...)` or `and(...)`. `OR`/`NOT` use `or(...)` / `not(...)`.

---

## 4. JOIN / relations

```sql
SELECT p.*, u.email AS author_email
FROM posts p
JOIN users u ON u.id = p.author_id
WHERE u.email = $1;
```
```ts
await db.orm.public.Post
  .where((p) => p.author.email.eq(email))
  .include("author", (a) => a.select("id", "email"))
  .all();
```

One-to-many with a nested include (no N+1 loop):

```sql
-- two queries, or one join; raw SQL you must de-dupe yourself
SELECT * FROM users WHERE id = $1;
SELECT * FROM tasks WHERE owner_id = $1;
```
```ts
await db.orm.public.User
  .where({ id: 1 })
  .include("tasks", (tasks) => tasks.orderBy((t) => t.createdAt.desc()).limit(10))
  .all();
```

> `include("relation", refine?)` replaces ORM 7's `include: { relation: { ... } }`.

---

## 5. Grouping & aggregates

```sql
SELECT status, COUNT(*) AS count
FROM tasks
WHERE owner_id = $1
GROUP BY status
HAVING COUNT(*) > 2
ORDER BY count DESC;
```
```ts
await db.orm.public.Task
  .where({ ownerId })
  .groupBy("status")
  .having((h) => h.count().gt(2))
  .orderBy("count", "desc")
  .aggregate((a) => ({ status: a.groupBy("status"), count: a.count() }));
```

Aggregate without grouping:

```sql
SELECT COUNT(*) AS total, MAX(created_at) AS newest FROM tasks WHERE owner_id = $1;
```
```ts
const { total, newest } = await db.orm.public.Task
  .where({ ownerId })
  .aggregate((a) => ({
    total: a.count(),
    newest: a.max("createdAt"),
  }));
```

> ORM 7's `_count` / `_avg` / `groupBy` become `aggregate()` / `groupBy().having().aggregate()`.
> `groupBy(...)` returns a **GroupedCollection** — you must call `.aggregate(...)` on it.

---

## 6. Pagination

### Offset

```sql
SELECT * FROM tasks ORDER BY created_at DESC LIMIT $1 OFFSET $2;
```
```ts
await db.orm.public.Task
  .orderBy((t) => t.createdAt.desc())
  .limit(limit)
  .offset((page - 1) * limit)
  .all();
```

### Cursor (keyset)

```sql
SELECT * FROM tasks WHERE id > $1 ORDER BY id ASC LIMIT $2;
```
```ts
await db.orm.public.Task
  .orderBy((t) => t.id.asc())
  .cursor({ id: lastSeenId })
  .limit(limit)
  .all();
```

> `.cursor(...)` must follow `orderBy(...)` and name every sort column; it's PostgreSQL-only.
> `skip`/`take` (ORM 7) → `.offset()` / `.limit()` (ORM 8).

---

## 7. INSERT

```sql
INSERT INTO users (email, display_name, password_hash)
VALUES ($1, $2, $3)
RETURNING *;
```
```ts
await db.orm.public.User.create({
  email,
  displayName,
  passwordHash,
});
```

Bulk insert:

```sql
INSERT INTO users (email, display_name, password_hash)
VALUES ($1,$2,$3), ($4,$5,$6)
ON CONFLICT (email) DO NOTHING
RETURNING *;
```
```ts
await db.orm.public.User.createAll(
  [
    { email: "a@x.com", displayName: "A", passwordHash: "h" },
    { email: "b@x.com", displayName: "B", passwordHash: "h" },
  ],
  { onConflict: "skip", conflictOn: ["email"] },
);
```

> No `data:` wrapper in ORM 8. `createMany`/`skipDuplicates` (ORM 7) → `createAll([...], { onConflict: "skip", conflictOn: [...] })`.

---

## 8. UPDATE

```sql
UPDATE users SET display_name = $1 WHERE id = $2 RETURNING *;
```
```ts
await db.orm.public.User
  .where({ id })
  .update({ displayName: "Ada Lovelace" });
```

Update many:

```sql
UPDATE tasks SET status = 'DONE' WHERE owner_id = $1 AND status = 'TODO' RETURNING *;
```
```ts
await db.orm.public.Task
  .where((t) => t.ownerId.eq(ownerId).and(t.status.eq("TODO")))
  .updateAll({ status: "DONE" });   // returns the rows; updateAndCount returns a number
```

> `.update()` changes **one** matching row; `.updateAll()` / `.updateAndCount()` change all.

### No `increment` in ORM 8

```sql
UPDATE products SET stock = stock - $1 WHERE id = $2;
```
```ts
// ORM 7's { stock: { decrement: qty } } was removed. Read, then write — ideally in a transaction:
await db.transaction(async (tx) => {
  const p = await tx.orm.public.Product.where({ id }).all().firstOrThrow();
  await tx.orm.public.Product.where({ id }).update({ stock: p.stock - qty });
});
```

---

## 9. DELETE

```sql
DELETE FROM tags WHERE label = $1 RETURNING *;
DELETE FROM tasks WHERE owner_id = $1;
```
```ts
await db.orm.public.Tag.where({ label }).delete();        // one row, returns it
await db.orm.public.Task.where({ ownerId }).deleteAll();  // all rows, returns them
```

---

## 10. Upsert

```sql
INSERT INTO tags (label) VALUES ($1)
ON CONFLICT (label) DO UPDATE SET label = EXCLUDED.label
RETURNING *;
```
```ts
await db.orm.public.Tag.upsert({
  create: { label: "urgent" },
  update: { label: "urgent" },
  conflictOn: { label: "urgent" },   // the unique column; value required but ignored
});
```

> ORM 7's `where` in `upsert` → ORM 8's `conflictOn`.

---

## 11. Transactions

```ts
// Raw pg
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const a = await client.query("INSERT INTO accounts (id, balance) VALUES ($1,$2)", [1, 100]);
  const b = await client.query("INSERT INTO accounts (id, balance) VALUES ($1,$2)", [2, 50]);
  await client.query("COMMIT");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
}
```
```ts
// Prisma ORM 8 — one form only
await db.transaction(async (tx) => {
  await tx.orm.public.Account.create({ id: 1, balance: 100 });
  await tx.orm.public.Account.create({ id: 2, balance: 50 });
  // commit on return, rollback on throw
});
```

| | Raw `pg` | ORM 8 |
|---|---|---|
| Begin | `BEGIN` | `db.transaction(async tx => ...)` |
| Inside | `client.query(...)` | `tx.orm...` (**never `db`**) |
| Commit | `COMMIT` | return from callback |
| Rollback | `ROLLBACK` | throw inside callback |
| Isolation | `BEGIN ISOLATION LEVEL SERIALIZABLE` | `tx.execute(db.raw.sql\`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE\`.affectedCount().build())` |
| Retry | yours to write | yours to write (`sqlState` `40001`/`40P01`) |

> No `$transaction([...])` array form and no `isolationLevel` option in ORM 8.

---

## 12. Raw SQL — when the builder isn't enough

Even inside the ORM you can run SQL directly. This is the escape hatch you use *instead of* abandoning the ORM.

```ts
import { db } from "./db/prisma.js";

// rows: declare the type id of every column you select
const q = db.raw.sql`
  SELECT status, COUNT(*)::int AS count
  FROM "task"
  WHERE owner_id = ${ownerId}
  GROUP BY status
  ORDER BY count DESC
`
  .returnsRow({ status: db.sql.public.Task.columns.status.codecId, count: "pg/int8@1" })
  .build();

const rows = await db.runtime().query(q);

// writes: ask for the affected count
const upd = db.raw.sql`
  UPDATE "task" SET priority = ${"HIGH"} WHERE owner_id = ${ownerId}
`.affectedCount().build();

const { affectedRows } = await db.runtime().execute(upd);
```

> Interpolated `${...}` values are **bound parameters** ($1, $2…), never string-concatenated — safe from injection.
> Wrap exotic values with `param(value, { codecId })` from `@prisma/orm-postgres/relational-core/expression`.
> `COUNT(*)` is `bigint` — declare `"pg/int8@1"` or cast `::int`.

---

## 13. Errors

| Situation | Raw `pg` | ORM 8 |
|-----------|----------|-------|
| Unique violation | `err.code === "23505"` | `err.sqlState === "23505"` |
| No rows | you check `rows.length` | `RUNTIME.NO_ROWS` from `firstOrThrow()` |
| Structured codes | — | `isStructuredError(e)` → `e.code` (`ORM.*`, `RUNTIME.*`) |
| Serialization / deadlock | `"40001"` / `"40P01"` | same `sqlState`, or `RUNTIME.TRANSACTION_COMMIT_FAILED` |

```ts
import { isStructuredError } from "@prisma/orm-postgres/utils/structured-error";

try {
  await db.orm.public.User.create({ email, displayName, passwordHash });
} catch (error) {
  if (error instanceof Error && "sqlState" in error && error.sqlState === "23505") {
    throw new HttpError(409, "email already exists");
  }
  if (isStructuredError(error) && error.code === "RUNTIME.NO_ROWS") {
    throw new HttpError(404, "not found");
  }
  throw error;
}
```

> The ORM 7 `P2002` / `P2025` codes are gone in ORM 8.

---

## 14. Migrations

```sql
-- Week 9: you write and order these yourself
ALTER TABLE tasks ADD COLUMN due_date timestamptz;
CREATE INDEX tasks_owner_status_idx ON tasks (owner_id, status);
```
```prisma
// Week 10: change the contract, then plan + migrate
model Task {
  // ...
  dueDate DateTime? @map("due_date")
  @@index([ownerId, status])
}
```
```bash
npx prisma contract emit
npx prisma migration plan --name add_due_date
npx prisma migration show migrations/app/20260707T1005_add_due_date
npx prisma db migrate --advance-ref db
```

> The ORM generates a `migration.ts` (not `.sql`) you review and commit. Renames are planned as drop+add — keep data with `@map` or a `rawSql` `ALTER TABLE ... RENAME`.

---

## 15. When to Use Which

| Use raw SQL (`pg` / `db.raw.sql`) | Use the ORM (`db.orm`) |
|---|---|
| Window functions, recursive CTEs | Everyday CRUD |
| Complex reports / full-text search | Relations, nested reads |
| Bulk data loads / `COPY` | Validation-shaped writes + type safety |
| DB-specific features (`EXPLAIN`, `LISTEN`) | Migrations and schema evolution |
| Hot paths where you must tune the exact SQL | Application code that changes often |

**Rule of thumb:** use the ORM for ~95% of your data access; drop to `db.raw.sql` for the queries the builder cannot express — but keep both in a **repository layer**, never in controllers.

---

## 16. Cheat Sheet: ORM 7 → ORM 8 (what tutorials still show)

| Task | ORM 7 (old tutorials) | ORM 8 (this week) |
|---|---|---|
| client | `new PrismaClient()` | `db` from `src/prisma/db.ts` |
| read many | `prisma.user.findMany({ where })` | `db.orm.public.User.where(...).all()` |
| read one | `findUnique` / `findFirst` | `.first(...)` |
| one-or-throw | `findUniqueOrThrow` | `.all().firstOrThrow()` |
| select | `select: {...}` | `.select(...)` |
| include | `include: { rel: true }` | `.include("rel")` |
| create | `create({ data })` | `.create({ ... })` (no `data`) |
| bulk create | `createMany({ skipDuplicates })` | `.createAll([...], { onConflict: "skip" })` |
| update many | `updateMany({ data })` | `.where(...).updateAll({ ... })` |
| upsert | `upsert({ where })` | `.upsert({ create, update, conflictOn })` |
| count | `count()` | `.aggregate((a) => ({ n: a.count() }))` |
| group by | `groupBy` | `.groupBy(...).aggregate(...)` |
| transaction | `$transaction` / `$transaction([...])` | `db.transaction(async (tx) => ...)` |
| raw | `$queryRaw` / `$executeRaw` | `db.raw.sql\`...\`` + `db.runtime().query/execute` |
| migration | `prisma migrate dev` | `contract emit` + `migration plan` + `db migrate` |
| seed | `prisma db seed` | `npx tsx src/prisma/seed.ts` |

---

**Sources:** [Reading data](https://www.prisma.io/docs/orm/fundamentals/reading-data) · [Writing data](https://www.prisma.io/docs/orm/fundamentals/writing-data) · [Relations and joins](https://www.prisma.io/docs/orm/fundamentals/relations-and-joins) · [Transactions](https://www.prisma.io/docs/orm/fundamentals/transactions) · [Raw queries](https://www.prisma.io/docs/orm/reference/raw-queries) · [Coming from ORM 7](https://www.prisma.io/docs/orm/coming-from-prisma-orm-7)
