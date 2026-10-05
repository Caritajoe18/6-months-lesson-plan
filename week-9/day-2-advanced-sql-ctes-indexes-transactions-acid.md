# Day 2 — Advanced SQL: Subqueries, CTEs, Indexes, Transactions & ACID

**Previous:** [Day 1 — Relational Concepts, SELECT/WHERE/JOIN/GROUP BY](day-1-relational-sql-select-where-join-groupby.md)
**Next:** [Day 3 — Node + pg, Connection Pooling & Parameterized Queries](day-3-node-pg-connection-pooling-parameterized.md)

## Learning Objectives

- Write subqueries (scalar, in `IN`, correlated)
- Use Common Table Expressions (CTEs) with `WITH` for readable queries
- Understand window functions basics (`ROW_NUMBER`, `RANK`)
- Use `EXPLAIN (ANALYZE, BUFFERS)` to spot slow queries
- Create and use indexes to speed up lookups
- Explain ACID properties and when to use transactions
- Write safe multi-step writes with `BEGIN/COMMIT/ROLLBACK`

---

## 1. Subqueries

A subquery is a query inside another query.

### Scalar subquery (returns 1 row, 1 column)

```sql
-- show tasks whose priority is the same as the HIGHEST priority overall
SELECT id, title, priority
FROM tasks
WHERE priority = (
  SELECT priority
  FROM tasks
  ORDER BY CASE priority
             WHEN 'high'   THEN 3
             WHEN 'medium' THEN 2
             WHEN 'low'    THEN 1
           END DESC
  LIMIT 1
);
```

### IN subquery (returns a list)

```sql
-- tasks owned by users who have >= 2 tasks
SELECT t.id, t.title, t.owner_id
FROM tasks t
WHERE t.owner_id IN (
  SELECT u.id
  FROM users u
  JOIN tasks t2 ON t2.owner_id = u.id
  GROUP BY u.id
  HAVING COUNT(t2.id) >= 2
);
```

### Correlated subquery (references outer query)

```sql
-- for each task, show if it's the most RECENT task for that owner
SELECT t1.id, t1.title, t1.owner_id, t1.created_at
FROM tasks t1
WHERE t1.created_at = (
  SELECT MAX(t2.created_at)
  FROM tasks t2
  WHERE t2.owner_id = t1.owner_id  -- correlated to outer t1
);
```

Subqueries are powerful; CTEs often read cleaner.

---

## 2. Common Table Expressions (CTEs) — `WITH`

CTEs break complex logic into named steps.

```sql
-- users with >= 2 tasks, then list their tasks
WITH heavy_users AS (
  SELECT u.id
  FROM users u
  JOIN tasks t ON t.owner_id = u.id
  GROUP BY u.id
  HAVING COUNT(t.id) >= 2
)
SELECT t.id, t.title, t.owner_id
FROM tasks t
JOIN heavy_users hu ON t.owner_id = hu.id
ORDER BY t.owner_id, t.id;
```

### Recursive CTE (optional but useful)

```sql
-- simple number series (1..5)
WITH RECURSIVE numbers(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1
  FROM numbers
  WHERE n < 5
)
SELECT n FROM numbers;
```

CTEs improve readability and let you build queries step-by-step.

---

## 3. Window Functions (Basics)

Window functions compute over a "window" of rows without collapsing groups.

```sql
-- rank tasks per owner by created_at (newest first)
SELECT
  id,
  title,
  owner_id,
  created_at,
  ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at DESC) AS rn
FROM tasks;

-- RANK vs ROW_NUMBER: ties differ (RANK gives same rank, skips)
SELECT
  title,
  priority,
  RANK() OVER (ORDER BY
    CASE priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 END DESC
  ) AS prio_rank
FROM tasks;
```

Common: `ROW_NUMBER`, `RANK`, `DENSE_RANK`, `LAG`, `LEAD`, `SUM() OVER (...)`.

---

## 4. Performance: `EXPLAIN` & Indexes

### `EXPLAIN (ANALYZE, BUFFERS)`

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM tasks WHERE owner_id = 2;
```

Look for:
- `Seq Scan` (scans entire table) — often slow on large tables
- `Index Scan` — uses an index (good)
- `Rows Removed by Filter`, actual time, buffers

> Never guess performance — measure with `EXPLAIN (ANALYZE)` on realistic data.

### Indexes

An index is like a book's index: speeds up `WHERE`, `JOIN`, `ORDER BY`.

```sql
-- index to find tasks by owner quickly
CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks (owner_id);

