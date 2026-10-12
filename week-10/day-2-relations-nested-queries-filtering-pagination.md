# Day 2 — Relations, Nested Queries, Filtering, Pagination & Aggregates

**Previous:** [Day 1 — ORM Rationale, Setup, the Contract & CRUD](day-1-orm-rationale-prisma-setup-schema-crud.md)
**Next:** [Day 3 — Migrations, Seeding, Transactions & Raw Queries](day-3-migrations-seeding-transactions-raw-queries.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Model **1:1**, **1:N**, and **N:M** relations in `contract.prisma`
- Perform **nested writes** the ORM 8 way (`create`, `connect`, `disconnect`)
- Read relations with **`include(relation, refineFn?)`**
- Filter with equality, **callback operators**, `and`/`or`/`not`, and **relation filters** (`some`/`every`/`none`)
- Sort and **paginate** with `limit`/`offset` and **cursor** pagination
- Aggregate with **`aggregate()`**, **`groupBy()`/`having()`**, and **`include()` refinements**

> Reminder: this is Prisma **ORM 8**. `findMany({ include: { posts: true } })` is ORM 7. Here it is `.include("posts")`.

---

## 1. Relation Kinds at a Glance

```text
1:1  User ── Profile          (one profile per user)
1:N  User ──< Task            (one user, many tasks)
N:M  Task >──< Tag            (many tasks, many tags)
```

Relations are declared on **both** models. The side that holds the foreign key uses `@relation(fields:, references:)`.

---

## 2. One-to-Many (1:N) — User → Task

```prisma
// use prisma-8

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  tasks Task[]                       // mirror field: stores nothing in the DB
}

model Task {
  id      Int    @id @default(autoincrement())
  title   String
  ownerId Int    @map("owner_id")
  owner   User   @relation(fields: [ownerId], references: [id], onDelete: Cascade)
}
```

- `Task.ownerId` is the real column (the foreign key). `Task.owner` and `User.tasks` are **virtual** relation fields.
- `onDelete` becomes the SQL `ON DELETE` clause. Options: `Cascade`, `Restrict`, `SetNull`, `SetDefault`, `NoAction`.
- The mirror field has no `@relation` of its own.

> In ORM 8 the relation field and its foreign-key columns must agree on optionality: `owner User?` pairs with `ownerId Int?`. A mismatch is rejected by `contract emit` (`PSL_RELATION_NULLABILITY_MISMATCH`).

---

## 3. One-to-One (1:1) — User → Profile

```prisma
model User {
  id      Int      @id @default(autoincrement())
  email   String   @unique
  profile Profile?                // optional mirror; no @relation needed
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String?
  userId Int    @unique @map("user_id")   // ← UNIQUE turns 1:N into 1:1
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

The `@unique` on the foreign key is what makes it one-to-one. Put the foreign key on the **dependent** side (the record that can't exist on its own).

---

## 4. Many-to-Many (N:M) — Task ↔ Tag

**ORM 8 requires an explicit join model.** Implicit many-to-many (just two list fields) was removed; `contract emit` rejects it.

```prisma
model Task {
  id       Int       @id @default(autoincrement())
  title    String
  tags     Tag[]                 // list field on each side
  taskTags TaskTag[]             // optional: reach the join rows
}

model Tag {
  id       Int       @id @default(autoincrement())
  label    String    @unique
  tasks    Task[]
  taskTags TaskTag[]
}

model TaskTag {
  taskId   Int
  tagId    Int
  task     Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  tag      Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)
  addedAt  DateTime @default(now()) @map("added_at")   // the pairing can carry data

  @@id([taskId, tagId])          // primary key = the two foreign keys
  @@map("task_tags")
}
```

Facts:

- `Task.tags` is typed `Tag[]` (the **other model**, not the join model). `include("tags")` returns tags, not link rows.
- The join model's primary key must be exactly the two foreign keys.
- Because it's a real model, the join row can hold extra columns (`addedAt`).

---

## 5. Two Relations Between the Same Models

If `User` relates to `Task` twice (owner and assignee), **name** both relations:

```prisma
model Task {
  id         Int   @id @default(autoincrement())
  ownerId    Int   @map("owner_id")
  owner      User  @relation("OwnedTasks", fields: [ownerId], references: [id], onDelete: Cascade)
  assigneeId Int?  @map("assignee_id")
  assignee   User? @relation("AssignedTasks", fields: [assigneeId], references: [id], onDelete: SetNull)
}

