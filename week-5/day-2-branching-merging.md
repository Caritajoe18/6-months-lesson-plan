# Day 2 — Branching, Merging, Conflicts & Stash

**Previous:** [Day 1 — Git Basics](day-1-git-basics.md)
**Next:** [Day 3 — GitHub & Collaboration](day-3-github-collaboration.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Understand what branches are and why you need them
- Create, switch, and delete branches
- Merge branches with `git merge`
- Resolve merge conflicts
- Use `git rebase` to keep history clean
- Stash work-in-progress with `git stash`

---

## 1. What Are Branches?

A branch is a **separate line of development**.

```text
main:                A ──── B ──── C ──────────────── D ────── E
                                            │
feature/login:              │        └── C ──── 1 ──── 2
                           (branched off)

You can work on "feature/login" without touching "main".
```

### Why Branch?

```text
✅ Work on a feature without breaking main
✅ Experiment freely (delete the branch if it fails)
✅ Parallel development — multiple features at once
✅ Each PR/feature gets its own isolated history
```

### Naming Conventions

| Convention | Example |
|------------|---------|
| Feature | `feature/login`, `feat/add-cart` |
| Bug fix | `fix/login-timeout`, `fix/#42-header` |
| Chore | `chore/update-deps` |
| Release | `release/v1.2.0`, `release/1.0.0-beta` |
| Issue | `issue/42` |

---

## 2. The Default Branch

Historically `master`, the default is now `main`.

```bash
# Check the name
git branch --show-current   # "main"

# Rename master → main (older repos)
git branch -m master main
```

> New repos created with `git init` and GitHub default to `main` now.

---

## 3. Creating Branches

```bash
# List all branches
git branch

# Create a new branch (at current HEAD)
git branch feature/login

# Create AND switch to it
git checkout -b feature/login
#  or (modern alternative)
git switch -c feature/login

# Switch to an existing branch
git checkout feature/login
git switch feature/login
```

> ✅ Prefer `git switch`/`git switch -c` for branch operations — `checkout` also does file restoration, which is confusing. `git checkout -b` is still extremely common though.

### Branch Dashboard

```text
$ git branch
  main
* feature/login     ← asterisk = current branch

$ git branch -v     # Include last commit on each branch
* feature/login    a3b9c2d feat: add user login
  main             7d2a1f3 docs: update README
```

---

## 4. How Branches Work Under the Hood

A branch is just a **pointer to a commit**.

```text
refs/heads/feature/login  ──▶  2f9a1c4 (a commit)
refs/heads/main           ──▶  7d2a1f3 (a commit)
HEAD                      ──▶  refs/heads/feature/login   (current branch)
```

When you commit:

```text
1. Git creates a new commit
2. The new commit's parent is the current HEAD
3. The branch pointer moves forward
4. main stays where it was
```

---

## 5. Merging Branches

```text
main:     A ──── B ──── C
                         \
feature:                  C ──── 1 ──── 2

After:   A ──── B ──── C ──┐
                           ├── merge commit M
feature:        C ──── 1 ──┘

A "merge commit" (M) joins the two lines of history.
```

### Fast-Forward Merge (no divergence)

```bash
git checkout main
git merge feature/login

# If main hasn't moved since branching:
# → Fast-forward (just moves the pointer, no new commit)
```

### Three-Way Merge (branch and main both moved)

```bash
git checkout main
git merge feature/login

# If both branches have new commits:
# → Creates a new merge commit combining both
```

### Merging With a Message

```bash
git merge feature/login -m "Merge feature/login into main"
```

### After Merging

```bash
# Delete the merged branch
git branch -d feature/login

# Force delete an unmerged branch (⚠️)
git branch -D feature/login
```

---

## 6. Merge Conflicts

A conflict happens when **two branches change the same line** of the same file.

```text
main:  line 3 → "color: red"
       line 3 → "color: blue"     (both changed line 3)
feature: line 3 → "color: green"

→ Git can't decide. It asks you to resolve.
```

### Seeing a Conflict

```text
$ git merge feature/login
Auto-merging index.js
CONFLICT (content): Merge conflict in index.js
Automatic merge failed; fix conflicts and then commit the result.
```

### Conflict Markers

```js
const theme = <<<<<<< HEAD
  "blue"
=======
  "green"
>>>>>>> feature/login
```

| Marker | Meaning |
|--------|---------|
| `<<<<<<< HEAD` | Content from current branch (main) |
| `=======` | Separator |
| `>>>>>>> feature/login` | Content from the merging branch |

### Resolving a Conflict

```text
1. Open the conflicted file
2. Choose content (one, both, or something new)
3. Remove ALL conflict markers
4. git add <file>
5. git commit
```

```js
// After resolution:
const theme = "green";   // the conflict markers are gone
```

```bash
git add index.js
git commit -m "merge: resolve theme conflict"
```

### Tips

```text
✅ Tips:
- git status shows exactly which files conflict
- Look at both versions before deciding
- Communicate with your teammate — they may prefer their version
- Use a merge tool for complex conflicts:  git mergetool
- If you regret it:  git merge --abort   (back to before merge)
```

---

## 7. git rebase

Rebase **replays** your commits on top of another branch.

```text
Before (merge):
  main:  A ──── B
                 \
  feature:        B ──── 1 ──── 2

After (rebase onto main):
  main:  A ──── B
                 \
  feature:        1' ──── 2'     (replayed on top of B)

History stays linear — no merge commit.
```

### Rebasing

```bash
git checkout feature/login
git rebase main
# feature/login now sits on top of main's latest commit
```

### Merge vs Rebase

| Aspect | Merge | Rebase |
|--------|-------|--------|
| History | Branching, merge commits | Linear, clean |
| Safety | Non-destructive | Rewrites history |
| Collaboration | Safe on shared branches | Only on local branches |
| When to use | Shared/public branches | Local/feature branches |

> ⚠️ **Golden rule of rebase:** Never rebase a branch others are working on. It rewrites commit hashes and breaks everyone else's history.

### Interactive Rebase

```bash
git rebase -i HEAD~3
```

Allows you to:

```text
pick   Fix scaffolding            ← keep
squash Fix scaffolding again      ← squash into previous
fixup  oops, missing import       ← discard message, keep changes
reword improve error message      ← edit commit message
drop   dead code                  ← remove commit
edit   log failed attempts        ← stop and edit
```

```text
pick  a3b9c2d feat: add login
squash f3b4e2a fix: login typo
```

---

## 8. git stash

Temporarily save uncommitted work without committing it.

### The Problem

```bash
# On feature branch, halfway through changes
git checkout main        # ❌ Error: uncommitted changes would be lost
```

### Stashing

```bash
# Save current work (tracked files)
git stash

# Save including untracked files
git stash -u

# Save WITH a message
git stash push -m "progress on login form"
```

### Viewing/Applying Stashes

```bash
# List stashes
git stash list
# stash@{0}: WIP on feature/login: a3b9c2d progress on login form
# stash@{1}: WIP on feature/login: 7d2a1f3 earlier work

# Restore the most recent stash (and remove it)
git stash pop

# Restore a specific stash
git stash apply stash@{2}

# Restore a specific stash AND remove it
git stash pop stash@{2}
```

### Deleting Stashes

```bash
# Delete one stash
git stash drop stash@{2}

# Delete all stashes
git stash clear
```

### stretch: stash then branch

```bash
# Common real-world flow:
git stash
git fetch origin
git checkout -b fix/critical origin/main
# ... fix the bug, commit, push ...
git checkout feature/login
git stash pop
```

---

## 9. Cherry-Picking

Apply a **specific commit** (from any branch) to your current branch.

```text
main:  A ── B ── C ── D
                     |
                     └── cherry-pick C
feature: A ── F └── C'
```

```bash
# Copy one commit from another branch
git cherry-pick a3b9c2d

# Copy multiple commits
git cherry-pick a3b9c2d f3b4e2a

# Don't auto-commit (so you can tweak)
git cherry-pick -n a3b9c2d
```

### When to Cherry-Pick

```text
✅ Hotfix to production (take one commit from main)
✅ Apply a fix from another feature branch
✅ Reuse a fix without merging the whole branch
```

---

## 10. Tags

Tags mark specific points in history (usually releases).

### Creating Tags

```bash
# Lightweight tag
git tag v1.0.0

# Annotated tag (with message — recommended)
git tag -a v1.0.0 -m "Release 1.0.0"

# Tag a specific commit
git tag -a v1.0.0 a3b9c2d
```

### Viewing Tags

```bash
git tag                # List tags
git tag -l "v1*"       # Filter
git show v1.0.0        # Show tag details
```

### Deleting Tags

```bash
git tag -d v1.0.0      # Local
git push origin :v1.0.0  # Remote (if pushed)
```

---

## 11. Complete Branching Workflow

```bash
# On main, start a feature
git switch main
git switch -c feature/dark-mode

# Work, commit, repeat
git add.
git commit -m "feat: add dark mode toggle"

# main got updated by teammate — bring it in
git switch main
git pull origin main
git switch feature/dark-mode
git merge main          # or git rebase main

# Resolve conflicts if any, then commit
git add .
git commit -m "merge: resolve dark-mode conflict"

# Finish: merge feature to main
git switch main
git merge feature/dark-mode
git branch -d feature/dark-mode
```

---

## Exercises

1. Create a repo, then create branches `feature/nav`, `fix/header`, and `chore/cleanup`.
2. Make different commits on two branches that modify the same file → cause a conflict → resolve it.
3. Use `git merge --no-ff` to force a merge commit and view it with `git log --graph`.
4. Use `git rebase` to place a feature branch on top of main. Verify with `git log --graph`.
5. Stash uncommitted changes, switch branches to do something, then `git stash pop`.

---

## Key Takeaways

- Branches isolate your work from main
- Merge combines history (creates a merge commit)
- Conflicts require manual resolution — read both sides carefully
- Rebase keeps history linear but rewrites hashes — local branches only
- Stash saves work-in-progress without committing
- Cherry-pick applies specific commits on demand
- Tags mark release points