-- composite index if you often filter by (owner_id, status)
CREATE INDEX IF NOT EXISTS idx_tasks_owner_status ON tasks (owner_id, status);

-- case-insensitive search on title
CREATE INDEX IF NOT EXISTS idx_tasks_title_lower ON tasks (LOWER(title));

-- unique index (already UNIQUE constraint creates one)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);
```

### When to index

- ✅ Foreign keys, columns used in `WHERE`/`JOIN`/`ORDER BY`
- ✅ High-read, low-write tables
- ❌ Avoid indexing tiny tables (< few hundred rows)
- ❌ Too many indexes slow down `INSERT/UPDATE/DELETE` (trade-off)

### Drop if unused

```sql
DROP INDEX IF EXISTS idx_tasks_title_lower;
```

---

## 5. Transactions & ACID

A **transaction** groups multiple statements so they succeed/fail **together**.

### ACID properties

| Letter | Meaning | Example |
|--------|---------|---------|
| A | **Atomicity** — all or nothing | Create user + send welcome email? Or fail both if one fails |
| C | **Consistency** — DB moves from valid state to valid state | FK/ CHECK constraints enforced |
| I | **Isolation** — concurrent transactions don't interfere | Two people creating tasks don't corrupt counters |
| D | **Durability** — once committed, data survives crashes | COMMIT written to disk (WAL) |

### Syntax

```sql
BEGIN;                -- start transaction
  INSERT INTO users (email,name,password_hash,role)
    VALUES ('test@x.com','Test','hash','user') RETURNING id;

  INSERT INTO tasks (owner_id,title,status,priority)
    VALUES (currval('users_id_seq'), 'First task', 'todo', 'low');
COMMIT;               -- save both
-- or ROLLBACK;       -- undo everything since BEGIN
```

### Using `currval` / getting IDs safely

```sql
BEGIN;
  INSERT INTO users (...) VALUES (...) RETURNING id;  -- get id
  -- use that id for next insert
COMMIT;
```

Or use a CTE to insert user + task atomically:

```sql
BEGIN;
WITH new_user AS (
  INSERT INTO users (email, name, password_hash, role)
  VALUES ('bob@x.com', 'Bob', '$2a$10$HASH', 'user')
  RETURNING id
)
INSERT INTO tasks (owner_id, title, status, priority)
SELECT id, 'Onboard Bob', 'todo', 'medium'
FROM new_user;
COMMIT;
```

### When to use transactions in Node

- Creating a user **and** creating an initial task/profile
- Transferring "credits" (debit one account, credit another) — must be atomic
- Any multi-table write where partial success is incorrect

### Isolation levels (brief)

```text
READ COMMITTED (default Postgres) — good for most apps
REPEATABLE READ / SERIALIZABLE   — stronger but can cause serialization failures
```

---

## 6. Common Pitfalls

```text
❌ String concatenation in SQL → SQL injection (use $1,$2)
❌ Forgetting indexes on FK/WHERE → full table scans at scale
❌ Wrapping every read in a transaction (unnecessary overhead)
❌ Long-running transactions hold locks → blocks others
❌ Using SELECT * in production code (be explicit about columns)
❌ Not normalizing early or over-normalizing (find balance)
```

---

## 7. Exercises (in `psql`)

1. Write a correlated subquery: find each user's **most recent task**
2. Rewrite #1 with a CTE (`ROW_NUMBER()` window or `MAX(created_at)`)
3. `EXPLAIN (ANALYZE, BUFFERS)` on `SELECT * FROM tasks WHERE owner_id = 1` before/after `CREATE INDEX`
4. Insert a user + 2 tasks atomically inside `BEGIN/COMMIT` (rollback on purpose to see undo)
5. Find top 3 tasks by priority per owner: `ROW_NUMBER()` OVER (PARTITION BY owner_id ...)
6. Show tasks where title contains 'ship' case-insensitively using `LOWER(title)` + index

---

## Key Takeaways

- **Subqueries** = nested logic; **CTEs** = linear, readable steps
- **Window functions** compute per row without collapsing groups (`PARTITION BY`, `ORDER BY`)
- **Indexes** are the #1 tool to avoid `Seq Scan` on large tables — measure with `EXPLAIN (ANALYZE)`
- **ACID** guarantees correctness for multi-step writes; use `BEGIN/COMMIT/ROLLBACK`
- Transactions = "all-or-nothing". Keep them short (don't do network calls inside)
- Parameterized queries (`$1,$2`) are non-negotiable for preventing SQL injection

**Next:** [Day 3 — Node + pg, Pooling & Parameterized Queries](day-3-node-pg-connection-pooling-parameterized.md)