model User {
  id        Int    @id @default(autoincrement())
  owned     Task[] @relation("OwnedTasks")
  assigned  Task[] @relation("AssignedTasks")
}
```

---

## 6. Nested Writes (ORM 8: create / connect / disconnect only)

In ORM 8 the nested write API narrowed. `connectOrCreate`, `set`, nested `update`, nested `upsert`, and nested `delete` are **gone**. You get three callbacks:

```ts
// create: insert the parent and its children in one call
const user = await db.orm.public.User.create({
  email: "ada@x.com",
  displayName: "Ada",
  passwordHash: "hash",
  tasks: (tasks) =>
    tasks.create([
      { title: "First task", status: "TODO" },
      { title: "Second task", status: "IN_PROGRESS" },
    ]),
});
```

```ts
// connect: link to existing rows (works on create and update)
const task = await db.orm.public.Task.create({
  title: "With existing tag",
  owner: (owner) => owner.connect({ id: 1 }),
  tags: (tags) => tags.connect([{ id: 3 }]),
});
```

```ts
// disconnect: unlink (update only). On a many-to-many, pass an array.
await db.orm.public.Task.where({ id: task.id }).update({
  tags: (tags) => tags.disconnect([{ id: 3 }]),
});
// on a to-one relation, disconnect takes an array too
await db.orm.public.Task.where({ id: task.id }).update({
  owner: (owner) => owner.disconnect([{ id: 1 }]),
});
```

> **connectOrCreate replacement.** There is no nested upsert. Upsert the related row first, then `connect`:

```ts
const tag = await db.orm.public.Tag.upsert({
  create: { label: "urgent" },
  update: {},
  conflictOn: { label: "urgent" },
});
await db.orm.public.Task.where({ id: task.id }).update({
  tags: (tags) => tags.connect([{ id: tag.id }]),
});
```

> Nested writes run in a single transaction automatically. For anything beyond create/connect/disconnect, do it yourself inside `db.transaction(...)` (Day 3).

---

## 7. Nested Reads — `include(relation, refineFn?)`

```ts
// to-many: users with all their tasks
const users = await db.orm.public.User.include("tasks").all();

// to-one: tasks with their owner
const tasks = await db.orm.public.Task.include("owner").all();

// two levels deep
const usersDeep = await db.orm.public.User
  .include("tasks", (tasks) => tasks.include("tags"))
  .all();

// refine: filter, order, limit the related rows (PostgreSQL only)
const usersRecent = await db.orm.public.User
  .include("tasks", (tasks) =>
    tasks
      .where((t) => t.status.neq("DONE"))
      .orderBy((t) => t.createdAt.desc())
      .limit(5),
  )
  .all();
```

The refine callback receives the related rows as a collection, so it takes the same methods as a top-level query — **and** it can also aggregate (section 10).

> Watch the **N+1** trap: never fetch parents, then query children inside a `for` loop. One `.include("tasks")` is a single query.

---

## 8. Filtering

### Equality (object form)

```ts
const todos = await db.orm.public.Task.where({ status: "TODO" }).all();
```

### Callback form with operators (PostgreSQL)

```ts
const searching = await db.orm.public.Task
  .where((t) => t.title.ilike("%sql%"))       // case-insensitive
  .all();
