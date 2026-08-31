# Day 1 — Node.js Introduction, Global Objects, Process & Core Modules

**Next:** [Day 2 — npm & Package Management](day-2-npm-package-management.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Explain what Node.js is and why it exists
- Use the Node.js REPL for quick experiments
- Access and use global objects (`global`, `process`, `console`, `Buffer`)
- Read and use core modules (`fs`, `path`, `os`)
- Understand the Node.js runtime architecture

---

## 1. What Is Node.js?

Node.js is a **JavaScript runtime** built on Chrome's V8 engine. It lets you run JavaScript **outside the browser**.

```text
Browser JavaScript              Node.js JavaScript
──────────────────              ───────────────────
Runs in browser                 Runs on your computer/server
Accesses DOM                    Accesses file system
No file system access           Reads/writes files
No network (fetch only)         Full network access (TCP, HTTP)
Uses browser APIs               Uses OS APIs
```

### Why Node.js?

```text
Before Node:
  JavaScript = browser only
  Server = Java, PHP, Python, Ruby

After Node:
  JavaScript = browser AND server
  One language for everything
```

### Node.js Architecture

```text
┌─────────────────────────────────────┐
│           Your JavaScript Code       │
├─────────────────────────────────────┤
│           Node.js APIs              │
│     (fs, http, path, os, etc.)      │
├─────────────────────────────────────┤
│           V8 Engine                 │
│     (Chrome's JavaScript engine)    │
├─────────────────────────────────────┤
│           libuv                     │
│   (Event loop, async I/O, threads)  │
├─────────────────────────────────────┤
│           Operating System          │
└─────────────────────────────────────┘
```

---

## 2. The Node.js REPL

REPL stands for **Read-Eval-Print Loop**. It's an interactive JavaScript console.

### Starting the REPL

```bash
# Start Node REPL
node
```

```text
Welcome to Node.js v20.11.0.
Type ".help" for more options.
>
```

### Using the REPL

```js
> 2 + 2
4

> "Hello, " + "Node!"
'Hello, Node!'

> const x = 10
undefined

> x * 2
20

> function greet(name) { return `Hello, ${name}!`; }
undefined

> greet("Ada")
'Hello, Ada!'
```

### REPL Commands

| Command | Action |
|---------|--------|
| `.help` | Show help |
| `.exit` | Exit REPL |
| `.clear` | Clear current context |
| `.save filename` | Save history to file |
| `.load filename` | Load file into REPL |
| `Ctrl+C` | Cancel current input |
| `Ctrl+C` (twice) | Exit REPL |
| `Ctrl+D` | Exit REPL |

### When to Use the REPL

```text
Quick math              → node -e "console.log(2**10)"
Test a function         → node (then type function)
Debug a snippet         → node (then paste code)
Check module behavior   → node (then require module)
```

---

## 3. Global Objects

In browsers, the global object is `window`. In Node.js, it's `global`.

### global

```js
// These are available everywhere in Node.js
global.myValue = 42;

console.log(myValue);     // 42
console.log(global.myValue); // 42
```

### Common Globals

| Global | Purpose |
|--------|---------|
| `global` | The global object |
| `console` | Logging output |
| `process` | Current process info |
| `Buffer` | Binary data handling |
| `setTimeout` / `setInterval` | Timers |
| `queueMicrotask` | Microtask scheduling |
| `__dirname` | Current file directory (CommonJS) |
| `__filename` | Current file path (CommonJS) |
| `require` | Module loader (CommonJS) |
| `module` | Current module (CommonJS) |
| `exports` | Module exports (CommonJS) |

---

## 4. The process Object

`process` gives you information about and control over the current Node.js process.

### Process Information

```js
console.log("Platform:", process.platform);      // "darwin", "linux", "win32"
console.log("Architecture:", process.arch);      // "x64", "arm64"
console.log("Node version:", process.version);   // "v20.11.0"
console.log("PID:", process.pid);                // e.g., 12345
console.log("Uptime:", process.uptime(), "sec"); // e.g., 45.23
```

### Memory Usage

```js
const memory = process.memoryUsage();

console.log("RSS:", Math.round(memory.rss / 1024 / 1024), "MB");
console.log("Heap Used:", Math.round(memory.heapUsed / 1024 / 1024), "MB");
console.log("Heap Total:", Math.round(memory.heapTotal / 1024 / 1024), "MB");
```

### Command-Line Arguments

```js
// Run: node app.js arg1 arg2 arg3
console.log(process.argv);
// [
//   '/usr/local/bin/node',  // Node executable
//   '/path/to/app.js',      // Script path
//   'arg1',                 // Your arguments
//   'arg2',
//   'arg3'
// ]

// Get only your arguments
const args = process.argv.slice(2);
console.log(args); // ['arg1', 'arg2', 'arg3']
```

### Environment Variables

```js
console.log(process.env.HOME);       // "/Users/yourname"
console.log(process.env.PATH);       // System PATH
console.log(process.env.NODE_ENV);   // "development" (if set)

// Set environment variable
process.env.NODE_ENV = "production";
```

### process.exit()

```js
console.log("Starting...");

process.exit(0); // Success (code 0)
process.exit(1); // Failure (code 1)
```

### process.on() — Event Listeners

```js
// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

// Handle termination signals
process.on("SIGINT", () => {
  console.log("Received Ctrl+C");
  process.exit(0);
});
```

---

## 5. The Buffer Class

Buffers handle binary data in Node.js.

### Creating Buffers

```js
// From string
const buf1 = Buffer.from("Hello, Node!");
console.log(buf1);          // <Buffer 48 65 6c 6c 6F ...>
console.log(buf1.toString()); // "Hello, Node!"

// From array
const buf2 = Buffer.from([72, 101, 108, 108, 111]);
console.log(buf2.toString()); // "Hello"

// Empty buffer of size 10
const buf3 = Buffer.alloc(10);
console.log(buf3); // <Buffer 00 00 00 00 00 00 00 00 00 00>
```

### When to Use Buffers

```text
Reading binary files (images, PDFs)
Network operations
Encoding/decoding data
Cryptographic operations
```

---

## 6. Core Modules

Node.js ships with built-in modules. No installation needed.

### Importing Core Modules

```js
// CommonJS
const fs = require("fs");
const path = require("path");
const os = require("os");

// ESM
import fs from "fs";
import path from "path";
import os from "os";
```

---

## 7. The fs Module (File System)

Read, write, and manipulate files.

### Reading Files

```js
const fs = require("fs");

// Synchronous (blocking)
const data = fs.readFileSync("file.txt", "utf8");
console.log(data);

// Asynchronous (non-blocking)
fs.readFile("file.txt", "utf8", (err, data) => {
  if (err) {
    console.error("Error:", err.message);
    return;
  }
  console.log(data);
});

// Promise-based
const fsPromises = require("fs").promises;
async function readFile() {
  const data = await fsPromises.readFile("file.txt", "utf8");
  console.log(data);
}
```

### Writing Files

```js
// Synchronous
fs.writeFileSync("output.txt", "Hello, World!");

// Asynchronous
fs.writeFile("output.txt", "Hello, World!", (err) => {
  if (err) throw err;
  console.log("File written!");
});

// Append to file
fs.appendFileSync("log.txt", "New line\n");

// Promise-based
await fsPromises.writeFile("output.txt", "Hello!");
```

### Working with Directories

```js
// Create directory
fs.mkdirSync("new-folder");

// Create nested directories
fs.mkdirSync("path/to/folder", { recursive: true });

// Read directory contents
const files = fs.readdirSync(".");
console.log(files); // ["file1.txt", "file2.js", ...]

// Check if file/directory exists
if (fs.existsSync("file.txt")) {
  console.log("File exists!");
}

// Delete file
fs.unlinkSync("file.txt");

// Delete directory
fs.rmSync("folder", { recursive: true });
```

### File Information

```js
const stats = fs.statSync("file.txt");

console.log("Size:", stats.size, "bytes");
console.log("Created:", stats.birthtime);
console.log("Modified:", stats.mtime);
console.log("Is file:", stats.isFile());
console.log("Is directory:", stats.isDirectory());
```

---

## 8. The path Module

Work with file and directory paths across operating systems.

### Joining Paths

```js
const path = require("path");

// Join path segments
const fullPath = path.join("/Users", "ada", "documents", "file.txt");
console.log(fullPath); // "/Users/ada/documents/file.txt"

// Current directory
console.log(__dirname);
console.log(path.join(__dirname, "file.txt"));
```

### Resolving Paths

```js
// Resolve to absolute path
const absolute = path.resolve("file.txt");
console.log(absolute); // "/current/working/directory/file.txt"

// Relative path between two locations
const relative = path.relative("/Users/ada", "/Users/ada/documents/file.txt");
console.log(relative); // "documents/file.txt"
```

### Path Properties

```js
const filePath = "/Users/ada/documents/file.txt";

console.log("Basename:", path.basename(filePath));     // "file.txt"
console.log("Dirname:", path.dirname(filePath));       // "/Users/ada/documents"
console.log("Extname:", path.extname(filePath));       // ".txt"
console.log("Parse:", path.parse(filePath));
// {
//   root: '/',
//   dir: '/Users/ada/documents',
//   base: 'file.txt',
//   ext: '.txt',
//   name: 'file'
// }
```

### Cross-Platform Paths

```js
// ❌ Bad — platform-specific
const bad = "/Users/ada/file.txt"; // Won't work on Windows

// ✅ Good — uses path.join
const good = path.join("Users", "ada", "file.txt"); // Works everywhere
```

---

## 9. The os Module

Get operating system information.

```js
const os = require("os");

console.log("Platform:", os.platform());    // "darwin", "linux", "win32"
console.log("Architecture:", os.arch());    // "x64", "arm64"
console.log("Hostname:", os.hostname());    // "Adas-MacBook-Pro"
console.log("Uptime:", os.uptime(), "sec"); // e.g., 86400

// CPU info
const cpus = os.cpus();
console.log("CPU cores:", cpus.length);
console.log("CPU model:", cpus[0].model);

// Memory
const totalMem = os.totalmem();
const freeMem = os.freemem();
console.log("Total RAM:", Math.round(totalMem / 1024 / 1024 / 1024), "GB");
console.log("Free RAM:", Math.round(freeMem / 1024 / 1024 / 1024), "GB");

// User info
const user = os.userInfo();
console.log("Username:", user.username);
console.log("Home dir:", user.homedir);
```

---

## 10. Running Node.js Scripts

### Basic Execution

```bash
# Run a file
node app.js

# Run with arguments
node app.js arg1 arg2

# Evaluate inline code
node -e "console.log('Hello!')"

# Check Node version
node --version
```

### Shebang (Unix)

```js
#!/usr/bin/env node

// This file can be executed directly
console.log("Running as a script!");
```

```bash
# Make executable
chmod +x app.js

# Run directly
./app.js
```

---

## Exercises

1. Start the Node REPL and calculate the factorial of 20.
2. Use `process.argv` to create a script that greets a user by name: `node greet.js Ada` → "Hello, Ada!"
3. Write a script that reads a file and prints its contents in uppercase.
4. Use `os` module to display your system's CPU count, total RAM, and platform.
5. Create a directory structure using `fs.mkdirSync` with `{ recursive: true }`.

---

## Key Takeaways

- Node.js brings JavaScript to the server
- The REPL is great for quick experiments
- `process` gives access to arguments, environment, and system info
- `fs` reads/writes files (use `.promises` for async/await)
- `path` handles cross-platform file paths
- `os` provides system information
- Always use `path.join()` instead of string concatenation for paths
