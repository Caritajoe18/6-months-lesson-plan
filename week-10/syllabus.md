# Week 10 — ORMs & Migrations (Prisma ORM 8)

## Overview

Week 9 taught you raw SQL and `pg`. Week 10 introduces **Prisma**, a type-safe ORM for Node/TypeScript: you model data in a **contract** (`contract.prisma`), emit a fully typed client, evolve the database with **migrations**, and seed it — while keeping a first-class **raw SQL** escape hatch for the queries an ORM can't express.

> Everything is TypeScript with `strict: true` and zero `any`. Prisma emits real types from your contract, so this is the easiest week to stay strict.

> **Version note.** In 2026 Prisma ships **Prisma ORM 8** as the current release (a release candidate), and Prisma ORM 7 is still fully supported. ORM 8 renamed the schema file to the **contract** and replaced `schema.prisma` + `PrismaClient` + `$transaction` + `$queryRaw` with new APIs. This week targets **Prisma ORM 8**. If your team is on ORM 7, the API you'll see in older tutorials (`prisma.user.findMany`, `new PrismaClient()`, `$transaction`) is documented at [prisma.io/docs/orm/v7](https://www.prisma.io/docs/orm/v7). The [ORM 7 → 8 mapping table](https://www.prisma.io/docs/orm/coming-from-prisma-orm-7) translates every call.

## Prerequisites

- Week 9 (SQL, `SELECT/JOIN/GROUP BY`, indexes, transactions, ACID)
- A running PostgreSQL server (see [Week 9 installation](../week-9/installation.md))
- **Node.js 22.18+**, **24.11+**, or **26+** (Prisma ORM 8 requires this; Node 24 recommended). `DateTime` fields come back as `Temporal.Instant`; Node 26 has `Temporal` built in, and on 22/24 you add `temporal-polyfill`.
- Comfort with `async/await`, Express controllers, repository pattern

## Files

| File | Topic | Type |
|------|-------|------|
| [Day 1](day-1-orm-rationale-prisma-setup-schema-crud.md) | ORM rationale, ORM 8 setup, the `contract.prisma`, emit, CRUD | Theory + code |
| [Day 2](day-2-relations-nested-queries-filtering-pagination.md) | Relations (1:1, 1:N, N:M), nested reads/writes, filtering, pagination, aggregates | Theory + code |
| [Day 3](day-3-migrations-seeding-transactions-raw-queries.md) | Migrations, seeding, transactions, raw-query fallbacks | Hands-on |
| [Assignments](assignments.md) | 3 graded assignments | Practice |
| [Project](project-ecommerce-backend-prisma.md) | E-commerce backend with Prisma ORM 8 | Capstone |

## Tools & Packages

Prisma ORM 8 splits the toolchain in two: the **CLI** (`prisma`, a dev dependency) and the **target runtime package** (`@prisma/orm-postgres`, a runtime dependency). There is **no `@prisma/client`**.

```bash
# Node 22.18+/24.11+/26+ required
npm install --save-dev prisma typescript tsx @types/node
npm install @prisma/orm-postgres

# Scaffold prisma.config.ts, src/prisma/contract.prisma, src/prisma/db.ts, .env
npx prisma orm init --write-env
```

Day-to-day commands (they replace `generate` / `migrate dev`):

```bash
npx prisma contract emit                    # = old `prisma generate` → contract.json + contract.d.ts
npx prisma db init                          # create tables in an empty database
npx prisma db update                        # = old `migrate dev`, applies changes (asks before destructive)
npx prisma migration plan --name <name>     # write a committable migration folder
npx prisma db migrate --advance-ref db      # apply planned migrations
```

Generated and committed: `contract.json`, `contract.d.ts`, and `migrations/`. Ignored: `node_modules`, `.env`.

## Learning Outcomes

By the end of the week you should be able to:

- Explain what an ORM buys you (and what it costs) versus raw SQL
- Model a relational schema in `contract.prisma`
- Create the client in `src/prisma/db.ts` and query through `db.orm.public.Model`
- Use typed CRUD (`.create`, `.all`, `.first`, `.update`, `.delete`, `.upsert`)
- Model 1:1, 1:N, and N:M relations and write nested reads/writes
- Filter (callback operators + `and`/`or`/`not`), sort, and paginate (`limit`/`offset` and `cursor`)
- Aggregate with `aggregate()`, `groupBy()`, `having()`, and `include()` refinements
- Manage schema changes with `contract emit` + `migration plan` + `db migrate`
- Write a typed seed script (ORM 8 has no `db seed` command)
- Use `db.transaction()` for multi-step writes
- Drop to `db.raw.sql` (parameterized) when SQL is the right tool

## Suggested Rhythm

```text
Mon Day 1 — ORM concepts, ORM 8 setup, the contract, CRUD
Tue Day 2 — relations, nested reads/writes, filtering, pagination, aggregates
Wed Day 3 — migrations, seeding, transactions, raw SQL
Thu–Fri   — assignments 1–3 + E-commerce project
```

## Grading

| Deliverable | Weight |
|-------------|--------|
| Assignments (3) | 40% |
| Project: E-commerce backend (Prisma ORM 8) | 60% |

## Ground Rules

- Keep **raw SQL out of controllers** — use the client or a repository layer
- `DATABASE_URL` lives in `.env` (never committed); commit `contract.prisma`, `contract.json`, `contract.d.ts`, and `migrations/`
- Never run `db update` against production — use `db migrate`
- Prefer the typed client; reach for `db.raw.sql` only for real SQL needs (this is a teaching point, not a failure)
- Because ORM 8 is a release candidate, **pin versions** in `package.json` and read the [release status page](https://www.prisma.io/docs/orm/release-status) before a major project

## Sources

- [Prisma ORM docs](https://www.prisma.io/docs) (all lessons link the exact page)
- [Coming from Prisma ORM 7](https://www.prisma.io/docs/orm/coming-from-prisma-orm-7)
- [Reading data](https://www.prisma.io/docs/orm/fundamentals/reading-data) · [Writing data](https://www.prisma.io/docs/orm/fundamentals/writing-data) · [Relations and joins](https://www.prisma.io/docs/orm/fundamentals/relations-and-joins) · [Transactions](https://www.prisma.io/docs/orm/fundamentals/transactions)
- [Generating a migration](https://www.prisma.io/docs/orm/migrations/generating-a-migration) · [Raw queries](https://www.prisma.io/docs/orm/reference/raw-queries) · [Error reference](https://www.prisma.io/docs/orm/reference/error-reference)