```

Available operators:

| Operator | Meaning |
|----------|---------|
| `eq` / `neq` | equality / inequality |
| `gt` / `gte` / `lt` / `lte` | ordered comparisons |
| `like` / `ilike` | `LIKE` / case-insensitive `LIKE` (write `%` yourself) |
| `in` / `notIn` | membership / exclusion |
| `isNull` / `isNotNull` | NULL checks |

> `.like("%sql%")` replaces ORM 7's `contains`; `.ilike("%sql%")` replaces `mode: "insensitive"`.

### Combining conditions

Chaining `.where(...)` **AND**s. For OR / NOT / AND groups, import the helpers:

```ts
import { and, or, not } from "@prisma/orm-postgres/orm-client";

const either = await db.orm.public.Task
  .where((t) => or(t.status.eq("TODO"), t.status.eq("IN_PROGRESS")))
  .all();

const both = await db.orm.public.Task
  .where((t) => and(t.priority.eq("HIGH"), t.status.neq("DONE")))
  .all();

const notDone = await db.orm.public.Task
  .where((t) => not(t.status.eq("DONE")))
  .all();
```

### Relation filters (`some` / `every` / `none`)

```ts
// tasks that have at least one tag named "urgent"
const urgent = await db.orm.public.Task
  .where((t) => t.tags.some((tag) => tag.label.eq("urgent")))
  .all();

// users whose tasks are ALL done (a user with no tasks matches every())
const caughtUp = await db.orm.public.User
  .where((u) => u.tasks.every((t) => t.status.eq("DONE")))
  .all();

// users with no tasks at all
const idle = await db.orm.public.User
  .where((u) => u.tasks.none())
  .all();
```

`some()`/`every()`/`none()` accept either a callback or a plain equality object (`t.tags.some({ label: "urgent" })`).

---

## 9. Sorting & Pagination

### Offset pagination

```ts
const page = 2, limit = 10;
const items = await db.orm.public.Task
  .where({ ownerId: 1 })
  .orderBy((t) => t.createdAt.desc())
  .limit(limit)
  .offset((page - 1) * limit)
  .all();

const total = (await db.orm.public.Task.where({ ownerId: 1 })
  .aggregate((a) => ({ total: a.count() }))).total;
```

### Cursor pagination (scales better)

`cursor()` is PostgreSQL only. It must follow `orderBy(...)`, and the cursor object must name **every** sort column. The cursor row itself is excluded, so pages pick up strictly after it.

```ts
const page1 = await db.orm.public.Task
  .orderBy((t) => t.id.asc())
  .limit(10)
  .all();

const last = page1[page1.length - 1];
const page2 = await db.orm.public.Task
  .orderBy((t) => t.id.asc())
  .cursor({ id: last!.id })
  .limit(10)
  .all();
```

> Sorting by a related field, a count, or with `nulls` makes `cursor()` throw `ORM.ARGUMENT_INVALID` — use `limit`/`offset` there.

---

## 10. Aggregates

### Counting and aggregating a model

`aggregate()` is a terminal (runs the query). Its callback gives you `count()`, `count(field)`, `sum(field)`, `avg(field)`, `min(field)`, `max(field)`, plus `countBigInt()`, `sumBigInt()`, `avgDecimal()`.

```ts
const stats = await db.orm.public.Task
  .where({ ownerId: 1 })
  .aggregate((a) => ({
    total: a.count(),
    withPriority: a.count("priority"),   // counts non-null priority
    newest: a.max("createdAt"),
  }));
// { total: 7, withPriority: 7, newest: Temporal.Instant {...} }
```

### `groupBy` + `having`

`groupBy(...)` returns a **GroupedCollection** — you cannot `await` it. Call `.having(...)`, `.orderBy(...)`, `.limit(...)`, then `.aggregate(...)` last.

```ts
const byStatus = await db.orm.public.Task
  .groupBy("status")
  .aggregate((a) => ({ count: a.count() }));
// [{ status: "TODO", count: 4 }, { status: "DONE", count: 3 }]

const busyOwners = await db.orm.public.Task
  .groupBy("ownerId")
  .having((h) => h.count().gt(5))
  .aggregate((a) => ({ count: a.count() }));
