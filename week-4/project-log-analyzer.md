# Project: Log-File Analyzer CLI

## Objective

Build a command-line tool that parses, aggregates, and reports errors and trends from log files. This project combines all Week 4 concepts: `fs` module, `path` module, `process` arguments, and `package.json` configuration.

---

## Problem Statement

You are a DevOps engineer investigating a production issue. You have multiple log files and need to quickly:

1. Count errors and warnings
2. Find the most common error types
3. Identify time-based trends
4. Generate a summary report

---

## Sample Log Format

```text
2026-08-17T10:30:00.000Z [INFO] Server started on port 3000
2026-08-17T10:30:05.123Z [INFO] User logged in: ada@example.com
2026-08-17T10:30:10.456Z [WARN] Slow query detected: 2500ms
2026-08-17T10:30:15.789Z [ERROR] Database connection failed: timeout
2026-08-17T10:30:20.012Z [INFO] Retrying connection...
2026-08-17T10:30:25.345Z [ERROR] Authentication failed for user: john@example.com
2026-08-17T10:30:30.678Z [INFO] Connection restored
```

---

## Features

### 1. Parse Log Files

```js
function parseLogLine(line) {
  // Parse: timestamp [LEVEL] message
  const match = line.match(/^(\S+)\s+\[(\w+)\]\s+(.+)$/);

  if (!match) return null;

  return {
    timestamp: new Date(match[1]),
    level: match[2],
    message: match[3]
  };
}
```

### 2. Count by Level

```bash
node analyze.js count ./logs/

# Output:
=== Log Level Counts ===
INFO:    1,234 (70%)
WARN:      345 (20%)
ERROR:     123  (7%)
DEBUG:      56  (3%)
Total:  1,758 entries
```

### 3. Find Errors

```bash
node analyze.js errors ./logs/

# Output:
=== Errors Found ===

1. [2026-08-17 10:30:15] Database connection failed: timeout
2. [2026-08-17 10:30:25] Authentication failed for user: john@example.com
3. [2026-08-17 10:31:02] Memory limit exceeded: 512MB

Total: 3 errors found
```

### 4. Top Errors

```bash
node analyze.js top-errors ./logs/

# Output:
=== Most Common Errors ===
1. Database connection failed: timeout          (45 times)
2. Authentication failed for user: ...          (23 times)
3. Memory limit exceeded: 512MB                 (12 times)
4. Rate limit exceeded                          (8 times)
5. File not found: /uploads/...                 (5 times)
```

### 5. Time-Based Analysis

```bash
node analyze.js timeline ./logs/

# Output:
=== Errors by Hour ===
10:00  ████████████  12
11:00  ████████       8
12:00  ████           4
13:00  ████████████████████  20
14:00  ██████         6

Peak error time: 13:00 (20 errors)
```

### 6. Summary Report

```bash
node analyze.js report ./logs/

# Output:
====================================
      LOG ANALYSIS REPORT
====================================
File: ./logs/app.log
Period: 2026-08-17 to 2026-08-18
Total entries: 1,758

Level Breakdown:
  INFO:    1,234 (70%)
  WARN:      345 (20%)
  ERROR:     123  (7%)

Top Errors:
  1. Database connection failed (45x)
  2. Authentication failed (23x)
  3. Memory limit exceeded (12x)

Peak Error Hour: 13:00
Status: ⚠️  HIGH ERROR RATE
====================================
```

---

## Implementation

### Project Structure

```
log-analyzer/
├── src/
│   ├── parser.js         # Parse log lines
│   ├── analyzer.js       # Analysis functions
│   ├── reporter.js       # Report generation
│   └── cli.js            # CLI interface
├── logs/
│   ├── app.log           # Sample log file
│   └── error.log         # Sample error log
├── index.js              # Entry point
├── package.json
└── README.md
```

### package.json

```json
{
  "name": "log-analyzer",
  "version": "1.0.0",
  "description": "CLI tool for analyzing log files",
  "main": "index.js",
  "bin": {
    "analyze": "./index.js"
  },
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js",
    "test": "echo \"No tests yet\""
  },
  "keywords": ["logs", "cli", "analyzer"],
  "author": "",
  "license": "MIT"
}
```

