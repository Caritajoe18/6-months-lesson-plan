# Day 2 — npm, package.json, Dependencies & Scripts

**Previous:** [Day 1 — Node.js Introduction](day-1-node-introduction.md)
**Next:** [Day 3 — Modules & Tooling](day-3-modules-tooling.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Create and configure `package.json`
- Install and manage dependencies with npm
- Understand the difference between dependencies and devDependencies
- Write npm scripts for common tasks
- Use `npx` to run packages without installing
- Understand semantic versioning (semver)

---

## 1. What Is npm?

npm stands for **Node Package Manager**. It's the default package manager for Node.js.

```text
npm does three things:
1. Manages packages (install, update, remove)
2. Manages project configuration (package.json)
3. Runs scripts (build, test, lint)
```

### npm Registry

The npm registry is a public database of JavaScript packages:

```text
https://www.npmjs.com/
- 2 million+ packages
- Express, Lodash, React, etc.
- Most are open source
```

---

## 2. package.json

The `package.json` file is the heart of any Node.js project.

### Creating package.json

```bash
# Interactive — answers questions
npm init

# Use defaults — no questions
npm init -y
```

### package.json Structure

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "A sample Node.js project",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest",
    "lint": "eslint ."
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.4.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.2",
    "eslint": "^8.47.0"
  },
  "keywords": ["node", "api"],
  "author": "Ada Lovelace",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Key Fields

| Field | Purpose |
|-------|---------|
| `name` | Package name (lowercase, no spaces) |
| `version` | Current version (semver) |
| `description` | What the project does |
| `main` | Entry point file |
| `scripts` | Command shortcuts |
| `dependencies` | Production packages |
| `devDependencies` | Development-only packages |
| `engines` | Required Node.js version |

---

## 3. Installing Packages

### Production Dependencies

```bash
# Install and add to dependencies
npm install express

# Install specific version
npm install express@4.18.2

# Install and save to dependencies
npm install express --save
```

### Development Dependencies

```bash
# Install and add to devDependencies
npm install nodemon --save-dev

# Short form
npm install jest -D
```

### Install All Dependencies

```bash
# Install everything from package.json
npm install

# Short form
npm i
```

### What Happens During Install

```text
npm install express
    ↓
npm downloads express from registry
    ↓
Creates node_modules/ folder
    ↓
Downloads express's dependencies
    ↓
Updates package.json
    ↓
Updates package-lock.json
```

---

## 4. dependencies vs devDependencies

### dependencies

Packages needed to **run** the application in production.

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.4.0",
    "dotenv": "^16.3.1",
    "bcrypt": "^5.1.0"
  }
}
```

```text
Used in production:
- Web frameworks (Express)
- Database drivers (Mongoose)
- Utilities (lodash, dotenv)
- Authentication (bcrypt, jsonwebtoken)
```

### devDependencies

Packages needed only for **development**.

```json
{
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.2",
    "eslint": "^8.47.0",
    "prettier": "^3.0.1",
    "typescript": "^5.1.6"
  }
}
```

```text
Used in development only:
- Testing frameworks (jest, mocha)
- Linters (eslint, prettier)
- Build tools (typescript, webpack)
- Dev servers (nodemon)
```

### When to Use Which

| Use Case | Type |
|----------|------|
| Runs on the server | dependencies |
| Only on developer machines | devDependencies |
| Runs in CI/CD | devDependencies |
| Required for deployment | dependencies |

---

## 5. Removing Packages

```bash
# Remove from dependencies
npm uninstall express

# Remove from devDependencies
npm uninstall jest --save-dev

# Remove globally
npm uninstall -g nodemon
```

---

## 6. npm Scripts

Scripts are custom commands defined in `package.json`.

### Basic Scripts

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "build": "tsc",
    "test": "jest",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

### Running Scripts

```bash
# Run a script
npm run start

# Special scripts (no "run" needed)
npm start
npm test
npm run dev
```

### Script Lifecycle

```text
npm install lifecycle:
preinstall → install → postinstall

npm start lifecycle:
prestart → start → poststart

npm test lifecycle:
pretest → test → posttest
```

### Common Script Patterns

```json
{
  "scripts": {
    "dev": "nodemon --exec tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src/ --ext .ts",
    "lint:fix": "eslint src/ --ext .ts --fix",
    "format": "prettier --write 'src/**/*.ts'",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist",
    "rebuild": "npm run clean && npm run build",
    "prepare": "npm run build"
  }
}
```

### Running Multiple Scripts

```bash
# Sequential (bash)
npm run clean && npm run build

