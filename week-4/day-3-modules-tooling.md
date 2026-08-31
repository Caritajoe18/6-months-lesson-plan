# Day 3 — CommonJS vs ESM, Node Inspector & Environment Variables

**Previous:** [Day 2 — npm & Package Management](day-2-npm-package-management.md)
**Next:** [Assignments](assignments.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Understand the difference between CommonJS and ES Modules
- Use `require()` and `import/export` correctly
- Debug Node.js applications with `node --inspect`
- Manage environment variables with `.env` files

---

## 1. Module Systems

JavaScript has two ways to share code between files.

```text
CommonJS (CJS)          ES Modules (ESM)
──────────────          ────────────────
require() / exports     import / export
Node.js default         Modern standard
Synchronous             Asynchronous
File-based              Static analysis
```

---

## 2. CommonJS (CJS)

The original module system in Node.js.

### Exporting

```js
// math.js
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

// Export individual items
module.exports.add = add;
module.exports.subtract = subtract;

// OR export an object
module.exports = { add, subtract };
```

### Importing

```js
// app.js
const math = require("./math");

console.log(math.add(2, 3));       // 5
console.log(math.subtract(10, 4)); // 6

// Destructure
const { add, subtract } = require("./math");
console.log(add(2, 3)); // 5
```

### CommonJS Behavior

```js
// Synchronous — files load in order
const fs = require("fs");         // Core module
const lodash = require("lodash"); // npm package
const utils = require("./utils"); // Local file
```

---

## 3. ES Modules (ESM)

The modern standard for JavaScript modules.

### Exporting

```js
// math.js
export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}

// Named export
export const PI = 3.14159;

// Default export
export default class Calculator {
  // ...
}
```

### Importing

```js
// app.js
import { add, subtract, PI } from "./math.js";
import Calculator from "./math.js";

console.log(add(2, 3)); // 5

// Import all
import * as math from "./math.js";
console.log.math.add(2, 3);
```

### ESM Requires .js Extension

```js
// ❌ Wrong — ESM requires full path
import { add } from "./math";

// ✅ Correct — include .js extension
import { add } from "./math.js";
```

---

## 4. How to Use ESM in Node.js

### Option 1: package.json "type" field

```json
{
  "name": "my-project",
  "type": "module",
  "main": "index.js"
}
```

```js
// Now all .js files use ESM
import express from "express";
import fs from "fs/promises";
```

### Option 2: .mjs File Extension

```js
// math.mjs
export function add(a, b) {
  return a + b;
}
```

```js
// app.mjs
import { add } from "./math.mjs";
```

---

## 5. CommonJS vs ESM Comparison

### Side-by-Side

```js
// CommonJS                    // ESM
// ─────────                   // ───
const fs = require("fs");     import fs from "fs";
const { join } = require("path"); import { join } from "path";

module.exports = func;        export default func;
module.exports.name = val;    export const name = val;
```

### Key Differences

| Feature | CommonJS | ESM |
|---------|----------|-----|
| Syntax | `require()` / `module.exports` | `import` / `export` |
| Loading | Synchronous | Asynchronous |
| Extension | `.js` (default) | `.mjs` or `"type": "module"` |
| Dynamic import | `require()` | `import()` |
| Top-level await | No | Yes |
| Conditional import | Yes | Limited |

### When to Use Which

```text
Use CommonJS when:
- Working with older Node.js projects
- Using packages that don't support ESM
- Need dynamic require()

Use ESM when:
- Starting new projects
- Using modern tooling (Vite, TypeScript)
- Want better tree-shaking
```

---

## 6. Dynamic Imports

Import modules at runtime with `import()`.

```js
// Dynamic import (works in both CJS and ESM)
async function loadModule() {
  const module = await import("./math.js");
  console.log(module.add(2, 3));
}

// Conditional import
async function loadPlatformModule() {
  if (process.platform === "win32") {
    return import("./windows-module.js");
  } else {
    return import("./unix-module.js");
  }
}
```

---

## 7. Node.js Inspector (Debugger)

Debug Node.js applications like browser DevTools.

### Starting the Debugger

```bash
# Start with inspector
node --inspect app.js

# Start and pause on first line
node --inspect-brk app.js

# Custom port (default: 9229)
node --inspect=1234 app.js
```

### Connecting Chrome DevTools

1. Run: `node --inspect app.js`
2. Open Chrome: `chrome://inspect`
3. Click "Inspect" on your Node.js target
4. Use DevTools as usual

### VS Code Debugger

1. Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Node.js",
      "program": "${workspaceFolder}/app.js",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

2. Press F5 or click Run → Start Debugging

### Debug Commands

| Command | Action |
|---------|--------|
| `F5` | Continue |
| `F10` | Step over |
| `F11` | Step into |
| `Shift+F11` | Step out |
| `F9` | Toggle breakpoint |

### Programmatic Debugger

```js
// app.js
function calculateTotal(items) {
  debugger; // Execution pauses here when inspector is active
  return items.reduce((sum, item) => sum + item.price, 0);
}

const items = [
  { name: "Laptop", price: 999 },
  { name: "Phone", price: 699 }
];

console.log("Total:", calculateTotal(items));
```

---

## 8. Environment Variables

Configuration values that change per environment.

### Why Environment Variables?

```text
❌ Hardcoded:
  const DB_URL = "mongodb://localhost:27017/mydb";
  const API_KEY = "abc123secret";

✅ Environment variables:
  const DB_URL = process.env.DATABASE_URL;
  const API_KEY = process.env.API_KEY;
```

### Setting Environment Variables

```bash
# One-time (inline)
DATABASE_URL=mongodb://localhost:27017/mydb node app.js

# Temporary (session)
export DATABASE_URL=mongodb://localhost:27017/mydb
node app.js

# Permanent (shell profile)
echo 'export DATABASE_URL="mongodb://..."' >> ~/.zshrc
```

### Using Environment Variables

```js
// Access environment variables
const dbUrl = process.env.DATABASE_URL;
const apiKey = process.env.API_KEY;

// Default values
const port = process.env.PORT || 3000;
const env = process.env.NODE_ENV || "development";
```

### Common Environment Variables

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | Environment mode (development/production) |
| `PORT` | Server port number |
| `DATABASE_URL` | Database connection string |
| `API_KEY` | External API key |
| `SECRET` | JWT/session secret |

---

## 9. The dotenv Package

Load `.env` files automatically.

### Installation

```bash
npm install dotenv
```

### Creating .env File

```env
# .env (DO NOT commit this file)
PORT=3000
DATABASE_URL=mongodb://localhost:27017/mydb
API_KEY=your-secret-api-key
NODE_ENV=development
```

### Using dotenv

```js
// index.js
require("dotenv").config();

// OR with ESM
import "dotenv/config";

// Now access variables
const port = process.env.PORT;
const dbUrl = process.env.DATABASE_URL;
```

### .env File Rules

```text
✅ DO:
- Add .env to .gitignore
- Use .env.example for documentation
- Use uppercase for variable names
- Quote values with spaces

❌ DON'T:
- Commit .env to version control
- Put secrets in code
- Use spaces around = (in some tools)
- Put quotes around values
```

### .env.example

```env
# .env.example (COMMIT this file)
# Copy to .env and fill in values
PORT=3000
DATABASE_URL=mongodb://localhost:27017/mydb
API_KEY=your-api-key-here
```

### .gitignore

```gitignore
# .gitignore
.env
node_modules/
```

---

## 10. process.env Summary

```js
// Read
const value = process.env.KEY;

// Set
process.env.KEY = "value";

// Delete
delete process.env.KEY;

// List all
console.log(process.env);
```

---

## 11. Putting It All Together

### Project Setup

```bash
# Initialize project
mkdir my-project && cd my-project
npm init -y

# Install dependencies
npm install express dotenv

# Install dev dependencies
npm install -D nodemon

# Create structure
mkdir src
touch src/index.js .env .env.example .gitignore package.json
```

### package.json Scripts

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "debug": "node --inspect src/index.js"
  }
}
```

### .env

```env
PORT=3000
NODE_ENV=development
```

### src/index.js

```js
require("dotenv").config();

const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || "development";

app.get("/", (req, res) => {
  res.json({
    message: "Hello!",
    environment: ENV,
    port: PORT
  });
});

app.listen(PORT, () => {
  console.log(`Server running in ${ENV} mode on port ${PORT}`);
});
```

---

## Exercises

1. Convert a CommonJS file to ESM and vice versa.
2. Use `node --inspect` to debug a function with Chrome DevTools.
3. Create a `.env` file with 3 variables and load them with dotenv.
4. Write a script that displays all environment variables matching a prefix (e.g., `DB_`).
5. Create a `.env.example` file documenting required environment variables.

---

## Key Takeaways

- CommonJS uses `require()` / `module.exports` (Node.js default)
- ESM uses `import` / `export` (modern standard)
- Use `"type": "module"` or `.mjs` for ESM in Node.js
- `node --inspect` enables Chrome DevTools debugging
- `.env` files store configuration (never commit!)
- Use `process.env` to access environment variables
- Always add `.env` to `.gitignore`
