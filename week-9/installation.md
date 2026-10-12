# Installation Guide — PostgreSQL & SQL Tools

Setup for **Week 9: SQL & PostgreSQL**. Follow the section for your OS, then jump to [Verify](#4-verify-the-installation).

> **Your machine (checked):** PostgreSQL **15.17** is already installed via Homebrew and **running**, with `psql` on your PATH. [Section 2](#2-macos-homebrew) is mostly done for you — start at [4. Verify](#4-verify-the-installation).

## Contents

1. [What you need](#1-what-you-need)
2. [macOS (Homebrew)](#2-macos-homebrew)
3. [Windows](#3-windows)
4. [Linux](#4-linux)
5. [Verify the installation](#5-verify-the-installation)
6. [Create your course database](#6-create-your-course-database)
7. [GUI clients](#7-gui-clients)
8. [`psql` essentials](#8-psql-essentials)
9. [Connecting from Node (`pg`)](#9-connecting-from-node-pg)
10. [Day-to-day commands](#10-day-to-day-commands)
11. [Troubleshooting](#11-troubleshooting)
12. [Uninstall](#12-uninstall)

---

## 1. What you need

| Piece | What it is | Why |
|-------|-----------|-----|
| **PostgreSQL server** | The database engine | Stores your data, enforces constraints, runs SQL |
| **`psql` client** | Command-line tool | Type SQL interactively, run migration files |
| **A GUI client** (optional) | TablePlus / pgAdmin / DBeaver | Browse tables, run queries visually |
| **`pg` (Node driver)** | npm package | Connect your Express app to Postgres |

You install the server **once per machine**. Everything else is per-project.

---

## 2. macOS (Homebrew)

### Install

```bash
# check if already installed
brew list --versions postgresql@15

# install (skip if already installed)
brew install postgresql@15
```

> Homebrew installs into `/usr/local/opt/postgresql@15/`. If `psql` isn't found, see [Troubleshooting](#11-troubleshooting).

### Start the server

```bash
# start now and at login (recommended)
brew services start postgresql@15

# check status
brew services list
# postgresql@15   started
```

### Stop / restart

```bash
brew services stop postgresql@15
brew services restart postgresql@15
```

---

## 3. Windows

1. Download the installer: <https://www.postgresql.org/download/windows/>
2. Run the installer and keep the defaults, **except**:
   - **Password**: choose one and write it down (you'll need it for `.env`)
   - **Port**: `5432` (default, keep it)
   - Uncheck "Download Stack Builder" if you don't want extras
3. The installer registers the service and adds `psql` to your PATH.
4. Open **SQL Shell (psql)** from the Start Menu, or use PowerShell:
   ```powershell
   psql -U postgres
   # enter the password you set during install
   ```
5. Add the `bin` folder to PATH if `psql` isn't recognized:
   ```
   C:\Program Files\PostgreSQL\15\bin
   ```

---

## 4. Linux

### Debian / Ubuntu

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql
```

### Fedora / RHEL

```bash
sudo dnf install postgresql-server postgresql-contrib
sudo postgresql-setup --initdb      # first time only
sudo systemctl enable --now postgresql
```

Connect (Linux uses peer auth as the `postgres` OS user):

```bash
sudo -u postgres psql
```

---

## 5. Verify the installation

```bash
# 1. psql exists and shows a version
psql --version
# psql (PostgreSQL) 15.17 (Homebrew)

# 2. server is accepting connections
pg_isready
# /tmp:5432 - accepting connections

# 3. list databases
psql -l
```

If `pg_isready` says `no response`, the server isn't running → [section 10](#10-day-to-day-commands).

---

## 6. Create your course database

```bash
# connect to the default database
psql -d postgres

# inside psql:
CREATE DATABASE task_manager_week9;
\c task_manager_week9          -- connect to it
\dt                           -- list tables (empty for now)
\q                            -- quit
```

### Optional: a dedicated role with a password

Useful because your Node app needs a password (local socket connections skip passwords):

```sql
-- in psql as a superuser
CREATE ROLE task_app WITH LOGIN PASSWORD 'devpassword';
GRANT ALL PRIVILEGES ON DATABASE task_manager_week9 TO task_app;
```

### Apply the migrations from the lessons

```bash
cd path/to/your-project
psql -U postgres -d task_manager_week9 -f migrations/001_create_users.sql
psql -U postgres -d task_manager_week9 -f migrations/002_create_tasks.sql
psql -U postgres -d task_manager_week9 -f migrations/003_indexes.sql
```

Confirm:

```sql
\dt          -- users, tasks
\d tasks     -- columns, types, indexes, constraints
```

---

## 7. GUI clients

| Tool | Install | Notes |
|------|---------|-------|
| **TablePlus** | Already on your machine | Fast, native, free tier. Great default. |
| **pgAdmin 4** | `brew install --cask pgadmin4` | The official GUI; heavier but complete |
| **DBeaver** | `brew install --cask dbeaver` | Cross-database (MySQL, SQLite, too) |
| **Postico 2** | `brew install --cask postico` | macOS-native, polished |
| **VS Code extension** | `code --install-extension ms-azuretools.vscode-postgresql` | Query directly in the editor |

### Connecting in TablePlus (your setup)

```text
Host:      localhost
Port:      5432
User:      <your mac username>      e.g. carita
Password:  <the one you set>        (blank for socket-only access)
Database:  task_manager_week9
```

### Connecting in the VS Code extension

1. Install **PostgreSQL** by Microsoft
2. Add connection → Host `localhost`, Port `5432`, user, **Database: `task_manager_week9`**
3. It writes a `settings.json` snippet — copy it, don't commit it to git

---

## 8. `psql` essentials

Meta-commands start with a **backslash** and run inside the psql prompt.

| Command | Does |
|---------|------|
| `\l` | list databases |
| `\c dbname` | connect to a database |
| `\dt` | list tables |
| `\d tablename` | describe a table (columns, types, constraints, indexes) |
| `\du` | list roles/users |
| `\x` | toggle expanded (vertical) output — great for wide rows |
| `\timing` | show how long each query takes |
| `\i file.sql` | run a SQL file |
| `\q` | quit |

### Useful `psql` flags

```bash
psql -U postgres -d task_manager_week9   # specific user + database
psql -h localhost -p 5432 -U postgres    # force TCP instead of socket
psql -f migrations/003_indexes.sql       # run a file
psql -c "SELECT count(*) FROM tasks;"    # run one query and exit
psql -e -f migrations/001_create_users.sql   # show each statement as it runs (great for learning)
```

### Run the lesson queries interactively

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM tasks WHERE owner_id = 2;
```

---

## 9. Connecting from Node (`pg`)

### Install the driver

```bash
npm install pg
npm install -D typescript tsx @types/node @types/express @types/pg
```

### Create `.env` (never commit this)

```env
PGHOST=localhost
PGPORT=5432
PGUSER=task_app          # or your mac username
PGPASSWORD=devpassword   # or leave blank for socket/local trust
PGDATABASE=task_manager_week9
NODE_ENV=development
```

```bash
# keep .env out of git
echo ".env" >> .gitignore
```

### Load it in your app

```ts
// config.ts
import "dotenv/config";     // npm i dotenv

export const config = {
  db: {
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "",
    database: process.env.PGDATABASE ?? "task_manager_week9"
  }
} as const;
```

### Smoke test

```ts
// db/ping.ts
import { Pool } from "pg";
import { config } from "../config.js";

const pool = new Pool(config.db);

const res = await pool.query("SELECT NOW() AS now");
console.log(res.rows[0].now);   // 2026-...
await pool.end();
```

```bash
npx tsx db/ping.ts
```

> If the app can't connect but `psql` can, the difference is almost always **user or password** — `psql` uses your mac username via the local socket, your app uses `PGUSER`/`PGPASSWORD` over TCP.

---

## 10. Day-to-day commands

```bash
# is it running?
pg_isready

# start / stop / restart (macOS)
brew services start postgresql@15
brew services stop postgresql@15
brew services restart postgresql@15

# reload config after editing postgresql.conf
brew services restart postgresql@15

# where is the data?
psql -d postgres -c "SHOW data_directory;"

# view recent log (macOS)
tail -f /usr/local/var/log/postgresql@15.log

# drop and recreate the course DB (destructive)
dropdb task_manager_week9
createdb task_manager_week9
```

---

## 11. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `psql: command not found` | `psql` not on PATH | `export PATH="$(brew --prefix postgresql@15)/bin:$PATH"` and add it to `~/.zshrc` |
| `pg_isready` → `no response` | server stopped | `brew services start postgresql@15` |
| `connection refused` | wrong port / server down | `psql -l` works? check `SHOW port;` |
| `password authentication failed` | wrong password for that role | reset: `ALTER USER task_app WITH PASSWORD 'devpassword';` |
| `role "carita" does not exist` (from another tool) | tool uses a different user | set user to `postgres`, or create `carita` as a role |
| `database "task_manager_week9" does not exist` | DB not created | `createdb task_manager_week9` |
| `permission denied for schema public` | role lacks grants | `GRANT ALL ON SCHEMA public TO task_app;` |
| Node connects, queries hang | idle-in-transaction or missing index | `SELECT * FROM pg_stat_activity;` |
| Port 5432 already in use | another Postgres running | `lsof -i :5432` → stop the other one, or use a different `PGPORT` |

### Get help inside psql

```sql
\help          -- general help
\h CREATE TABLE  -- syntax for a command
```

---

## 12. Uninstall

```bash
# macOS: stop, then remove
brew services stop postgresql@15
brew uninstall postgresql@15

# Windows: Control Panel → Programs → PostgreSQL 15 → Uninstall
# Debian/Ubuntu:
sudo apt remove postgresql postgresql-contrib
```

> Removing the app does **not** delete your data. To delete it too, remove the data directory shown by `SHOW data_directory;` (usually `/usr/local/var/postgresql@15`). Back up first.

---

## Checklist before starting Week 9

```text
□ psql --version works
□ pg_isready says "accepting connections"
□ database task_manager_week9 exists (psql -l)
□ migrations 001/002/003 applied (\dt shows users + tasks)
□ GUI client (TablePlus) connects and shows the tables
□ npm i pg + @types/pg done
□ .env exists with PG* values, and .env is in .gitignore
□ db/ping.ts runs and prints a timestamp
```