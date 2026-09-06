# Week 5: Git & GitHub — Beginner to Advanced

## Overview

Master version control from the fundamentals of `git init` and commits through to team collaboration: branching, merging, conflict resolution, pull requests, and open-source workflows. The week culminates in a paired collaboration project where students build a shared CLI together via PRs on GitHub.

---

## Day 1 (Theory): Git Basics
- What version control is and why Git is the industry standard
- Git vs. GitHub
- The three states: modified → staged → committed
- First-time configuration (`git config` identity)
- `git init`, `git status`, `git add`, `git commit`
- Conventional commit messages (`feat:`, `fix:`, `docs:`)
- Viewing history with `git log`, `git diff`, `git show`
- `.gitignore` — never commit `node_modules/` or `.env`
- Undoing changes: `git restore`, `git reset`, `git commit --amend`

## Day 2 (Theory): Branching, Merging & Conflicts
- What branches are and why to use them
- `git branch`, `git checkout` / `git switch`
- Merging: fast-forward vs. three-way merge commits
- Merge conflicts — how to read markers and resolve them
- `git rebase` (linear history) vs. merge, and when each is safe
- Interactive rebase: `pick`, `squash`, `reword`, `fixup`
- `git stash` — saving work-in-progress
- Cherry-picking specific commits
- Tags and releases

## Day 3 (Hands-on): GitHub & Collaboration
- Creating a repo on GitHub, connecting remotes (`origin`)
- HTTPS vs. SSH authentication
- `git push`, `git pull`, `git fetch` (and `pull --rebase`)
- Collaborator model vs. fork & PR (open source) model
- Pull requests: writing good descriptions, reviewing, squash/merge/rebase merge
- Branch protection rules
- Issues, labels, and linking issues to commits
- README best practices
- GitHub Actions (CI) basics
- Releases & versioning

---

## Assignments

1. **Version-Controlled Project Setup** — init a repo, configure identity, `.gitignore`, 4+ conventional commits, practice undo/amend/reset
2. **Branching & Conflict Resolution** — feature branch workflow, force a merge conflict and resolve it, rebase for linear history, stash for emergency hotfixes
3. **GitHub Collaboration & PRs** — push to GitHub, open and squash-merge a PR, fork/sync with `upstream`, delete remote branches

---

## Project: Collaborative "Team Notes" CLI

Working in pairs, build a shared Node.js CLI tool through the full team Git workflow:

- Agree on a module contract, then work on parallel feature branches
- Own separate files/modules (notes vs. todos) so merge conflicts are inevitable
- Review each other's PRs and resolve conflicts together
- Tag a `v1.0.0` release with GitHub Release notes
- Hotfix drill: `git stash` interrupted work, handle emergency, cherry-pick the fix

**Deliverables:** repo URL, PR URLs, network graph, conflict-resolution evidence, release.

**Key grade checks:** no direct pushes to main, conventional commit messages, clean history, repo hygiene (no `node_modules/`, no `.env`).

---

## Skills Acquired

- Confident daily Git workflow (`status`/`add`/`commit`/`push`/`pull`)
- Branch-based feature development
- Merge conflict resolution
- Code review and pull requests
- Open-source contribution flow (fork, upstream, PR back)
- Repo hygiene, .gitignore, and secret protection