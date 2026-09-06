# Project: Collaborative "Team Notes" CLI

## Objective

Work in **pairs** to build a shared Node.js CLI tool — the same code in one repository — using the full team Git workflow. This project is about *collaboration process*, not just code: you will practice branching, PRs, reviews, conflict resolution, and clean history.

> The deliverable is a **repo with a real, reviewable collaboration history** — not just working code.

---

## The Product

A terminal todo/note manager with two feature modules, each built by a different developer:

```text
Team Notes CLI
├── notes        → create, list, complete, delete notes (dev A)
├── todos        → same idea, with priorities (dev B)
└── output       → shared formatter both sides use
```

Your shared codebase makes conflicts almost guaranteed — that's the exercise.

---

## Team Setup (Pairs)

```text
Developer A: owns notes module + shared table formatter
Developer B: owns todos module + shared color formatter
Both: collaborate on main via PRs only (never push to main)
```

### Recommended split to force collaboration

| File | Owned by |
|------|----------|
| `package.json` | both (merge constantly) |
| `src/index.js` (entry, parses CLI) | A |
| `src/notes.js` | A |
| `src/todos.js` | B |
| `src/table.js` (shared formatter) | A |
| `src/colors.js` (shared formatter) | B |
| `README.md` | both (document your halves) |

---

## Step 1 — Bootstrap the Repo

### One person creates the skeleton and shares it

```bash
# Dev A:
mkdir team-notes && cd team-notes
git init
npm init -y
touch .gitignore README.md
# .gitignore = node_modules/, .env
echo -e "console.log('Team Notes CLI');" > src/index.js   # create src/
git add .
git commit -m "chore: initial scaffold"
```

### Create the GitHub repo and give Dev B access

```text
1. github.com → New repository → "team-notes" (private or public)
2. Settings → Collaborators → add Dev B
```

```bash
# Dev A connects & pushes:
git remote add origin <url>
git branch -M main
git push -u origin main

# Dev B clones:
git clone <url> team-notes
```

### Install & configure (in your own box)

```bash
npm install
git config user.name "Dev A"          # set your own identity
git config user.email "devA@example.com"
```

---

## Step 2 — Agree on the Contract

Before coding, define the interface so both halves fit together:

```js
// The agreed contract (document it in a comment or README section)

// add(name)                     → adds a note, prints "✓ Added"
// list()                        → renders using table()
// complete(id) / delete(id)

// table(headers, rows)          → shared formatter in src/table.js
//   headers: ["ID", "Status", "Name"]
//   rows:    [[1, "done", "water plants"], ...]

// colorize(text, color)         → shared formatter in src/colors.js
//   colors: "green" | "red" | "yellow"
```

Both devs should commit the contract as a first PR on main together:

```bash
git switch -c docs/contract
# add the contract to README.md
git add README.md
git commit -m "docs: define module contract"
git push -u origin docs/contract
# other dev reviews on GitHub, then squash-merge
```

---

## Step 3 — Parallel Feature Branches

Now each dev works independently **at the same time** — this is where conflicts come from.

### Dev A

```bash
git switch main
git pull origin main
git switch -c feat/notes-module

# implement src/notes.js (add, list, complete, delete)
# edit src/table.js (fixed-width table formatter)
# edit src/index.js to wire up the notes commands
git add .
git commit -m "feat: add notes module"
git push -u origin feat/notes-module
```

### Dev B (in parallel)

```bash
git switch main
git pull origin main
git switch -c feat/todos-module

# implement src/todos.js (with priority field!)
# edit src/colors.js (colored output)
# edit src/index.js to wire up the todos commands
git add .
git commit -m "feat: add todos module"
git push -u origin feat/todos-module
```

---

## Step 4 — PRs, Reviews & Merge

### Open the first PR

```bash
# GitHub → "Compare & pull request"
# Title: feat: add notes module
# Body: describe what changed, how to test
```

### Review checklist (as the reviewer)

```text
✅ Does it match the contract?
✅ Any breaking changes?
✅ Follows file ownership? (index.js owned by A — if B touched it, flag it)
✅ Run it: node src/index.js
```

### Handle the merge race

When the second dev's PR arrives, GitHub may show:

```text
This branch has conflicts that must be resolved
```

Both devs probably edited `src/index.js` and `package.json`. Resolve together:

```bash
# Dev B (the conflicted one):
git switch main
git pull origin main
git switch feat/todos-module

# Merge main into your branch and fix conflicts
git merge main
# fix conflicts in index.js, package.json, README.md
git add .
git commit -m "merge: resolve index/package conflicts"
git push
# re-open PR → now merges cleanly
```

---

## Step 5 — Release & Tag

Once both modules are on main and working:

```bash
git switch main
git pull origin main
node src/index.js list          # sanity check all commands

# Tag the release
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

Create a GitHub Release with notes:

```markdown
## v1.0.0
### Features
- Add/list/complete/delete notes (@DevA)
- Add/list todo items with priorities (@DevB)

**Changelog** compare/...
```

---

## Step 6 — Hotfix Drill (Stash + Cherry-Pick)

After the release, introduce a small bug on purpose (or find one):

1. Dev B reports a bug in `colors.js`.
2. Dev A is mid-work on a new feature (`feat/calendar`).
3. **Stash**: `git stash` — save the unfinished work.
4. **Hotfix branch**: `git switch -c hotfix/red-color main`, fix, commit, push, PR, merge.
5. **Restore**: `git switch feat/calendar && git stash pop` — resume where you left off.
6. **Cherry-pick** the hotfix onto the feature branch:

```bash
git cherry-pick <hotfix-commit-hash>
```

---

## Deliverables (submit together)

1. **Repo URL** — public or invite the instructor
2. **PR URLs** — at least 2 PRs: notes + todos
3. **Network graph** screenshot showing parallel/merged branches:
   - GitHub → Insights → Network
4. **Conflict log** — screenshot of one conflict + the resolution you chose
5. **Release** — v1.0.0 tag + release notes

### Grading Checks the History

The instructor will run:

```bash
git log --graph --oneline --all --decorate
```

Looking for:

```text
✅ Conventional commit messages (feat:, fix:, docs:, chore:)
✅ Feature branches named feat/..., fix/..., chore/...
✅ Merge/squash commits (evidence PRs were used)
✅ No stray "Merge branch 'main' into..." spam *everywhere*
✅ No node_modules/ or .env in the tree
✅ Sensible, bounded branch count
```

---

## Bonus

```text
1. GitHub Actions CI: run a simple test / lint on every PR
     - .github/workflows/ci.yml with actions/checkout + setup-node + npm test
2. Branch protection: require 1 review on main
3. Semantic releases via tags
4. A second feature cycle (v1.1.0: "archive completed notes") done properly
```

---

## Common Pitfalls

```text
❌ Pushing directly to main
   → forces DRY-run of PR flow; revert and redo

❌ Committing generated stuff (node_modules/, .env.local)
   → add to .gitignore and amend/purge from history

❌ Huge messy commits ("stuff", "changes")
   → squash into logical units

❌ Ignoring merge conflict markers
   → markers MUST be removed; build and run after resolving

❌ Both devs editing the same file at once without pulling
   → pull + merge often; communicate which file you're claiming
```

---

## Grading Rubric

| Criteria | Points |
|----------|--------|
| Working product (both modules run) | 20% |
| PR workflow followed (no direct pushes to main) | 25% |
| Conflict management (resolved correctly, resolved together) | 20% |
| Clean, conventional commit history | 15% |
| Shared contract respected | 10% |
| Repo hygiene (.gitignore, README, no junk) | 10% |