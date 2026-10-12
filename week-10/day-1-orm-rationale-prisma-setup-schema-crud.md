# Day 1 — ORM Rationale, Prisma ORM 8 Setup, the Contract & CRUD

**Next:** [Day 2 — Relations, Nested Queries, Filtering & Pagination](day-2-relations-nested-queries-filtering-pagination.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Explain what an ORM buys you (and what it costs) versus raw `pg`
- Set up **Prisma ORM 8**: install the packages, run `orm init`, and read `prisma.config.ts` and `src/prisma/db.ts`
- Model a table in `contract.prisma` and understand ORM 8's field types
- Emit types with `prisma contract emit` and query through `db.orm.public.Model`
- Write typed **CRUD** (create, read, update, delete, upsert) and the bulk variants
- Map database errors (`23505`, structured `code`s) to clean API responses
- Keep data access in a **repository layer**

> **Which Prisma?** This lesson targets **Prisma ORM 8**. If you have used Prisma before and remember `new PrismaClient()`, `prisma.user.findMany({ where })`, or `$transaction`, those are **Prisma ORM 7** APIs. ORM 8 renamed the schema file to the *contract* and uses a chained query API. See [Coming from Prisma ORM 7](https://www.prisma.io/docs/orm/coming-from-prisma-orm-7).

---

## 1. Why an ORM? (and the cost)

You already wrote SQL by hand in Week 9. An ORM sits between your code and the driver:

```text
Route → Controller → Service → Repository → PRISMA → pg → PostgreSQL
                                            `--- typed, generated from contract
```

**What you gain**

| Benefit | Detail |
|---------|--------|
| Type safety | `db.orm.public.User.all()` returns `User[]`, generated from your schema |
| Less boilerplate | No manual row→object mapping for the common cases |
| Composable queries | `where`/`orderBy`/`limit`/`include` chain, parameterized for you |
| Migrations | Schema changes are versioned files you review and commit |
| Refactor safety | Rename a field and TypeScript flags every use |

**What it costs**

| Cost | Detail |
|------|--------|
| Abstraction | The generated SQL is not always obvious (`EXPLAIN` is your friend) |
| Limits | Some queries have no ORM form → you drop to raw SQL |
| N+1 traps | Easy to write a loop that queries per row |
| Lock-in | Schema, client, and migrations are Prisma-shaped |

Return on investment: use the ORM for **95%** of CRUD and relations; drop to **raw SQL** for window functions, bulk reports, and things the query builder can't express.

---

## 2. Installing Prisma ORM 8

Prisma ORM 8 has **two packages**: the CLI (`prisma`, dev) and the PostgreSQL runtime (`@prisma/orm-postgres`, prod). There is **no `@prisma/client`**.

```bash
# Node 22.18+, 24.11+, or 26+ required (Node 24 recommended)
npm install --save-dev prisma typescript tsx @types/node
npm install @prisma/orm-postgres
```

Now scaffold. `orm init` writes four things:

```bash
npx prisma orm init --write-env
```

```text
prisma.config.ts            # replaces the old generator + datasource blocks
src/prisma/contract.prisma  # your models (was schema.prisma)
src/prisma/db.ts            # the client you import as `db`
.env                        # DATABASE_URL
```

Files you commit: `contract.prisma`, `contract.json`, `contract.d.ts`, and `migrations/`. Files you ignore: `node_modules`, `.env`.

### `prisma.config.ts`

```ts
// prisma.config.ts
import "dotenv/config";
import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",
    db: {
      connection: process.env.DATABASE_URL!,
    },
  }),
});
```

Importing `defineConfig` from `@prisma/orm-postgres/config` is what selects PostgreSQL. There is no `provider` field.

### `src/prisma/db.ts` (written for you; it is your code)

```ts
// src/prisma/db.ts
import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

export const db = postgres<Contract>({
  contractJson,
  url: process.env.DATABASE_URL!,
});
```

> If your Node build lacks `Temporal` (Node 22/24, or a Homebrew Node 26), add `import "temporal-polyfill/full/global";` at the top of this file. `DateTime` values come back as `Temporal.Instant`.

`db` has four parts:

| Part | What it is |
|------|-----------|
| `db.orm` | Your models, by model name, grouped by schema: `db.orm.public.User` |
| `db.sql` | The typed SQL query builder |
| `db.raw` | Raw SQL (`db.raw.sql`) |
| `db.transaction` | Run several queries atomically (Day 3) |

---

## 3. The Contract — `src/prisma/contract.prisma`

Every ORM 8 contract file **must start with `// use prisma-8`**. Files without it are skipped silently.

```prisma
// use prisma-8

model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  displayName  String   @map("display_name")
  passwordHash String   @map("password_hash")
  role         Role     @default(USER)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    temporal.updatedAt() @map("updated_at")

  @@map("users")
}

enum Role {
  @@type("pg/text@1")
  ADMIN
  USER
}
```

### Field types in ORM 8

The database type **is** the field type. The old `@db.` attributes are gone.

