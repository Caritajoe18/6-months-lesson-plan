# Day 1 — Git Basics: Initialization, Commits & Ignoring Files

**Next:** [Day 2 — Branching & Merging](day-2-branching-merging.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Explain what version control is and why Git exists
- Configure Git for your machine
- Create a repository with `git init`
- Stage and commit changes
- Inspect history with `git log` and `git status`
- Use `.gitignore` to exclude files
- Undo mistakes safely

---

## 1. What Is Version Control?

Version control is a system that records changes to files over time so you can recall specific versions later.

```text
Without version control:

  final.txt
  final_2.txt
  final_FINAL.txt
  final_REALLY_FINAL.txt
  final_exam_ready.txt
  final_do_not_use.txt

With Git:

  Commit 1 ──▶ Commit 2 ──▶ Commit 3 ──▶ Commit 4
  "Init"       "Add nav"    "Fix bug"     "Add login"
```

### Why Git?

```text
✅ Track every change with history
✅ Revert to any previous state
✅ Work on multiple features simultaneously (branches)
✅ Collaborate with teams without overwriting each other
✅ Backup code to the cloud (GitHub)
✅ Standard industry tool — every developer uses it
```

### Git vs GitHub

```text
Git     → Local version control system (runs on your machine)
GitHub  → Cloud platform for hosting Git repositories + collaboration tools

You can use Git WITHOUT GitHub, but not GitHub without Git.
```

---

## 2. How Git Works

Git stores snapshots of your files in three places:

```text
Working Directory          Staging Area                Local Repository
(your files)               (what you'll commit)        (.git folder)
─────────────────          ─────────────────           ─────────────────
file.js  ── git add ──▶   staged file.js  ── git commit ──▶  snapshot saved
modified                              (index)

  ▼ git checkout / git restore pulls files back
```

### The Three States

| State | What It Means |
|-------|---------------|
| **Modified** | You changed a file but haven't committed it |
| **Staged** | You marked changes to be included in the next commit |
| **Committed** | Your changes are saved in Git's history |

---

## 3. Installing Git

### macOS

```bash
# With Homebrew
brew install git

# Or use Xcode Command Line Tools (prompts automatically)
git --version
```

### Windows

```text
1. Download from https://git-scm.com/download/win
2. Install with default options
3. Git Bash terminal is recommended
```

### Linux

```bash
sudo apt install git   # Debian/Ubuntu
sudo dnf install git   # Fedora
```

### Verify Installation

```bash
git --version
# git version 2.x.x
```

---

## 4. First-Time Configuration

Configure your identity once — it's attached to every commit.

```bash
git config --global user.name "Ada Lovelace"
git config --global user.email "ada@example.com"

# Verify configuration
git config --list

# Check individual values
git config user.name
git config user.email
```

### Line Ending Settings (Windows)

```bash
git config --global core.autocrlf true   # Windows
git config --global core.autocrlf input  # macOS/Linux
```

### Alias (optional)

```bash
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.ci commit
# Now `git co` works like `git checkout`
```

### Check Your Identity

```bash
git config --global --get user.name
git config --global --get user.email
```

> ⚠️ **Important:** Your `user.email` from Git is attached to every commit. Use the same email as your GitHub account for proper attribution. To override per-repository (e.g., work vs personal), run the same commands without `--global` inside the repo.

> ⚠️ **Security note:** Avoid using GitHub's "no-reply" email masking for the *first* commit or teaching demos — it's fine for production, but confusing for beginners.

---

## 5. Creating a Repository

```bash
# Navigate to your project
cd my-project

# Initialize a repository
git init

# Output
# Initialized empty Git repository in /path/to/my-project/.git/
```

### What git init Does

```text
Creates a hidden .git/ folder
  ├── HEAD          → Points to current branch
  ├── config        → Repository configuration
  ├── objects/      → Stored commits and file snapshots
  ├── refs/         → Branch references
  └── ...           → Internal Git data
```

> ⚠️ **Never delete or edit the `.git/` folder** — that's your entire history.

---

## 6. Basic Workflow

### Step 1 — Check Status

```bash
git status
```

```text
On branch main
No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        index.js
        package.json
        README.md
```

### Step 2 — Stage Files

```bash
# Stage a specific file
git add index.js

# Stage multiple files
git add index.js package.json

# Stage everything
git add .
# or
git add -A
```

### Step 3 — Commit

```bash
git commit -m "Add initial project files"
```

```text
[main (root-commit) 7d2a1f3] Add initial project files
 3 files changed, 45 insertions(+)
 create mode 100644 README.md
 create mode 100644 index.js
 create mode 100644 package.json
```

### The Complete Cycle

```text
1. Create/modify files
        ↓
2. git status        → see what changed
        ↓
3. git add <files>   → stage changes
        ↓
4. git commit -m "message"   → save snapshot
        ↓
(repeat)
```

---

## 7. Writing Good Commit Messages

### Conventional Commits Format

```text
<type>(<scope>): <description>
```

| Type | Used For | Example |
|------|----------|---------|
| `feat` | New feature | `feat: add user login` |
| `fix` | Bug fix | `fix: correct date formatting` |
| `docs` | Documentation | `docs: update README` |
| `style` | Formatting | `style: run prettier` |
| `refactor` | Code restructure | `refactor: extract helper` |
| `test` | Tests | `test: add auth tests` |
| `chore` | Maintenance | `chore: update dependencies` |

### Good vs Bad

```text
❌ Bad:
git commit -m "stuff"
git commit -m "fixes things"
git commit -m "changes"

✅ Good:
git commit -m "fix: handle empty notes array"
git commit -m "feat: add --json flag to CLI"
git commit -m "docs: document setup steps"

✅ With body:
git commit -m "fix: handle empty notes array" -m "Notes.remove() now returns [] when the file is empty instead of crashing the app."
```

---

## 8. Viewing History

### git log

```bash
git log --oneline    # Compact one-line history
git log --all        # All branches
git log --graph      # Visual branching
git log --decorate   # Show branch/tag labels
```

```text
$ git log --oneline
a3b9c2d (HEAD -> main) feat: add user login
7d2a1f3 docs: update README
5e8f0a1 feat: add initial files
```

### git log --graph

```text
$ git log --graph --oneline
* 9f2d1c4 (HEAD -> main) fix: typo in header
* f3b4e2a feat: add footer
* a3b9c2d feat: add user login
* 7d2a1f3 docs: update README
```

### Comparing Commits

```bash
git diff                    # Working tree vs staging
git diff --staged           # Staging vs last commit
git diff <commit1> <commit2> # Between two commits
git show <commit>           # See what a commit changed
```

---

## 9. .gitignore

Tells Git which files **not** to track.

### Why Use .gitignore?

```text
Node.js projects:
  node_modules/   → never commit dependencies (MB of files)
  dist/           → build output (regenerated every build)
  .env           → secrets! NEVER commit

General:
  .DS_Store      → macOS junk
  Thumbs.db      → Windows junk
```

### Basic .gitignore

```gitignore
# Dependencies
node_modules/

# Build output
dist/
build/

# Environment files (secrets!)
.env
.env.local

# OS files
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Editor settings
.vscode/
.idea/
```

### .gitignore Rules

```gitignore
# Comment
#  Also fine to have an empty line with # markers

# Specific file
config.json

# Directory (with trailing slash)
node_modules/

# Wildcard patterns
*.log
*.tmp

# Negation (include files in ignored dir)
dist/**
!dist/index.html

# Only ignore at the repo root
/secret.txt

# Nested pattern
logs/**/*.log
```

### Patterns Cheat Sheet

| Pattern | Matches |
|---------|---------|
| `*.log` | Any file ending in `.log` |
| `node_modules/` | The directory (and contents) |
| `**/node_modules/` | node_modules anywhere in tree |
| `!keep.log` | Don't ignore keep.log |
| `/secret.txt` | Only at repo root |
| `a/**/b` | a/b, a/x/b, a/x/y/b |

### Checklist

```gitignore
# Node.js
node_modules/
dist/
build/
.env
.env.*
coverage/
*.log

# OS
.DS_Store

# Editor
.vscode/
.idea/
```

---

## 10. Undoing Changes

### Common Scenarios

```text
Scenario                     Command
────────                     ───────
File changed but NOT staged → git restore <file>
Staged but NOT committed    → git restore --staged <file>
Committed but wrong message → git commit --amend -m "new message"
Last commit was mistake     → git reset --soft HEAD~1
```

### git restore

```bash
# Discard changes in working directory
git restore file.txt
git restore .           # All files

# Unstage a file (keep changes)
git restore --staged file.txt
```

> ⚠️ `git restore <file>` permanently discards uncommitted changes. There's no undo!

### git reset

```bash
# Undo last commit, keep changes staged
git reset --soft HEAD~1

# Undo last commit, keep changes unstaged
git reset HEAD~1

# Undo last commit, discard changes (⚠️ destructive)
git reset --hard HEAD~1
```

### Recovering a Deleted File (not yet committed)

```bash
# Delete a file by accident
rm important.js

# Restore it from the last commit
git restore important.js
```

---

## 11. Complete Basic Workflow Example

```bash
# 1. Set up GitHub identity
git config --global user.name "Ada"
git config --global user.email "ada@example.com"

# 2. Create project
mkdir my-api && cd my-api
touch index.js package.json

# 3. Add .gitignore first
echo "node_modules/" > .gitignore

# 4. Initialize repo
git init

# 5. Stage and commit
git add .
git commit -m "feat: initial project scaffold"

# 6. Make a change
echo "const PORT = process.env.PORT || 3000;" >> index.js

# 7. Review and commit the change
git status
git diff
git add index.js
git commit -m "feat: use configurable port"

# 8. See history
git log --oneline --graph
```

---

## Exercises

1. Configure your Git identity (`user.name` and `user.email`).
2. Create a new repo, add files, and make your first commit.
3. Write 3 commits using conventional commit types (`feat`, `fix`, `docs`).
4. Create a `.gitignore` for a Node.js project that ignores `node_modules/` and `.env`.
5. Use `git status` and `git diff` to review changes before committing.
6. Practice undoing commits with `git reset --soft` and `git restore`.

---

## Key Takeaways

- Git snapshots your entire project, not just file differences
- Regular commits = safe checkpoints you can revert to
- Stage with `git add`, save with `git commit`
- Write conventional, descriptive commit messages
- `.gitignore` protects you from committing dependencies and secrets
- Use `git restore` / `git reset` to undo mistakes