### src/parser.js

```js
function parseLogLine(line) {
  const match = line.match(/^(\S+)\s+\[(\w+)\]\s+(.+)$/);

  if (!match) return null;

  return {
    timestamp: new Date(match[1]),
    level: match[2].toUpperCase(),
    message: match[3]
  };
}

function parseLogFile(filePath) {
  const fs = require("fs");
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter(line => line.trim());

  return lines
    .map(parseLogLine)
    .filter(entry => entry !== null);
}

module.exports = { parseLogLine, parseLogFile };
```

### src/analyzer.js

```js
function countByLevel(entries) {
  const counts = {};
  entries.forEach(entry => {
    counts[entry.level] = (counts[entry.level] || 0) + 1;
  });
  return counts;
}

function getErrors(entries) {
  return entries.filter(entry => entry.level === "ERROR");
}

function getTopErrors(entries, limit = 5) {
  const errors = getErrors(entries);
  const counts = {};

  errors.forEach(entry => {
    // Normalize error message (remove variable parts)
    const key = entry.message.replace(/:\s*\S+/, ": ...");
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([message, count]) => ({ message, count }));
}

function getTimeline(entries) {
  const timeline = {};

  entries.forEach(entry => {
    const hour = entry.timestamp.getHours().toString().padStart(2, "0") + ":00";
    timeline[hour] = (timeline[hour] || 0) + 1;
  });

  return timeline;
}

function getSummary(entries) {
  const levels = countByLevel(entries);
  const topErrors = getTopErrors(entries);
  const timeline = getTimeline(entries);

  const peakHour = Object.entries(timeline)
    .sort((a, b) => b[1] - a[1])[0];

  return {
    total: entries.length,
    levels,
    topErrors,
    peakHour: peakHour ? { hour: peakHour[0], count: peakHour[1] } : null,
    errorRate: levels.ERROR ? ((levels.ERROR / entries.length) * 100).toFixed(1) : 0
  };
}

module.exports = { countByLevel, getErrors, getTopErrors, getTimeline, getSummary };
```

### src/reporter.js

```js
function formatNumber(num) {
  return num.toLocaleString();
}

function formatPercent(part, total) {
  return ((part / total) * 100).toFixed(0) + "%";
}

function printCountReport(counts, total) {
  console.log("=== Log Level Counts ===");
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([level, count]) => {
      console.log(`${level.padEnd(8)} ${formatNumber(count).padStart(8)} (${formatPercent(count, total)})`);
    });
  console.log(`${"Total".padEnd(8)} ${formatNumber(total).padStart(8)}`);
}

function printErrors(errors) {
  console.log("=== Errors Found ===\n");
  errors.forEach((entry, i) => {
    console.log(`${i + 1}. [${entry.timestamp.toISOString().slice(0, 19)}] ${entry.message}`);
  });
  console.log(`\nTotal: ${errors.length} errors found`);
}

function printTopErrors(topErrors) {
  console.log("=== Most Common Errors ===");
  topErrors.forEach((item, i) => {
    console.log(`${i + 1}. ${item.message.padEnd(40)} (${item.count} times)`);
  });
}

function printTimeline(timeline) {
  console.log("=== Timeline ===");
  const maxCount = Math.max(...Object.values(timeline));

  Object.entries(timeline)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([hour, count]) => {
      const bar = "█".repeat(Math.ceil((count / maxCount) * 20));
      console.log(`${hour}  ${bar}  ${count}`);
    });
}

function printReport(summary, filePath) {
  console.log("====================================");
  console.log("      LOG ANALYSIS REPORT");
  console.log("====================================\n");

  console.log(`File: ${filePath}`);
  console.log(`Total entries: ${formatNumber(summary.total)}\n`);

  console.log("Level Breakdown:");
  Object.entries(summary.levels)
    .sort((a, b) => b[1] - a[1])
    .forEach(([level, count]) => {
      console.log(`  ${level.padEnd(8)} ${formatNumber(count).padStart(8)} (${formatPercent(count, summary.total)})`);
    });

  if (summary.topErrors.length > 0) {
    console.log("\nTop Errors:");
    summary.topErrors.slice(0, 3).forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.message.slice(0, 40)} (${item.count}x)`);
    });
  }

  if (summary.peakHour) {
    console.log(`\nPeak Error Hour: ${summary.peakHour.hour} (${summary.peakHour.count} errors)`);
  }

  const errorRate = parseFloat(summary.errorRate);
  const status = errorRate > 10 ? "🔴 HIGH ERROR RATE" : errorRate > 5 ? "🟡 MODERATE" : "🟢 NORMAL";
  console.log(`\nStatus: ${status} (${summary.errorRate}%)`);
  console.log("====================================");
}

