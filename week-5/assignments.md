# Week 5 Assignments

---

## Assignment 1: Version-Controlled Project Setup

**Objective:** Initialize a properly-configured Git repository with a clean commit history.

### Setup Instructions

1. Create a new project directory (any small project — your Week 4 notes CLI works well)

```bash
mkdir versioned-notes
cd versioned-notes
git init
```

2. **First, configure your identity if you haven't**
```bash
git config user.name "Ada Lovelace"
git config user.email "ada@example.com"
```

3. Create a `.gitignore` that ignores:
   - `node_modules/`
   - `dist/` and `build/`
   - `.env` files
   - OS files (`.DS_Store`)

4. Add a `README.md` describing the project.

### Requirements

| Task | Command to verify | Pass condition |
|------|-------------------|----------------|
| Repository initialized | `git status` | Reports `On branch main` (not master) |
| `.gitignore` works | `touch node_modules` then `git status` | `node_modules/` not listed as untracked |
| 4+ meaningful commits | `git log --oneline` | 4 commits using conventional types (`feat`, `fix`, `docs`) |
| `.env` created + ignored | `echo "SECRET=x" > .env` then `git status` | `.env` NOT listed |
| `.env` never in history | `git log --oneline -- .env` | No commits mention `.env` |

### Also Practice

```text
1. Undo a mistake:
   - Use `git restore` to throw away an uncommitted change
   - Use `git reset --soft HEAD~1` to undo the last commit (keep changes)

2. Amend a bad commit message:
   git commit --amend -m "feat: a better message"

3. Review your work before committing:
   git diff
```

### Submission

- `git log --oneline` output showing your commit history
- `git status` output showing a clean working tree
- `.gitignore` contents as proof of good hygiene

---

## Assignment 2: Branching & Conflict Resolution

**Objective:** Demonstrate mastery of branches, merges, conflicts, rebase, and stash.

### Part A — Feature Branch Workflow

```bash
# Start on main
git switch main

# Branch off
git switch -c feature/add-csv-export

# Make 2-3 commits on the feature branch

# Return to main, make 1 unrelated commit

# Merge the feature
git switch main
git merge feature/add-csv-export

# Verify with a graph
git log --graph --oneline --all
```

**Deliverable:** `git log --graph` showing your merge.

### Part B — Forcing a Conflict

Do this in a **separate scratch repo** (`mkdir conflict-lab && cd conflict-lab && git init`).

1. Create `app.js` with `const color = "blue";` and commit to `main`.
2. Create branch `feature/theme`, change `color` to `"green"`, commit.
3. Switch back to `main`, change `color` to `"red"`, commit.
4. `git merge feature/theme` — you should hit a conflict:

```text
CONFLICT (content): Merge conflict in app.js
```

5. Resolve the conflict manually (choose the version you want, remove markers):

```js
const color = "teal";   // conflict markers <<<< = ==== >>>> are GONE
```

6. Add and commit.

**Deliverable:** Write down the resolution steps you used, plus the conflict marker syntax.

### Part C — Rebase

In the same scratch repo:

```bash
git switch main
git reset --hard HEAD~2          # back to before the merge

git switch -c feature/rebased
echo "// feature work" >> app.js
git commit -am "feat: rebase practice"

git switch main
echo "// main work" >> main.js
git commit -am "feat: main progress"

# Rebase the feature on top of main
git switch feature/rebased
git rebase main
```

**Deliverable:** `git log --graph --oneline` showing a **linear** history (no merge commit).

### Part D — Stash the Emergency

```bash
git switch main
git switch -c feature/stash-demo
# Make uncommitted edits to app.js

# Oops — urgent hotfix needed
git stash         # save your work
git switch main
git switch -c hotfix/typo origin/main  # or just a local branch
# fix, commit, switch back
git switch feature/stash-demo
git stash pop     # bring your work back
```

**Deliverable:** `git stash list` output (should be empty after you pop).

---

## Assignment 3: GitHub Collaboration & PRs

**Objective:** Complete the full remote workflow: clone → branch → push → PR → merge → sync.

### Part A — Create & Push a Repo

1. Create a **new** public repo on GitHub (no README/gitignore auto-generated).
2. Connect and push your local project:

```bash
git remote add origin <your-url>
git branch -M main
git push -u origin main
```

3. Verify on GitHub: your files and the commit history should be visible.

### Part B — Open a Pull Request on Your Own Repo

```bash
git switch -c feature/format-code

# Make changes, commit
git push -u origin feature/format-code
```

1. GitHub will print a "compare & pull request" link — open it.
2. Write a PR body using the template from the lesson:

```markdown
## What
Briefly describe your feature.

## Why
Explain the motivation.

## How to test
Steps to verify, e.g. `npm start` and visit a URL.

## Screenshots (if UI)
```

3. Merge it with **Squash and merge**.
4. Pull the merged changes locally:

```bash
git switch main
git pull origin main
```

### Part C — Fork & Sync (Advanced)

Pick any public repo (or your teammate's repo):

1. Fork it on GitHub.
2. Clone your fork, add `upstream`
3. Simulate changes landing on upstream: `git fetch upstream` → `git rebase upstream/main`
4. Delete the remote feature branch you created in Part B:

```bash
git push origin --delete feature/format-code
```

### Submission

- The URL of your repo
- The URL of a PR you created
- `git remote -v` output showing `origin`
- If you did Part C: `upstream` listed in `git remote -v`

---

## Grading Criteria

| Criteria | Points |
|----------|--------|
| Correct command usage | 35% |
| Clean, conventional commit messages | 20% |
| Conflict resolution correctness | 20% |
| Push/PR workflow completeness | 15% |
| Repo hygiene (no node_modules, no .env) | 10% |

---

## Tips

1. Use a scratch repo for destructive experiments (`git reset --hard`).
2. Commit early and often; use `git status` + `git diff` before every commit.
3. Never commit secrets, `node_modules/`, or build output.
4. If you get stuck, `git status` tells you exactly what's happening.
5. `git help <command>` shows the manual for any command.