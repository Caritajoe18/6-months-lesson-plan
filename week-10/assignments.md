# Week 10 — Assignments: ORMs & Migrations (Prisma ORM 8)

> All submissions must pass `npx tsc --noEmit` with `strict: true` and **zero `any`**.
> Prisma emits types from the contract, so strictness comes almost for free — you still must type raw-query rows.
> Node.js **22.18+ / 24.11+ / 26+** required.

```bash
npm install --save-dev prisma typescript tsx @types/node bcryptjs @types/bcryptjs
npm install @prisma/orm-postgres
npx prisma orm init --write-env
```

---

## Assignment 1: Define a Relational Schema (users, projects, tasks, tags)

**Objective:** Model a small project-management domain in `contract.prisma`, applying 1:1, 1:N, and N:M (all in **ORM 8** syntax).

### Required models & relations

```text
User    1:N  Project        (a user owns many projects)
Project 1:N  Task           (a project has many tasks)
User    1:N  Task           (a task is assigned to a user — the assignee)
User    1:1  Profile        (optional profile)
Task    N:M  Tag            (EXPLICIT join model TaskTag with addedAt)
```

### Required pieces

```prisma
// use prisma-8

model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  name         String
  passwordHash String   @map("password_hash")
  role         Role     @default(USER)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    temporal.updatedAt() @map("updated_at")

  profile  Profile?
  projects Project[] @relation("OwnedProjects")
  tasks    Task[]    @relation("AssignedTasks")

  @@map("users")
}
```

Also required:

- `Project.owner` → `User` (`onDelete: Cascade`), with `@@index([ownerId])`
- `Task` has **two** relations to `User` (owner via `Project`? no — assignee) — model `owner` and `assignee` with **relation names**, and justify the `onDelete` on each
- `Task.assignee` is optional (`Int?` + `User?`), `onDelete: SetNull`
- `Profile.userId Int @unique` (that `@unique` makes it 1:1)
- `Tag { id, label @unique }`; `TaskTag` with composite `@@id([taskId, tagId])` and `addedAt DateTime @default(now())`
- Enums stored as text with `@@type("pg/text@1")`: `Role`, `Status`, `Priority`
- `@@map` / `@map` so the DB uses snake_case; a composite `@@index([projectId, status])`

### Deliverables

- `src/prisma/contract.prisma` + the generated `migrations/**`
- A text diagram of the relations
- `npx prisma contract emit` passing, then `npx prisma migration plan` + `npx prisma db migrate`

### Grading

| Criteria | Points |
|----------|--------|
| All relations correct (1:1, 1:N, named double relation, explicit N:M) | 40% |
| Constraints, defaults, indexes, `onDelete` choices | 25% |
| ORM 8 syntax (`// use prisma-8`, `temporal.updatedAt()`, enum `@@type`, `@@map`) | 20% |
| Clean migration applied | 15% |

---

## Assignment 2: Complex Queries (nested include, aggregates, pagination)

**Objective:** Query the schema from Assignment 1 with typed ORM 8 calls (in repositories/services, not controllers).

### Implement

```text
1.  List projects for a user with a task count          include("tasks", t => t.count())
2.  Get a project with its tasks and each task's tags    nested include("tasks", t => t.include("tags"))
3.  List tasks assigned to a user, filter by status, newest first
4.  Case-insensitive title search                        .where(t => t.title.ilike("%sql%"))
5.  Tasks that have at least one tag from a list         .where(t => t.tags.some(tag => tag.label.in([...])))
6.  Users who have NO assigned tasks                     .where(u => u.tasks.none())
7.  Offset-paginate tasks per project (page, limit) + total via aggregate()
8.  Cursor-paginate tasks by id; return nextCursor
9.  groupBy tasks by status with counts
10. Aggregate: total tasks + newest createdAt
```

### Deliverables

- `src/repositories/*.ts`, one exported function per item
- Each function typed; raw rows must use `.returnsRow(...)` with explicit type ids
- A script or tests that call each and print results
- `npx tsc --noEmit` clean

### Grading

| Criteria | Points |
|----------|--------|
| Correct nested `include` / refinements (no N+1 loops) | 25% |
| Relation filters (`some`/`every`/`none`) correct | 20% |
| Offset **and** cursor pagination (with total / nextCursor) | 20% |
| Aggregates (`aggregate`, `groupBy`, `include` refinement count) | 20% |
| Typed, no `any` | 15% |

---

## Assignment 3: Migrations + Seed Script

**Objective:** Show controlled schema evolution and reproducible seed data in ORM 8.

### Part A — Migrations

```text
1. Start with users + projects + tasks                              → plan --name init ; db migrate --advance-ref db
2. Add `dueDate DateTime?` to Task                                 → plan --name add_task_due_date ; db migrate
3. Rename the Prisma field `name` → `fullName` WITHOUT changing the DB column
   (use @map("name")) so no data is lost
4. Add the Tag N:M + explicit TaskTag                              → plan --name add_tags ; db migrate
5. Add a composite index [projectId, status]                       → plan --name task_index ; db migrate
6. Show `npx prisma migration check` and `npx prisma db verify` clean
```

Deliver the full `migrations/` folder plus a short log explaining each step, **including one deliberate case of drift** and how you recovered (`db update` or `db sign`).

### Part B — Seed script

```text
- Idempotent (upsert with conflictOn, { onConflict: "skip" } for bulk) so it can run repeatedly
- 3 users (2 USER, 1 ADMIN) with bcrypt-hashed passwords
- 2 projects per user
- 8 tasks spread across projects/assignees/statuses
- 5 tags, some attached to tasks
- run with `npx tsx src/prisma/seed.ts`
```

Prove it:

```bash
# reset: drop + recreate the DB, then:
npx prisma db init
npx tsx src/prisma/seed.ts
npx tsx src/prisma/seed.ts   # second run must not error or duplicate
```

### Grading

| Criteria | Points |
|----------|--------|
| Migration history clean, readable, committed (incl. `refs/db.json`) | 35% |
| Rename handled without data loss (`@map`) | 15% |
| Seed idempotent and complete | 30% |
| Drift scenario documented + resolved | 20% |

---

## Overall Week 10 Grading

| Assignment | Weight |
|------------|--------|
| 1. Relational schema | 30% |
| 2. Complex queries | 35% |
| 3. Migrations + seed | 35% |

## Tips

1. `contract emit` after **every** contract change — stale types cause confusing errors.
2. Relation names are needed when two models relate more than once (User↔Task).
3. Prefer `.select(...)` for API responses; never return `passwordHash`.
4. `include` beats querying inside a loop (avoid N+1).
5. `count`/`sum`/`avg`/`min`/`max`/`combine` only work **inside** an `include` callback.
6. No `increment`/`decrement` — read-modify-write inside `db.transaction(...)`, or raw SQL.
7. `COUNT(*)` is `bigint` in raw queries; declare `pg/int8@1` or cast `::int`.
8. Inside `db.transaction(async tx => ...)` use `tx`, never `db`.
9. `upsert` uses `conflictOn` (a unique column), not `where`.
10. Commit `contract.prisma`, `contract.json`, `contract.d.ts`, and `migrations/`; ignore `.env`, `node_modules`.
