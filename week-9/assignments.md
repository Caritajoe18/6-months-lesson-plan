# Week 9 — Assignments: SQL & PostgreSQL

> Every submission must pass `npx tsc --noEmit` with `strict: true` and **zero `any`**.
> Use `pg` (`npm i pg`) for TypeScript submissions. Run queries against a local PostgreSQL database.

```bash
npm install pg
npm install -D typescript tsx @types/node @types/express @types/pg
```

---

## Assignment 1: SQL Exercise Set (joins, aggregates, window functions)

**Objective:** Solidify Day 1–2 SQL by hand in `psql` — no Node yet.

### Setup

Use the Day 1 schema (`users`, `tasks`) and insert enough data to make queries meaningful:

```text
users:  4+ (mix of admin/user)
tasks:  10+ spread across owners, statuses, priorities, timestamps
```

### Questions (12+)

```text
1.  List all users (id, name, email, role) ordered by id
2.  List all tasks with the owner's name (INNER JOIN)
3.  List tasks that have NO matching user (LEFT JOIN where user is NULL)
4.  Count tasks per status (GROUP BY)
5.  Count tasks per user, including users with 0 tasks (LEFT JOIN)
6.  Find users with more than 2 tasks (GROUP BY + HAVING)
7.  Find users who have NO tasks at all
8.  Find each user's most recent task (correlated subquery)
9.  Rewrite #8 with a CTE using ROW_NUMBER()
10. Top 3 highest-priority tasks per owner (window function + PARTITION BY)
11. Count tasks created per month (date_trunc + GROUP BY)
12. Tasks not yet done that are high priority (WHERE filter)
13. (bonus) Rank users by total task count (RANK/DENSE_RANK)
```

### Requirements

- Write each query **as SQL** (paste results or screenshots)
- Use `EXPLAIN (ANALYZE)` on at least 2 queries and note if any is a `Seq Scan`
- No ORM — raw SQL in `psql`

### Deliverables

- `exercises/01_queries.sql` (all queries, runnable top-to-bottom)
- A short markdown explaining what each does + one `EXPLAIN` output + how to speed it up (index?)

### Grading (this assignment)

| Criteria | Points |
|----------|--------|
| Correctness of all queries (results verified) | 60% |
| Proper JOIN types / GROUP BY + HAVING usage | 20% |
| At least one window function and one subquery/CTE | 10% |
| EXPLAIN usage + index suggestion | 10% |

---

## Assignment 2: `pg` Data-Access Layer for the Task Manager

**Objective:** Replace the in-memory `store` (Week 8) with a typed PostgreSQL repository layer. Controllers keep working.

### Implement

- `db/pool.ts` — `pg.Pool` from env config
- `db/rows.ts` — `UserRow`, `TaskRow` interfaces
- `db/mappers.ts` — `mapUser`, `mapTask`, `toPublicUser`
- `db/userRepo.ts`, `db/taskRepo.ts` — CRUD + filters + pagination, **all parameterized**
- `db/tx.ts` — a transaction example (create user + initial task atomically)

### Requirements

- All SQL uses `$1, $2` placeholders (NO string interpolation)
- `userRepo.findByEmail`, `findById`, `create`, `list`
- `taskRepo.list({ ownerId, status, limit, offset })` returns `{ items, total }`
- `taskRepo.findById`, `create`, `update` (partial), `remove`
- Controllers keep their existing contract — swap only the data source

### Test

```bash
# via your running API
npm run dev
curl -s http://localhost:3000/api/tasks -H "Authorization: Bearer $TOKEN"
# confirm rows really land in Postgres (psql):
psql -U postgres -d task_manager_week9 -c "SELECT * FROM tasks ORDER BY id DESC LIMIT 5;"
```

### Grading

| Criteria | Points |
|----------|--------|
| Parameterized queries everywhere (no injection) | 30% |
| Typed rows + mappers (strict, no `any`) | 20% |
| Filters + pagination correct (`items`, `total`) | 20% |
| Pool used (not per-request Client) | 15% |
| Transaction example correct | 15% |

---

## Assignment 3: Schema Design + Manual SQL Migrations

**Objective:** Write a clean, constrained schema and manage it with versioned `.sql` files.

### Deliverables

```text
migrations/
├── 001_create_users.sql
├── 002_create_tasks.sql
├── 003_indexes.sql
└── 004_seed.sql   (optional dev seed data)
```

### Requirements

- `users`: `id PK`, `email UNIQUE NOT NULL`, `password_hash`, `role CHECK`, timestamps
- `tasks`: `id PK`, `owner_id FK → users(id)`, `title`, `status CHECK`, `priority CHECK`, `updated_at`
- Indexes: at least `owner_id`, and a composite `(owner_id, status)`
- Use `IF NOT EXISTS` so re-running is safe (idempotent)
- Run all migrations in order:
  ```bash
  psql -U postgres -d task_manager_week9 -f migrations/001_create_users.sql
  psql -U postgres -d task_manager_week9 -f migrations/002_create_tasks.sql
  psql -U postgres -d task_manager_week9 -f migrations/003_indexes.sql
  ```
- Prove the constraints work:
  ```sql
  -- should FAIL: duplicate email
  INSERT INTO users (email,name,password_hash,role) VALUES ('ada@x.com','Ada2','h','user');
  -- should FAIL: bad role
  INSERT INTO users (email,name,password_hash,role) VALUES ('new@x.com','New','h','wizard');
  -- should FAIL: task with nonexistent owner
  INSERT INTO tasks (owner_id,title) VALUES (9999,'Ghost');
  ```

### Grading

| Criteria | Points |
|----------|--------|
| Schema correct + all constraints present | 40% |
| Indexes justified (and used by `EXPLAIN`) | 25% |
| Migrations idempotent + run cleanly in order | 20% |
| Seed data (optional but helpful for testing) | 15% |

---

## Overall Week 9 Grading

| Assignment | Weight |
|------------|--------|
| 1. SQL exercises | 30% |
| 2. `pg` data-access layer | 35% |
| 3. Schema + migrations | 20% |
| Project (Task Manager → PostgreSQL) | 15% *(full rubric in project file)* |

## Tips

1. `SELECT` less `WHERE` more — build queries incrementally.
2. If a query is hard to read, refactor into a CTE.
3. Always `EXPLAIN (ANALYZE)` before adding an index.
4. `NOW()`/`CURRENT_TIMESTAMP` for timestamps — don't pass them from JS unless you must.
5. In repos, `UPDATE` with dynamic fields: build `SET` clauses carefully with positional params.
6. If `tsc` complains about `rows` types, type the `pool.query<MyRow>(...)` call — never cast to `any`.