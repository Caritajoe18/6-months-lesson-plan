# Day 1 — Relational Concepts, Tables/Keys & Core SQL (SELECT/WHERE/JOIN/GROUP BY)

**Next:** [Day 2 — Advanced SQL: Subqueries, CTEs, Indexes, Transactions & ACID](day-2-advanced-sql-ctes-indexes-transactions-acid.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Explain relational databases, tables, rows, columns, and schemas
- Identify Primary Keys (PK), Foreign Keys (FK), and uniqueness
- Write `SELECT`, `WHERE`, `ORDER BY`, `LIMIT`, `OFFSET`
- Use `INNER JOIN`, `LEFT JOIN`, filtering on joined tables
- Use `GROUP BY`, aggregate functions (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`)
- Filter aggregates with `HAVING`
- Model the Week 8 Task Manager in relational form

---

## 1. Relational Concepts

A **relational database** (RDBMS) stores data in **tables** with **relationships** between them.

| Term | Meaning |
|------|---------|
| Table (relation) | A set of related rows (e.g. `users`, `tasks`) |
| Row (tuple) | One record (e.g. a single user) |
| Column (attribute) | A field (e.g. `email`, `role`) |
| Schema | The structure: tables, columns, types, constraints |
| Primary Key (PK) | Uniquely identifies a row (usually `id SERIAL`/`BIGINT`) |
| Foreign Key (FK) | Links rows across tables (e.g. `tasks.owner_id` → `users.id`) |
| Constraint | Rule (NOT NULL, UNIQUE, CHECK, FK, PK) |
| Normalization | Removing duplication by splitting into related tables |

### Example mental model (Task Manager)

```text
users (1) ──< tasks (N)
one user has many tasks; a task belongs to exactly one user
```

---

## 2. Setting up a Playground DB

```bash
# start psql (varies by OS)
psql -U postgres

# create + connect
CREATE DATABASE task_manager_week9;
\c task_manager_week9
\dt        # list tables
\d users   # describe table
\q         # quit
```

---

## 3. Creating Tables (DDL)

```sql
-- users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,                    -- auto-incrementing integer PK
  email VARCHAR(255) NOT NULL UNIQUE,       -- must be unique, cannot be empty
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,      -- store bcrypt hash
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','user')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- tasks table
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- FK to users.id
  title VARCHAR(120) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('todo','in_progress','done')) DEFAULT 'todo',
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('low','medium','high')) DEFAULT 'medium',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

Notes on constraints:

- `REFERENCES users(id)` enforces referential integrity
- `ON DELETE CASCADE` means deleting a user deletes their tasks (common in dev)
- `CHECK` prevents invalid enum values at the DB level (defense-in-depth)
- `DEFAULT NOW()` sets timestamps automatically

---

## 4. Inserting Data (DML)

```sql
-- insert users (password_hash is a placeholder for this lesson)
INSERT INTO users (email, name, password_hash, role)
VALUES ('ada@x.com', 'Ada Lovelace', '$2a$10$PLACEHOLDERHASH', 'admin'),
       ('grace@x.com', 'Grace Hopper', '$2a$10$PLACEHOLDERHASH2', 'user')
RETURNING id, email, role;  -- see what was inserted

-- insert tasks
INSERT INTO tasks (owner_id, title, status, priority)
VALUES (1, 'Ship week 8 notes', 'todo', 'high'),
       (1, 'Review PRs', 'in_progress', 'medium'),
       (2, 'Solve SQL exercises', 'todo', 'high')
RETURNING *;
```

---

## 5. Reading Data: SELECT, WHERE, ORDER BY, LIMIT

```sql
-- all columns, all rows
SELECT * FROM users;

-- specific columns
SELECT id, email, role FROM users;

-- filtering
SELECT * FROM users WHERE role = 'admin';
SELECT * FROM tasks WHERE status = 'todo' AND priority = 'high';

-- sorting
SELECT * FROM tasks ORDER BY created_at DESC;

-- pagination (OFFSET/LIMIT)
SELECT * FROM tasks ORDER BY id ASC LIMIT 2 OFFSET 0;  -- page 1
SELECT * FROM tasks ORDER BY id ASC LIMIT 2 OFFSET 2;  -- page 2
```

### Operators to know

| Operator | Use |
|----------|-----|
| `=`, `!=`, `<>` | equality/inequality |
| `<`, `<=`, `>`, `>=` | comparisons |
| `LIKE`, `ILIKE` | pattern matching (`ILIKE '%sql%'` case-insensitive) |
| `IN (...)` | set membership |
| `BETWEEN ... AND ...` | range |
| `IS NULL`, `IS NOT NULL` | null checks |
| `AND`, `OR` | combining |

