# Project: Real-Time Log Tailer CLI (TypeScript)

## Objective

Build a CLI like `tail -f app.log` that **follows** a file, **filters** patterns, **highlights** levels, and shows live **summary stats** — all in TypeScript. Exercises streams, typed EventEmitter, buffers, and file watching.

## Run & Build

```bash
npm install
npm run dev -- --file app.log                    # tsx watch
npx tsx src/index.ts app.log                     # direct
npm run typecheck                                # tsc --noEmit (must pass)
npm run build && node dist/index.js app.log      # compiled JS
```

## Usage

```text
npx tsx src/index.ts app.log                    # follow + color
npx tsx src/index.ts app.log --filter "timeout" # substring match
npx tsx src/index.ts app.log --levels error,warn
npx tsx src/index.ts app.log --tail 100         # replay last 100 lines first
npx tsx src/index.ts app.log --no-color
npx tsx src/index.ts --help
```

While running: press `?` for live summary, `q` to quit.

## The Log Format

```text
2026-08-22T10:30:00.000Z [INFO] server started
2026-08-22T10:30:01.123Z [ERROR] DB connection failed: timeout
2026-08-22T10:30:02.456Z [WARN] slow query 2500ms
```

Regex: `^(\S+)\s+\[(\w+)\]\s+(.+)$`

## Architecture

```
tailer/
├── src/
│   ├── types.ts       # LogEntry, Level, CliFlags interfaces
│   ├── cli.ts         # parseArgs(): CliFlags
│   ├── parser.ts      # parseLogLine(): LogEntry | null
│   ├── renderer.ts    # colorize() + renderLine()
│   ├── stats.ts       # StatsCounter (typed event-driven counts)
│   ├── watcher.ts     # FileTailer extends TypedEmitter
│   └── index.ts       # entry, wires everything
├── sample.log
├── tsconfig.json
└── package.json
```

## 1. Types (`types.ts`)

```ts
export type Level = "INFO" | "WARN" | "ERROR" | "DEBUG";

export interface LogEntry {
  timestamp: Date;
  level: Level;
  message: string;
  raw: string;
}

export interface CliFlags {
  file: string;
  filter: string | null;
  levels: Level[] | null;
  tail: number | null;
  useColor: boolean;
}

export interface LevelCounts {
  INFO: number;
  WARN: number;
  ERROR: number;
  DEBUG: number;
}
```

## 2. Parser (`parser.ts`)

```ts
import type { LogEntry, Level } from "./types.js";

const LINE_RE = /^(\S+)\s+\[(\w+)\]\s+(.+)$/;
const LEVELS = new Set<string>(["INFO", "WARN", "ERROR", "DEBUG"]);

export function parseLogLine(line: string): LogEntry | null {
  const m = LINE_RE.exec(line);
  if (!m) return null;

  const levelCandidate = m[2].toUpperCase();
  if (!LEVELS.has(levelCandidate)) return null;

  return {
    timestamp: new Date(m[1]),
    level: levelCandidate as Level,
    message: m[3],
    raw: line
  };
}
```

> Return type `LogEntry | null` forces callers to narrow — no silent `undefined` access.

## 3. Renderer (`renderer.ts`)