```

### Per-parent aggregates via `include` refinements

Count/sum a relation **inside** the include callback:

```ts
const usersWithCounts = await db.orm.public.User
  .include("tasks", (tasks) => tasks.count())
  .all();
// each user's `tasks` is a number

const withTotals = await db.orm.public.User
  .include("tasks", (tasks) =>
    tasks.combine({
      total: tasks.count(),
      recent: tasks.orderBy((t) => t.createdAt.desc()).limit(3),
    }),
  )
  .all();
// user.tasks = { total: number, recent: Task[] }
```

> `count`/`sum`/`avg`/`min`/`max`/`combine` are only valid **inside** an `include()` callback; calling them elsewhere throws `ORM.INCLUDE_INVALID`.

---

## 11. A Full Service Example

```ts
// src/services/taskService.ts
import { db } from "../db/prisma.js";

export async function listTasks(params: {
  ownerId: number;
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  page: number;
  limit: number;
}) {
  const base = db.orm.public.Task.where((t) =>
    params.status ? t.ownerId.eq(params.ownerId).and(t.status.eq(params.status))
                  : t.ownerId.eq(params.ownerId),
  );

  const items = await base
    .include("tags", (tags) => tags.select("id", "label"))
    .orderBy((t) => t.createdAt.desc())
    .limit(params.limit)
    .offset((params.page - 1) * params.limit)
    .all();

  const total = (await db.orm.public.Task.where({ ownerId: params.ownerId })
    .aggregate((a) => ({ total: a.count() }))).total;

  return { items, total, page: params.page, limit: params.limit };
}
```

---

## 12. What Not to Do

```text
❌ Declaring an implicit N:M (two list fields, no join model) — rejected by emit
❌ Using connectOrCreate / set / nested update|upsert|delete — removed in ORM 8
❌ include: { everything: true } "just in case" — payload bloat
❌ Querying inside a loop over records (N+1) — use include
❌ Calling count()/sum() outside an include callback
❌ await on a GroupedCollection — call .aggregate(...) on it
❌ cursor() without orderBy, or missing a sort column in the cursor object
```

---

## Exercises

1. Add `Profile` (1:1) and the explicit `Tag`/`TaskTag` N:M; run `contract emit` and `db update`.
2. Create a user with two nested tasks (`tasks: (t) => t.create([...])`).
3. Create a task with a `connect`ed tag; then `disconnect` it.
4. List users with tasks included, filtered to non-DONE, newest first, limit 5.
5. Case-insensitive title search; then an `or(...)` for two statuses.
6. Relation filter: tasks with a tag named `"urgent"`; users with `none` tasks.
7. Offset-paginate tasks page 2 (limit 5) and return the total; then do a cursor page.
8. `groupBy("status")` counts; `aggregate` total + newest; and a per-user `include(..., t => t.count())`.

---

## Key Takeaways

- Declare relations on both sides; the FK scalar lives on one side
- `@unique` on the FK makes it 1:1
- N:M needs an explicit join model whose PK is both FKs
- Nested writes are only `create` / `connect` / `disconnect`; use transactions for the rest
- `include(relation, refine?)` loads relations; refine to filter/paginate/aggregate
- Filters: object equality or callback operators; `and`/`or`/`not` from the package; relation filters via `some`/`every`/`none`
- `limit`/`offset` for simple pagination; `cursor` (PG-only) for scale
- `aggregate()` and `groupBy().having().aggregate()` replace `_count`/`aggregate`/`groupBy`
- Per-parent counts use an `include` refinement, not a `_count` select

**Sources:** [Relations and joins](https://www.prisma.io/docs/orm/fundamentals/relations-and-joins) · [Reading data](https://www.prisma.io/docs/orm/fundamentals/reading-data) · [ORM client reference](https://www.prisma.io/docs/orm/reference/orm-client)

**Next:** [Day 3 — Migrations, Seeding, Transactions & Raw Queries](day-3-migrations-seeding-transactions-raw-queries.md)