| ORM 7 | ORM 8 | Notes |
|-------|-------|-------|
| `String` | `String` | stored as `text` |
| `String @db.VarChar(255)` | `VarChar(255)` | attribute becomes the type |
| `Decimal @db.Decimal(10,2)` | `Numeric(10, 2)` | `Decimal` alone = unbounded `numeric` |
| `String @db.Uuid` | `Uuid` | |
| `Json` | `Jsonb` | ORM 7's `Json` was `jsonb`; ORM 8's `Json` is the older `json` type |
| `DateTime @updatedAt` | `temporal.updatedAt()` | sets on create **and** update |
| `DateTime @default(now())` | same, or `temporal.createdAt()` | `temporal.*` uses your app clock, no DB default |
| `String @default(cuid())` | `@default(cuid(2))` | version is required |
| `@default(dbgenerated("..."))` | ``@default(sql`...`)`` | keep `now()`/`autoincrement()` as plain functions |

`Int`, `Boolean`, `Float`, `BigInt`, `Bytes`, `String[]`, `@id`, `@unique`, `@default`, `@relation`, `@map`, `@@map`, `@@index`, `@@id`, `@@unique` are unchanged from ORM 7.

### Enums

- A plain `enum` is stored as a **text** column. Give it `@@type("pg/text@1")`.
- A `native_enum` keeps a **PostgreSQL enum type** (created with `CREATE TYPE`), and a field uses it as `pg.enum(Role)`. Use this only for a DB that already has the type.

```prisma
enum Priority {
  @@type("pg/text@1")
  LOW
  HIGH
}
```

### Emitting types

After **every** contract change:

```bash
npx prisma contract emit
```

This writes `contract.json` (read at runtime) and `contract.d.ts` (read by TypeScript) next to the contract. Commit both. (`contract emit` replaces `prisma generate`.)

---

## 4. Reading Data

A query is a **chain** you `await`; the last call says what you want back. On PostgreSQL the path is `db.orm.<schema>.<Model>` — the schema is `public` unless you use a `namespace` block.

```ts
import { db } from "../db/prisma.js"; // your re-export wrapper

// all rows
const users = await db.orm.public.User.all();

// one row, or null (findUnique / findFirst both map onto first())
const user = await db.orm.public.User.first({ email: "ada@x.com" });

// chain narrowing methods, then a terminal
const page = await db.orm.public.User
  .where({ role: "ADMIN" })
  .select("id", "email")                       // project fields
  .orderBy((u) => u.createdAt.desc())
  .limit(10)
  .offset(0)
  .all();
```

Terminals and their ORM 7 equivalents:

| ORM 8 | ORM 7 | Returns |
|-------|-------|---------|
| `.all()` | `findMany` | `Row[]` (awaitable, or `for await` to stream) |
| `.first()` | `findUnique` / `findFirst` | `Row \| null` |
| `.all().firstOrThrow()` | `findUniqueOrThrow` | `Row` or throws `RUNTIME.NO_ROWS` |

> `.all()` has **no implicit limit**. Add `.limit(n)` on tables that grow.

---

## 5. Writing Data

There is **no `data:` wrapper** in ORM 8. Pass the row's fields directly.

```ts
// create
const user = await db.orm.public.User.create({
  email: "ada@x.com",
  displayName: "Ada",
  passwordHash: "hash",
  role: "USER",
});

// update one matching row (returns null if none matched)
const updated = await db.orm.public.User
  .where({ id: user.id })
  .update({ displayName: "Ada Lovelace" });

// delete one matching row (returns null if none matched)
const deleted = await db.orm.public.User.where({ id: user.id }).delete();
```

### Upsert

`conflictOn` names the **unique column** that decides insert vs update. The value is required by the type but ignored — only the column name is used.

```ts
const tag = await db.orm.public.Tag.upsert({
  create: { label: "urgent" },
  update: { label: "urgent" },
  conflictOn: { label: "urgent" },
});
```

### Bulk writes

Every write has three forms: one row, all rows, and all rows with a count.

| Form | ORM 7 | Returns |
|------|-------|---------|
| `.create()` | `create` | the row |
| `.createAll([...])` | `createManyAndReturn` | the rows |
| `.createAndCount([...])` | `createMany` | a `number` |
| `.where().update({...})` | `update` | the row |
| `.where().updateAll({...})` | `updateManyAndReturn` | the rows |
| `.where().updateAndCount({...})` | `updateMany` | a `number` |
| `.where().delete()` | `delete` | the row |
| `.where().deleteAll()` | `deleteMany` | the rows |
| `.where().deleteAndCount()` | `deleteMany` | a `number` |

```ts
// skip rows that break a unique constraint (replaces skipDuplicates: true)
const inserted = await db.orm.public.User.createAll(
  [{ email: "a@x.com", displayName: "A", passwordHash: "h" },
   { email: "b@x.com", displayName: "B", passwordHash: "h" }],
  { onConflict: "skip", conflictOn: ["email"] }
);
// inserted holds only the rows the database actually wrote
```