```ts
import type { CliFlags, LogEntry } from "./types.js";

const LEVEL_COLOR: Record<string, number> = {
  ERROR: 31, WARN: 33, INFO: 32, DEBUG: 90
};

function colorize(text: string, level: string): string {
  const code = LEVEL_COLOR[level];
  return code ? `\u001b[${code}m${text}\u001b[0m` : text;
}

export function renderLine(entry: LogEntry | null, flags: CliFlags): string | null {
  if (!entry) return flags.useColor ? null : null;

  // filter
  if (flags.filter && !entry.raw.toLowerCase().includes(flags.filter.toLowerCase())) return null;
  if (flags.levels && !flags.levels.includes(entry.level)) return null;

  const time = entry.timestamp.toISOString().slice(11, 19);
  const level = flags.useColor ? colorize(entry.level, entry.level) : entry.level;
  return `${time} [${level}] ${entry.message}`;
}
```

## 4. Typed EventEmitter Watcher (`watcher.ts`)

```ts
import { EventEmitter } from "node:events";
import fs from "node:fs";

export interface TailerEvents {
  line: [line: string];
  rotated: [];
  started: [];
  stopped: [];
  error: [error: Error];
}

export class FileTailer extends EventEmitter {
  private filePath: string;
  private position: number = 0;

  constructor(filePath: string) {
    super();
    this.filePath = filePath;
  }

  start(): void {
    if (!fs.existsSync(this.filePath)) {
      throw new Error(`File not found: ${this.filePath}`);
    }
    const { size } = fs.statSync(this.filePath);
    this.position = size;               // start at the end (follow mode)
    fs.watchFile(this.filePath, { interval: 500 }, () => this.readNew());
    this.emit("started");
  }

  private readNew(): void {
    try {
      const { size } = fs.statSync(this.filePath);
      if (size < this.position) {
        this.position = 0;              // truncated → restart
        this.emit("rotated");
      }
      if (size === this.position) return;

      const fd = fs.openSync(this.filePath, "r");
      const toRead = size - this.position;
      const buf: Buffer = Buffer.alloc(toRead);
      fs.readSync(fd, buf, 0, toRead, this.position);
      fs.closeSync(fd);
      this.position += toRead;

      const text = buf.toString("utf8");
      for (const line of text.split("\n").filter(Boolean)) {
        this.emit("line", line);
      }
    } catch (err) {
      this.emit("error", err as Error);
    }
  }

  stop(): void {
    fs.unwatchFile(this.filePath);
    this.emit("stopped");
  }
}
```

## 5. Stats Counter (`stats.ts`)

```ts
import type { LevelCounts, Level } from "./types.js";

export class StatsCounter {
  private counts: LevelCounts = { INFO: 0, WARN: 0, ERROR: 0, DEBUG: 0 };

  record(level: Level): void {
    this.counts[level]++;
  }

  snapshot(): LevelCounts {
    return { ...this.counts };
  }

  summary(): string {
    const s = this.snapshot();
    return [
      "── live summary ──",
      `INFO  ${s.INFO}`,
      `WARN  ${s.WARN}`,
      `ERROR ${s.ERROR}`,
      `DEBUG ${s.DEBUG}`
    ].join("\n");
  }
}
```

## 6. CLI (`cli.ts`)

```ts
import type { CliFlags, Level } from "./types.js";

const ALL_LEVELS: Level[] = ["INFO", "WARN", "ERROR", "DEBUG"];

export function parseArgs(argv: string[]): CliFlags {
  const flags: CliFlags = {
    file: "",
    filter: null,
    levels: null,
    tail: null,
    useColor: Boolean(process.stdout.isTTY)
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--filter":
        flags.filter = argv[++i] ?? null;
        break;
      case "--levels": {
        const raw = argv[++i] ?? "";
        const wanted = raw.split(",").map((s) => s.toUpperCase());
        flags.levels = wanted.filter((l): l is Level =>
          ALL_LEVELS.includes(l as Level)
        );
        break;
      }
      case "--tail":
        flags.tail = Number(argv[++i]);
        break;
      case "--no-color":
        flags.useColor = false;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        if (!arg.startsWith("--") && !flags.file) flags.file = arg;
    }
  }
  return flags;
}

function printHelp(): void {
  console.log(`Log Tailer (TypeScript)
Usage: tsx src/index.ts <file> [--filter s] [--levels a,b] [--tail n] [--no-color]`);
}
```

## 7. Entry (`index.ts`)

```ts
import { parseArgs } from "./cli.js";
import { parseLogLine } from "./parser.js";
import { renderLine } from "./renderer.js";
import { FileTailer } from "./watcher.js";
import { StatsCounter } from "./stats.js";

const flags = parseArgs(process.argv.slice(2));
if (!flags.file) {
  console.error("no file given — try --help");
  process.exit(1);
}

const stats = new StatsCounter();
const tailer = new FileTailer(flags.file);

tailer.on("line", (line: string) => {
  const entry = parseLogLine(line);
  if (entry) stats.record(entry.level);

  const out = renderLine(entry, flags);
  if (out) console.log(out);
});

tailer.on("rotated", () => console.log("FILE ROTATED — restarting"));
tailer.on("error", (err: Error) => console.error(err.message));

tailer.start();

// raw-mode keypress handling
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on("data", (key: Buffer) => {
    const k = key.toString("utf8");
    if (k === "?") console.log("\n" + stats.summary() + "\n");
    if (k === "q" || k === "\u0003") { tailer.stop(); process.exit(0); }
  });
}
```

## 8. Testing

```bash
# terminal 1
npx tsx src/index.ts sample.log

# terminal 2
echo '2026-08-22T10:31:00.000Z [WARN] ignored' >> sample.log
echo '2026-08-22T10:31:01.000Z [ERROR] flagged' >> sample.log
```

Press `?` → see counts. Press `q` → clean exit.

## Stretch

```text
1. Multiple files: tsx src/index.ts a.log b.log
2. Regex --filter: use RegExp instead of substring
3. JSON-lines input: parse {"ts","level","msg"} into LogEntry
4. --stats-every <sec> timer-based summary
5. Highlight keywords ("timeout", "failed") via ANSI underline
```

## Deliverables

1. Full `src/` (all typed, zero `any`)
2. `sample.log` with varied levels
3. Live-tail demo (appended lines appear)
4. `--filter` and `--levels` demos
5. `npm run typecheck` passing

## Grading Rubric

| Criteria | Points |
|----------|--------|
| Live-tails appended lines correctly | 25% |
| Typed EventEmitter + clean TS types | 25% |
| Filters + highlighting work | 20% |
| Rotation/truncation handled | 15% |
| CLI + `?` summary + clean quit | 10% |
| `tsc --noEmit` clean | 5% |