# Using npm-run-all
npm run clean && npm run lint && npm run build
```

---

## 7. npx — Node Package Execute

`npx` runs packages **without installing** them globally.

```bash
# Run a package without installing
npx create-react-app my-app
npx ts-node script.ts
npx eslint .

# Run a locally installed package
npx jest
npx tsc
```

### npx vs npm install -g

| Aspect | npx | npm install -g |
|--------|-----|----------------|
| Install | Temporary | Permanent |
| Disk space | No clutter | Uses space |
| Version | Always latest | Fixed version |
| Cleanup | Auto-cleanup | Manual cleanup |

### When to Use npx

```bash
# Create new projects
npx create-next-app my-app
npx create-express-app my-api

# Run tools once
npx eslint .
npx prettier --check .

# Run specific version
npx eslint@8.47.0 .
```

---

## 8. Semantic Versioning (semver)

Version numbers follow the pattern: `MAJOR.MINOR.PATCH`

```text
1.4.2
│ │ │
│ │ └── PATCH: Bug fixes (1.4.1 → 1.4.2)
│ └──── MINOR: New features (1.4.2 → 1.5.0)
└────── MAJOR: Breaking changes (1.5.0 → 2.0.0)
```

### Version Ranges in package.json

```json
{
  "dependencies": {
    "express": "^4.18.2",    // Compatible with 4.18.2
    "lodash": "~4.17.21",   // Patch updates only
    "react": "18.2.0",      // Exact version
    "jest": ">=29.0.0"      // Any version 29+
  }
}
```

### Range Symbols

| Symbol | Meaning | Example | Accepts |
|--------|---------|---------|---------|
| `^` | Compatible with | `^4.18.2` | 4.18.2 - 4.x.x |
| `~` | Patch updates | `~4.18.2` | 4.18.2 - 4.18.x |
| (none) | Exact version | `4.18.2` | 4.18.2 only |
| `>=` | Minimum version | `>=4.18.2` | 4.18.2+ |
| `*` | Any version | `*` | Everything |

### caret (^) vs tilde (~)

```text
^4.18.2  →  Accepts 4.18.3, 4.19.0, 4.99.99
           Does NOT accept 5.0.0

~4.18.2  →  Accepts 4.18.3, 4.18.99
           Does NOT accept 4.19.0 or 5.0.0
```

---

## 9. package-lock.json

Locks exact versions for reproducible installs.

```text
package.json       →  "express": "^4.18.2" (flexible)
package-lock.json  →  "express": "4.18.2"  (exact)
```

### Why package-lock.json?

```text
Without lock file:
  Monday:    npm install → gets 4.18.2
  Wednesday: npm install → gets 4.18.3 (bug introduced!)
  Friday:    npm install → gets 4.18.4 (fixed)

With lock file:
  Monday:    npm install → gets 4.18.2
  Wednesday: npm install → gets 4.18.2 (same version!)
  Friday:    npm update  → gets 4.18.4 (intentional update)
```

### Should You Commit It?

```text
✅ YES — Always commit package-lock.json
✅ YES — Ensures team uses same versions
❌ NO  — Don't commit node_modules/
```

---

## 10. Useful npm Commands

```bash
# List outdated packages
npm outdated

# Update all packages
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Run a script
npm run scriptname

# View package info
npm view express

# List globally installed packages
npm list -g

# Search for packages
npm search express
```

---

## Exercises

1. Create a new project with `npm init -y` and customize the `package.json`.
2. Install Express as a dependency and nodemon as a devDependency.
3. Write npm scripts for `start`, `dev`, and `build`.
4. Use `npx` to run ESLint without installing it globally.
5. Explain the difference between `^4.18.0` and `~4.18.0`.

---

## Key Takeaways

- `package.json` is the project manifest
- `dependencies` are for production, `devDependencies` are for development
- `npm run` executes scripts defined in `package.json`
- `npx` runs packages without global installation
- `package-lock.json` ensures reproducible installs
- `^` allows minor updates, `~` allows only patch updates
- Always commit `package-lock.json`, never commit `node_modules/`