> `.update()` and `.delete()` change **one** row, even if the filter matches many. Use the `All`/`AndCount` forms when you mean all.

---

## 6. Errors: What the Database Actually Throws

ORM 8 dropped the `P2002`/`P2025` codes. Errors now carry:

- a **dotted structured `code`** on Prisma's own errors (`ORM.*`, `RUNTIME.*`), and
- the **SQL state** in `error.sqlState` for database errors.

Detect a structured error with `isStructuredError` and match on `error.code` — never `instanceof`.

```ts
import { isStructuredError } from "@prisma/orm-postgres/utils/structured-error";

try {
  await db.orm.public.User.create({ email, displayName, passwordHash });
} catch (error) {
  // unique violation
  if (error instanceof Error && "sqlState" in error && error.sqlState === "23505") {
    throw new HttpError(409, "email already exists");
  }
  if (isStructuredError(error) && error.code === "RUNTIME.NO_ROWS") {
    throw new HttpError(404, "not found");
  }
  throw error;
}
```

| Situation | Signal |
|-----------|--------|
| Unique violation | `error.sqlState === "23505"` |
| No row for `firstOrThrow` | `error.code === "RUNTIME.NO_ROWS"` |
| Negated update/delete with no `where` | `ORM.WHERE_MISSING` (Mongo); doesn't compile on PG |
| Bad argument (negative limit, cursor missing a sort key) | `ORM.ARGUMENT_INVALID`, `ORM.CURSOR_VALUE_MISSING` |
| Serialization failure / deadlock | `sqlState` `40001` / `40P01`, or `RUNTIME.TRANSACTION_COMMIT_FAILED` |

---

## 7. A Repository Layer (keep Prisma out of controllers)

```ts
// src/repositories/userRepository.ts
import { db } from "../db/prisma.js";
import type { CreateUserInput } from "../types.js";

export function findUserByEmail(email: string) {
  return db.orm.public.User.first({ email });
}

export function listUsers(limit = 20) {
  return db.orm.public.User
    .select("id", "email", "displayName", "role")
    .orderBy((u) => u.createdAt.desc())
    .limit(limit)
    .all();
}

export function createUser(input: CreateUserInput) {
  return db.orm.public.User.create(input);
}
```

The controller imports these functions; it never imports `db` directly. This keeps queries testable and swappable.

---

## 8. What Not to Do

```text
❌ Reaching for prisma.user.findMany / new PrismaClient() — that's ORM 7
❌ Wrapping create fields in { data: { ... } } — ORM 8 takes fields directly
❌ Forgetting `npx prisma contract emit` after a contract change (stale types)
❌ Querying inside a loop over rows (N+1) — see Day 2
❌ Calling .update()/.delete() expecting every match to change
❌ Matching on error instanceof PrismaClientKnownRequestError — use code / sqlState
❌ Committing .env, or ignoring contract.json / contract.d.ts / migrations/
```

---

## Exercises

1. Install ORM 8, run `orm init`, and read all four generated files.
2. Confirm `node -p "typeof Temporal"`; add the polyfill if it prints `undefined`.
3. Add a `Tag` model (unique `label`) to `contract.prisma`, run `contract emit`, and `db update`.
4. Create 3 users, list them with `.select(...)`, fetch one by email with `.first()`.
5. Update one user's name; delete a tag; upsert a tag that already exists.
6. Use `createAll([...], { onConflict: "skip", conflictOn: ["email"] })` to add 3 users where 1 is a duplicate.
7. Trigger a unique violation and map `sqlState === "23505"` to a 409.
8. Write a `userRepository` with `findByEmail`, `list`, `create`.

---

## Key Takeaways

- ORM buys type safety, less boilerplate, migrations; it costs abstraction and lock-in
- ORM 8 packages: `prisma` (CLI, dev) + `@prisma/orm-postgres` (runtime). No `@prisma/client`
- `contract.prisma` starts with `// use prisma-8`; `contract emit` writes `contract.json` + `contract.d.ts`
- Query path is `db.orm.public.Model`; the last call in the chain runs the query
- No `data:` wrapper; bulk writes come in row / all / count forms
- `.update()`/`.delete()` affect one row; use `All`/`AndCount` for many
- `upsert` uses `conflictOn` (a unique column), not `where`
- DB errors surface via `error.sqlState` (`23505`) and structured dotted `code`s
- Wrap `db` in repositories; keep controllers ORM-agnostic

**Sources:** [Reading data](https://www.prisma.io/docs/orm/fundamentals/reading-data) · [Writing data](https://www.prisma.io/docs/orm/fundamentals/writing-data) · [Coming from ORM 7](https://www.prisma.io/docs/orm/coming-from-prisma-orm-7) · [Error reference](https://www.prisma.io/docs/orm/reference/error-reference)

**Next:** [Day 2 — Relations, Nested Queries, Filtering & Pagination](day-2-relations-nested-queries-filtering-pagination.md)