module.exports = { printCountReport, printErrors, printTopErrors, printTimeline, printReport };
```

### index.js

```js
#!/usr/bin/env node

const path = require("path");
const { parseLogFile } = require("./src/parser");
const { countByLevel, getErrors, getTopErrors, getTimeline, getSummary } = require("./src/analyzer");
const { printCountReport, printErrors, printTopErrors, printTimeline, printReport } = require("./src/reporter");

const [,, command, ...args] = process.argv;

if (!command) {
  console.log("Usage: node index.js <command> <log-file>\n");
  console.log("Commands:");
  console.log("  count       Count entries by log level");
  console.log("  errors      List all errors");
  console.log("  top-errors  Show most common errors");
  console.log("  timeline    Show errors over time");
  console.log("  report      Full analysis report");
  process.exit(1);
}

const logFile = args[0];

if (!logFile) {
  console.error("Error: Please provide a log file path");
  process.exit(1);
}

const fs = require("fs");
if (!fs.existsSync(logFile)) {
  console.error(`Error: File not found: ${logFile}`);
  process.exit(1);
}

const entries = parseLogFile(logFile);

switch (command) {
  case "count":
    const counts = countByLevel(entries);
    printCountReport(counts, entries.length);
    break;

  case "errors":
    const errors = getErrors(entries);
    printErrors(errors);
    break;

  case "top-errors":
    const topErrors = getTopErrors(entries);
    printTopErrors(topErrors);
    break;

  case "timeline":
    const timeline = getTimeline(entries);
    printTimeline(timeline);
    break;

  case "report":
    const summary = getSummary(entries);
    printReport(summary, logFile);
    break;

  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
```

---

## Sample Log Generator

Create a script to generate sample logs for testing:

```js
// generate-logs.js
const fs = require("fs");

const levels = ["INFO", "WARN", "ERROR", "DEBUG"];
const messages = {
  INFO: [
    "User logged in",
    "Request processed",
    "Cache hit",
    "Database query executed"
  ],
  WARN: [
    "Slow query detected",
    "Memory usage high",
    "Rate limit approaching",
    "Deprecated API called"
  ],
  ERROR: [
    "Database connection failed",
    "Authentication failed",
    "Memory limit exceeded",
    "File not found"
  ],
  DEBUG: [
    "Entering function",
    "Variable value",
    "API response received",
    "Cache cleared"
  ]
};

function generateLogEntry() {
  const level = levels[Math.floor(Math.random() * levels.length)];
  const msgs = messages[level];
  const msg = msgs[Math.floor(Math.random() * msgs.length)];
  const timestamp = new Date().toISOString();

  return `${timestamp} [${level}] ${msg}`;
}

// Generate 100 log entries
const entries = Array.from({ length: 100 }, generateLogEntry).join("\n");
fs.writeFileSync("logs/sample.log", entries);
console.log("Generated logs/sample.log with 100 entries");
```

---

## How to Run

1. Create the project folder and files
2. Generate sample logs: `node generate-logs.js`
3. Run analysis: `node index.js report logs/sample.log`

---

## Bonus Features

1. **Multiple files:** Analyze all `.log` files in a directory
2. **Filter by level:** `node index.js count --level=ERROR`
3. **Filter by date:** `node index.js report --from=2026-08-17`
4. **Export to JSON:** `node index.js report --output=report.json`
5. **Real-time mode:** Watch log file for new entries

---

## Grading Rubric

| Criteria | Points |
|----------|--------|
| All commands work correctly | 30% |
| Correct log parsing | 25% |
| Proper use of fs/path modules | 20% |
| Error handling | 15% |
| Code organization | 10% |
