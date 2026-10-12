# Week 9 — SQL & PostgreSQL

## Overview

This week bridges the Task Manager API built in Week 8 with **real relational persistence**. We move from JSON-file `data/db.json` to **PostgreSQL**, learn relational theory, write solid SQL, and connect Node/Express to Postgres the safe way.

## Prerequisites

- Week 8 (JWT auth, RBAC, secure Express app)
- Familiarity with TypeScript, Express routing, controllers & stores
- `psql` / `pgAdmin` or `psql` CLI

> ⚠️ **New to PostgreSQL?** Complete the [Installation Guide](installation.md) first — it covers macOS/Windows/Linux, verification, GUI clients, and connecting from Node.

## Files

| File | Topic | Type |
|------|-------|------|
| [Installation Guide](installation.md) | **Start here** — install PostgreSQL, `psql`, GUI client, connect from Node | Setup |
| [Day 1](day-1-relational-sql-select-where-join-groupby.md) | Relational concepts, tables/keys, `SELECT/WHERE/JOIN/GROUP BY` | Theory + hands-on |
| [Day 2](day-2-advanced-sql-ctes-indexes-transactions-acid.md) | Subqueries, CTEs, `EXPLAIN`, indexes, transactions, ACID | Theory + hands-on |
| [Day 3](day-3-node-pg-connection-pooling-parameterized.md) | `pg` driver, `Pool`, parameterized queries (`$1,$2`), safe DB access | Hands-on |
| [Assignments](assignments.md) | 3 practice assignments | Practice |
| [Project](project-migrate-task-manager-to-postgres.md) | Migrate Task Manager from in-memory to PostgreSQL | Capstone |

## Tools

- [PostgreSQL](https://www.postgresql.org/) (local install)
- [`psql`](https://www.postgresql.org/docs/current/app-psql.html)
- Node `pg` package: `npm i pg`
- Types: `npm i -D @types/pg`

```bash
npm install pg
npm install -D typescript tsx @types/node @types/express @types/pg
```

## Learning Outcomes

- Explain relational concepts: tables, relations (1:N), PK/FK, constraints
- Write queries: `SELECT`, `WHERE`, `JOIN` (INNER/LEFT), `GROUP BY`, `HAVING`
- Use subqueries, Common Table Expressions (CTEs), and window functions basics
- Read and reason about `EXPLAIN (ANALYZE)` to detect missing indexes
- Explain ACID and use transactions (`BEGIN/COMMIT/ROLLBACK`)
- Connect Express to PostgreSQL via `pg.Pool` with connection pooling
- Use **parameterized queries** (`$1,$2`) to prevent SQL injection
- Design a schema for Users/Tasks with proper constraints & FKs
- Write simple SQL migrations (schema + seed) and swap an existing "store" layer to SQL

## Suggested Rhythm

```text
Mon Day 1 — relational + core SQL
Tue Day 2 — advanced SQL + transactions + ACID
Wed Day 3 — Node + pg + pooling
Thu–Fri  — assignments 1–3 + project migration
```

## Grading

| Deliverable | Weight |
|-------------|--------|
| Assignments (3) | 40% |
| Project: Task Manager → PostgreSQL | 60% |

## Safety Notes

- **Never interpolate strings** into SQL. Always use parameterized queries (`$1,$2,...`)
- Keep DB credentials in `.env` (`DATABASE_URL` or host/user/password)
- Use transactions when you do 2+ writes that must all succeed or all fail
- Don't put raw SQL in controllers — put it in a `db/` data-access layer (repository pattern), mirroring the Week 7–8 `store` design
- Enable `strict: true` and keep all DB rows mapped to typed interfaces