# Week 4 Assignments

---

## Assignment 1: File-Based Note-Taking CLI

**Objective:** Build a command-line tool that manages notes stored in a JSON file using the `fs` module.

### Requirements

```text
node notes.js add "Buy groceries"
node notes.js add "Learn Node.js"
node notes.js list
node notes.js delete 1
```

### Expected Output

```text
$ node notes.js add "Buy groceries"
✓ Note added: "Buy groceries" (ID: 1)

$ node notes.js add "Learn Node.js"
✓ Note added: "Learn Node.js" (ID: 2)

$ node notes.js list
#1: Buy groceries
#2: Learn Node.js

$ node notes.js delete 1
✓ Note #1 deleted

$ node notes.js list
#2: Learn Node.js
```

### Implementation

```js
#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const NOTES_FILE = path.join(__dirname, "notes.json");

// Load notes from file
function loadNotes() {
  if (!fs.existsSync(NOTES_FILE)) {
    return [];
  }
  const data = fs.readFileSync(NOTES_FILE, "utf8");
  return JSON.parse(data);
}

// Save notes to file
function saveNotes(notes) {
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
}

// Add a note
function addNote(text) {
  const notes = loadNotes();
  const newNote = {
    id: notes.length + 1,
    text: text,
    createdAt: new Date().toISOString()
  };
  notes.push(newNote);
  saveNotes(notes);
  console.log(`✓ Note added: "${text}" (ID: ${newNote.id})`);
}

// List all notes
function listNotes() {
  const notes = loadNotes();
  if (notes.length === 0) {
    console.log("No notes found.");
    return;
  }
  notes.forEach(note => {
    console.log(`#${note.id}: ${note.text}`);
  });
}

// Delete a note
function deleteNote(id) {
  const notes = loadNotes();
  const filtered = notes.filter(note => note.id !== id);
  if (filtered.length === notes.length) {
    console.log(`✗ Note #${id} not found.`);
    return;
  }
  saveNotes(filtered);
  console.log(`✓ Note #${id} deleted`);
}

// Parse command-line arguments
const [,, command, ...args] = process.argv;
const text = args.join(" ");

switch (command) {
  case "add":
    if (!text) {
      console.log("Usage: notes.js add <text>");
      process.exit(1);
    }
    addNote(text);
    break;
  case "list":
    listNotes();
    break;
  case "delete":
    const id = parseInt(args[0]);
    if (isNaN(id)) {
      console.log("Usage: notes.js delete <id>");
      process.exit(1);
    }
    deleteNote(id);
    break;
  default:
    console.log("Usage: notes.js <add|list|delete> [args]");
}
```

### Submission

- File: `notes.js`
- Must persist data in `notes.json`
- Run with: `node notes.js <command> [args]`

---

## Assignment 2: Scaffold a Package with Linting & Formatting

**Objective:** Create a properly configured Node.js project with ESLint and Prettier.

### Steps

1. **Initialize the project**

```bash
mkdir my-package && cd my-package
npm init -y
```

2. **Configure package.json**

```json
{
  "name": "@yourname/my-package",
  "version": "1.0.0",
  "description": "A sample Node.js package",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [],
  "author": "",
  "license": "MIT"
}
```

3. **Install dev dependencies**

```bash
npm install -D eslint prettier nodemon
```

4. **Create .eslintrc.json**

```json
{
  "env": {
    "node": true,
    "es2021": true
  },
  "extends": ["eslint:recommended"],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "off",
    "eqeqeq": "error"
  }
}
```

5. **Create .prettierrc**

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

6. **Create .gitignore**

```text
node_modules/
.env
dist/
```

7. **Create src/index.js**

```js
console.log("Hello from my-package!");
```

8. **Verify everything works**

```bash
npm run lint
npm run format
npm start
```

### Expected File Structure

```
my-package/
├── src/
│   └── index.js
├── .eslintrc.json
├── .prettierrc
├── .gitignore
└── package.json
```

### Submission

- Complete project scaffold with all config files
- `npm run lint` passes with no errors
- `npm run format` runs successfully
- `npm start` prints the message

---

## Assignment 3: Directory Tree Walker

**Objective:** Build a utility that displays directory structure with file sizes.

### Usage

```bash
node tree.js ./src
```

### Expected Output

```text
📁 src/
├── 📁 components/
│   ├── Button.js        2.1 KB
│   ├── Header.js        1.5 KB
│   └── index.js         0.3 KB
├── 📁 utils/
│   └── helpers.js       1.2 KB
├── index.js             0.8 KB
└── styles.css           3.4 KB

Total: 5 files (9.3 KB)
Total: 2 directories
```

### Implementation

```js
#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function walkDirectory(dir, prefix = "") {
  let files = 0;
  let dirs = 0;
  let totalSize = 0;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // Sort: directories first, then files
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const childPrefix = isLast ? "    " : "│   ";

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      console.log(`${prefix}${connector}📁 ${entry.name}/`);
      const result = walkDirectory(fullPath, prefix + childPrefix);
      files += result.files;
      dirs += result.dirs + 1;
      totalSize += result.totalSize;
    } else {
      const stats = fs.statSync(fullPath);
      const size = formatSize(stats.size);
      console.log(`${prefix}${connector}${entry.name.padEnd(20)} ${size}`);
      files++;
      totalSize += stats.size;
    }
  });

  return { files, dirs, totalSize };
}

// Main
const targetDir = process.argv[2] || ".";

if (!fs.existsSync(targetDir)) {
  console.error(`Directory not found: ${targetDir}`);
  process.exit(1);
}

console.log(`📁 ${path.basename(targetDir) || targetDir}/`);
const result = walkDirectory(targetDir);

console.log("");
console.log(`Total: ${result.files} files (${formatSize(result.totalSize)})`);
console.log(`Total: ${result.dirs} directories`);
```

### Features to Add

1. **Max depth:** Limit how deep the tree goes

```bash
node tree.js ./src --depth=2
```

2. **Ignore patterns:** Skip certain files/folders

```bash
node tree.js ./src --ignore=node_modules,.git
```

3. **Human-readable sizes:** Convert bytes to KB/MB

### Submission

- File: `tree.js`
- Must display file sizes
- Must handle nested directories
- Run with: `node tree.js <directory>`

---

## Grading Criteria

| Criteria | Points |
|----------|--------|
| Correctness (runs without errors) | 35% |
| Proper use of fs module | 25% |
| Error handling | 20% |
| Code quality and readability | 10% |
| Console output clarity | 10% |

---

## Tips

1. Start with the simplest version, then add features
2. Use `fs.existsSync()` before reading files
3. Use `path.join()` for cross-platform paths
4. Test with both small and large directories
5. Handle edge cases: empty directories, missing files