---

## 6. Joins: Relating Tables

We need data from **both** tables: "show tasks with their owner's name/email".

### INNER JOIN — only matching rows

```sql
SELECT
  t.id,
  t.title,
  t.status,
  t.priority,
  u.name AS owner_name,
  u.email AS owner_email
FROM tasks t
INNER JOIN users u ON t.owner_id = u.id
ORDER BY t.id;
```

### LEFT JOIN — all rows from left, matching from right (NULL if none)

```sql
-- useful if a task could ever be orphaned (but FK prevents)
SELECT t.id, t.title, u.name
FROM tasks t
LEFT JOIN users u ON t.owner_id = u.id;
```

### Self-join? rare here — just to know it exists

```text
SELF JOIN joins a table to itself (e.g. employees.manager_id → employees.id)
```

---

## 7. GROUP BY & Aggregates

Aggregates collapse many rows into one value.

| Function | Returns |
|----------|---------|
| `COUNT(*)` | number of rows |
| `COUNT(column)` | number of non-NULL values |
| `SUM(column)` | sum |
| `AVG(column)` | average |
| `MIN(column)` | minimum |
| `MAX(column)` | maximum |

### How many tasks per user?

```sql
SELECT
  u.id,
  u.name,
  COUNT(t.id) AS task_count
FROM users u
LEFT JOIN tasks t ON t.owner_id = u.id
GROUP BY u.id, u.name
ORDER BY task_count DESC;
```

> **Rule:** every non-aggregated column in `SELECT` must appear in `GROUP BY`.

### Tasks per status (overall)

```sql
SELECT status, COUNT(*) AS count
FROM tasks
GROUP BY status;
```

---

## 8. HAVING — Filter After Grouping

`WHERE` filters **rows before** grouping. `HAVING` filters **groups after** aggregation.

```sql
-- users who have MORE than 1 task
SELECT
  u.id,
  u.name,
  COUNT(t.id) AS task_count
FROM users u
JOIN tasks t ON t.owner_id = u.id
GROUP BY u.id, u.name
HAVING COUNT(t.id) > 1
ORDER BY task_count DESC;
```

Compare:

```sql
WHERE created_at > '2025-10-01'  -- filters individual tasks
HAVING COUNT(*) > 5             -- filters the whole group
```

---

## 9. Mapping Week 8 Entities to SQL

| TS Type | Table | Notes |
|---------|-------|-------|
| `User` | `users` | `passwordHash` → `password_hash` (snake_case in SQL) |
| `PublicUser` | `users` | project to id,email,name,role,created_at (omit hash) |
| `Task` | `tasks` | `ownerId` → `owner_id`, timestamps as `TIMESTAMP` (UTC) |
| `Role` | `users.role` | `CHECK ('admin','user')` |
| `TaskStatus` | `tasks.status` | `CHECK ('todo','in_progress','done')` |

### Keep mapping explicit in the data-access layer

```ts
// db/mappers.ts
import type { Task, User } from "../types.js";

export function mapUserRow(row: any): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at.toISOString()
  };
}

export function mapTaskRow(row: any): Task {
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

> For strict TS, define `UserRow`/`TaskRow` interfaces for the `pg` result shape.

---

## 10. Exercises (Do in `psql`)

1. Create `task_manager_week9` and the two tables above
2. Insert 3 users (2 user, 1 admin) and 5 tasks
3. List all tasks with owner name + email (INNER JOIN)
4. Count tasks per status: `GROUP BY status`
5. Find users with **>= 2** tasks: `JOIN + GROUP BY + HAVING`
6. Paginate tasks: page 1 (LIMIT 3 OFFSET 0), page 2 (LIMIT 3 OFFSET 3)
7. Show `todo` tasks owned by a specific user: `WHERE status='todo' AND owner_id=?`
8. Find tasks whose title contains "sql" (case-insensitive): `ILIKE '%sql%'`

---

## Key Takeaways

- **Relational** = tables + keys + constraints enforcing correctness
- PK/FK model real-world **ownership** (`tasks.owner_id → users.id`)
- `JOIN` brings related data together; `INNER` vs `LEFT` matters
- `WHERE` pre-filter, `HAVING` post-filter on aggregates
- `GROUP BY` requires all non-aggregated columns
- Pagination = `ORDER BY + LIMIT + OFFSET`
- Map snake_case DB columns → camelCase TS types in a single mapper layer

**Next:** [Day 2 — Subqueries, CTEs, Indexes, Transactions, ACID](day-2-advanced-sql-ctes-indexes-transactions-acid.md)