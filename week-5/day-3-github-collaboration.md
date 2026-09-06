# Day 3 — GitHub, Remotes & Collaboration Workflows

**Previous:** [Day 2 — Branching & Merging](day-2-branching-merging.md)
**Next:** [Assignments](assignments.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Create a GitHub repository and connect a local repo to it
- Push, pull, and fetch with remotes
- Work with pull requests (PRs) and code review
- Understand fork & clone vs. clone workflows
- Write a good README and LICENSE
- Explore GitHub Actions basics and release management

---

## 1. What Is GitHub?

```text
GitHub = Cloud hosting for Git repositories + collaboration features

Git (local)                    GitHub (cloud)
──────                         ────────
Stores history                 Backs up repositories
Branches & commits             Pull requests & code review
No collaboration tools         Issues, projects, wikis
                              CI/CD (Actions)
                              Releases & tags
```

### Alternatives

| Service | Notes |
|---------|-------|
| **GitHub** | Most popular, free for students, Actions |
| GitLab | Self-hostable, strong built-in CI/CD |
| Bitbucket | Good Jira integration |

---

## 2. Remote vs Local

```text
┌──────────────────┐          ┌─────────────────────┐
│  Local repository │  push   │   GitHub remote      │
│  (your machine)   │ ──────▶ │   (github.com/...)   │
│  .git/ folder     │ ◀────── │                      │
│                   │  pull   │  origin = default    │
└──────────────────┘          └─────────────────────┘
```

| Term | Meaning |
|------|---------|
| `origin` | Default name for your main remote |
| `upstream` | Original repo you forked from (forks) |
| Remote | A URL where your repo is hosted |

---

## 3. Creating a GitHub Repository

### Option A: GitHub First

```text
1. github.com → New repository
2. Name it (e.g., "my-api")
3. Choose public or private
4. Optionally: add README, .gitignore, license
5. Copy the remote URL (HTTPS or SSH)
```

Then connect locally:

```bash
git remote add origin https://github.com/yourname/my-api.git
git branch -M main
git push -u origin main
```

### Option B: Local First

```bash
# Already have a local repo? Add it to GitHub:
git remote add origin git@github.com:yourname/my-api.git
git branch -M main
git push -u origin main
```

### HTTPS vs SSH

| Auth | When | Setup |
|------|------|-------|
| HTTPS | Requires personal access token (PAT) each push (or credential helper) | Generate token in GitHub settings |
| SSH | Key-based, no password prompt | `ssh-keygen` + add to GitHub |

### SSH Setup (recommended)

```bash
# Generate a key (one time)
ssh-keygen -t ed25519 -C "you@example.com"
# Press enter for defaults; optionally add a passphrase

# Show the public key
cat ~/.ssh/id_ed25519.pub

# 1. Add the public key at: github.com → Settings → SSH and GPG keys
# 2. Test
ssh -T git@github.com
# Hi yourname! You've successfully authenticated...
```

### Check Your Remote

```bash
git remote -v
# origin  git@github.com:yourname/my-api.git (fetch)
# origin  git@github.com:yourname/my-api.git (push)
```

---

## 4. The Push / Pull / Fetch Workflow

### git push

```bash
# Push current branch, set tracking
git push -u origin main

# Push (upstream already set)
git push

# Push a specific branch
git push origin feature/login

# Delete remote branch
git push origin --delete feature/login

# Force push (⚠️ only with --force-with-lease)
git push --force-with-lease
```

### git pull vs git fetch

```bash
# Fetch + merge (or rebase) remote changes
git pull

# Only download changes, don't touch working directory
git fetch
git status
# "Your branch is behind 'origin/main' by 3 commits"
git merge origin/main   # or rebase onto it
```

| Command | Download? | Update files? | Update branch? |
|---------|-----------|---------------|----------------|
| `git fetch` | ✅ | ❌ | ❌ |
| `git merge` | ❌ | ✅ | ✅ |
| `git pull` | ✅ | ✅ | ✅ (fetch + merge) |

```bash
# Pull with rebase instead of merge (keeps history linear)
git pull --rebase
```

> ⚠️ **Always pull before you start working** — and again before you push. This prevents conflicts and the dreaded "rejected" push.

---

## 5. Authentication & Tokens

HTTPS push requires credentials:

### Personal Access Token (PAT)

```text
1. GitHub → Settings → Developer settings → Personal access tokens
2. Fine-grained or classic token
3. Scope: `repo` (full control of repos)
4. Use the token as your password when pushing
```

```bash
# Once: cache credentials
git config --global credential.helper osxkeychain
```

### Where NOT to store tokens

```text
❌ In code
❌ In .env   (if committed)
❌ In commit messages
✅ Use gh auth login, SSH keys, or credential helper
```

---

## 6. Collaborating on a Repository

### Two Collaboration Models

```text
Model 1 — Collaborator (shared repo)
   You and teammates have write access to the SAME repo
   Branches + PRs inside one repo

Model 2 — Fork & PR (open source)
   Fork the repo (copy to your account)
   Clone YOUR fork
   Push to your fork
   Open a PR back to the original ("upstream")
```

### Model 1: Shared Repo Workflow

```bash
# Add your teammate as collaborator (repo settings → Collaborators)

# Both use the same origin
git clone git@github.com:team/my-api.git

# Feature branch → push → PR → merge
git switch -c feature/login
git push -u origin feature/login
# Open PR on GitHub → review → merge
```

### Model 2: Fork Workflow

```bash
# 1. On GitHub: click "Fork" on someone's repo

# 2. Clone YOUR fork
git clone git@github.com:yourname/original-repo.git

# 3. Add upstream
git remote add upstream git@github.com:owner/original-repo.git

# 4. Create feature branch from latest upstream
git fetch upstream
git switch -c my-feature upstream/main

# 5. Push to YOUR fork
git push -u origin my-feature

# 6. Open PR: your fork's branch → upstream main
# 7. Keep your fork in sync
git checkout main
git pull upstream main
git push origin main
```

### The `upstream` Convention

```text
origin    →  your fork (where you push)
upstream  →  the original repo (where you pull from)
```

---

## 7. Pull Requests (PRs)

A PR is a **request to merge** changes from one branch into another, with review.

### Anatomy of a Good PR

```text
Title:        feat: add user login
Description:
  What: Adds email+password login.
  Why: Users need to authenticate.
  How: JWT-based sessions, bcrypt hashing.
  Testing: Added 4 unit tests; manual test via Postman.
  Screenshots/GIFs if UI changes.
  Closes #12           (links the issue)
```

### Good PR Description Checklist

| Include | Yes/No |
|---------|--------|
| What changed | ✅ |
| Why it changed | ✅ |
| How to test | ✅ |
| Related issue (#12) | ✅ |
| Breaking changes | ⚠️ flag clearly |

### Opening a PR

```bash
git push -u origin feature/login
# GitHub prints a "open a pull request" link
# otherwise: GitHub → Compare & pull request
```

### Reviewing a PR

```text
✅ Comment on specific lines
✅ Request changes vs approve
✅ Run tests if CI is configured
```

### Merging a PR — Three Options

| Strategy | Result | When |
|----------|--------|------|
| **Merge commit** | Adds a merge commit | default, preserves context |
| **Squash & merge** | One clean commit | feature branches, tidy history |
| **Rebase & merge** | Linear history, no merge commit | when you want flat log |

### Branch Protection Rules

```text
Repo → Settings → Branches → Add rule
✅ Require PR review before merging
✅ Require status checks to pass (CI)
✅ Require up-to-date branch
✅ Block force pushes on main
```

---

## 8. Issues

Issues track bugs, features, and tasks.

### Creating a Good Issue

```text
Bug report template:

Title: [BUG] Notes CLI crashes on empty file
Body:
  Steps to reproduce:
  1. Create empty notes.json
  2. Run node notes.js list
  Expected: [] printed
  Actual:   TypeError: Cannot read properties...
  Environment: Node v20, macOS
```

### Issue Labels & Linking

```bash
# Reference an issue in a commit
git commit -m "fix: handle empty notes array (closes #12)"

# GitHub auto-closes the issue when merged
# Keywords: closes / fixes / resolves #12
```

---

## 9. Writing a README

The README is the first thing people see. Make it great.

```markdown
# My Notes CLI

A command-line note-taking app built with Node.js.

## Features
- Add/list/delete notes from the terminal
- Data persisted in JSON
- Zero dependencies

## Installation
npm install

## Usage
node notes.js add "Do laundry"

## Commands
| Command | Description |
|---------|-------------|
| add      | Add a note      |
| list     | List all notes  |
| delete   | Remove a note   |

## Configuration
Set PORT and DATABASE_URL in a `.env` file.

## Testing
npm test

## License
MIT
```

### README Essentials

```text
✅ Project name + one-line description
✅ Badges (build passing, version, license)
✅ Installation & quick start
✅ Usage examples
✅ Configuration / environment variables
✅ Testing instructions
✅ License + Contributing
```

---

## 10. GitHub Actions (CI/CD Basics)

Automate builds, tests, and deployments on every push.

### What You Can Automate

```text
✅ Run tests on every push
✅ Run linters and type checks
✅ Deploy to production on main
✅ Release packages to npm
✅ Auto-merge or auto-label PRs
```

### First Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
```

### Common Setup

```bash
mkdir -p .github/workflows
```

`npm ci` vs `npm install`

```text
npm ci     → clean install from package-lock.json (CI-friendly)
npm install → may update the lock file
```

---

## 11. Releases & Versioning

### Releasing on GitHub

```text
1. Add a tag:  git tag -a v1.2.0 -m "Release 1.2.0"
2. Push the tag: git push origin v1.2.0
3. GitHub → Releases → Draft new release → pick tag
4. Write release notes
```

### Release Notes Example

```markdown
## v1.2.0

### Features
- Add dark mode
- Export notes to CSV

### Fixes
- Handle empty notes array (#12)
- Fix date formatting on Windows

**Full Changelog**: ...compare/v1.1.0...v1.2.0
```

---

## 12. Common Team Workflow Summary (Putting It Together)

```bash
# === As a developer, working on a feature ===

# 1. Start fresh
git switch main
git pull origin main                    # get latest

# 2. Branch off
git switch -c feature/payment-gateway

# 3. Work and commit
git add .
git commit -m "feat: add stripe integration"

# 4. Sync with teammates regularly
git pull origin main --rebase           # integrate their changes

# 5. Push and PR
git push -u origin feature/payment-gateway
# open PR → teammate reviews → merge
```

---

## Exercises

1. Create a GitHub repo and push a project to it (HTTPS or SSH).
2. Clone a repository, make a branch, push it, and open a PR (merge it or leave it open).
3. Fork a repo, clone your fork, add `upstream`, and sync it with the original.
4. Write a README for one of your projects with badges and usage examples.
5. Add a GitHub Action that runs `npm ci && npm test` on push/PR.
6. Create issues for a fictional project with proper labels and templates.

---

## Key Takeaways

- `origin` = your remote, `-u` sets tracking the first time
- `git pull` = fetch + merge; `git fetch` fetches without touching files
- PRs are the home of code review and discussion
- Use squash-merge for tidy history on main
- Lowercase `main` + protected branches = safer main
- Use SSH keys or PATs — never store tokens in code or `.env`
- Forks and `upstream` are how open-source PR workflows work
- GitHub Actions automates your tests on every push
- Never commit `.env` or `node_modules/` to a repository