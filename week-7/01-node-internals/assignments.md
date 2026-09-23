# Week 7 — Part A Assignments: Node Internals (TypeScript)

> All submissions must compile clean: `npx tsc --noEmit` with `strict: true`.
> Run with `npx tsx <file>.ts` during development.

---

## Assignment 1: Streaming CSV → JSON Transformer

**Objective:** Transform a large CSV into a JSON Lines file using a typed Transform stream.

### Input CSV (`users.csv`)

```csv
id,name,email,active
1,Ada Lovelace,ada@example.com,true
2,Grace Hopper,grace@example.com,true
3,Alan Turing,alan@example.com,false
4,Margaret Hamilton,margaret@example.com,true
```

### Requirements

1. Read `users.csv` via a **Readable stream**
2. Transform each row into a typed object: `{ id: number; name: string; email: string; active: boolean }`
3. Write output as **NDJSON** to `users.jsonl`

### Structure

```ts
// users.ts — shared types
export interface UserRow {
  id: number;
  name: string;
  email: string;
  active: boolean;
}

export interface CsvParseResult {
  valid: boolean;
  row?: UserRow;
  error?: string;
}
```

```ts
// csv-to-json.ts
import { Transform, type TransformCallback } from "node:stream";
import { pipeline } from "node:stream/promises";
import fs from "node:fs";

class LineSplitter extends Transform {
  private buffer: string = "";

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    this.buffer += chunk.toString("utf8");
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    for (const line of lines) this.push(line);
    callback();
  }

  _flush(callback: TransformCallback): void {
    if (this.buffer) this.push(this.buffer);
    callback();
  }
}

class CsvToJson extends Transform {
  private isHeader = true;

  _transform(line: string, encoding: BufferEncoding, callback: TransformCallback): void {
    if (this.isHeader) {
      this.isHeader = false;
      callback();
      return;
    }

    const result = parseRow(line);
    if (!result.valid) {
      this.emit("parse-error", line);
      callback();
      return;
    }
    this.push(JSON.stringify(result.row) + "\n");
    callback();
  }
}

function parseRow(line: string): CsvParseResult {
  const parts = line.split(",");
  if (parts.length !== 4) return { valid: false, error: "expected 4 columns" };

  const [idRaw, name, email, activeRaw] = parts;
  const id = Number(idRaw);
  if (!Number.isInteger(id)) return { valid: false, error: "id must be an integer" };
  if (activeRaw !== "true" && activeRaw !== "false")
    return { valid: false, error: "active must be true/false" };

  return {
    valid: true,
    row: { id, name, email, active: activeRaw === "true" }
  };
}

async function convert(csvPath: string, outPath: string): Promise<void> {
  const splitter = new LineSplitter();
  const transformer = new CsvToJson();

  transformer.on("parse-error", (line: string) =>
    console.error(`parse-error: ${line}`)
  );

  await pipeline(
    fs.createReadStream(csvPath, "utf8"),
    splitter,
    transformer,
    fs.createWriteStream(outPath, "utf8")
  );
}

await convert("users.csv", "users.jsonl");
```

### Expected Output (`users.jsonl`)

```jsonl
{"id":1,"name":"Ada Lovelace","email":"ada@example.com","active":true}
{"id":2,"name":"Grace Hopper","email":"grace@example.com","active":true}
{"id":3,"name":"Alan Turing","email":"alan@example.com","active":false}
```

### Edge Cases
- Trailing newline (handled by `LineSplitter._flush`)
- Missing `id` → emit `parse-error` instead of crashing
- Line count should match between input rows and output lines

### Submission
- `users.ts` (types), `csv-to-json.ts`, `gen-csv.js` (1000-row generator)
- `npx tsc --noEmit` output showing zero errors
- Terminal proof line counts match

---

## Assignment 2: Custom Typed Message Bus (EventEmitter)

**Objective:** Build a publish/subscribe message bus with strongly-typed events.

### Required API

```ts
// bus.ts
import { EventEmitter } from "node:events";

interface BusEvents {
  [key: string]: unknown[];   // any topic, but payloads are typed by callers
}

class MessageBus<T extends BusEvents = BusEvents> extends EventEmitter {
  // typed overloads...
  subscribe<K extends keyof T & string>(topic: K, fn: (...args: T[K]) => void): () => void;
  once<K extends keyof T & string>(topic: K, fn: (...args: T[K]) => void): () => void;
  publish<K extends keyof T & string>(topic: K, ...args: T[K]): void;
  topics(): string[];
  clear(topic?: string): void;
}
```

### Usage

```ts
interface OrderEvents {
  "order.placed": [payload: { orderId: number; total: number }];
  "payment.failed": [payload: { orderId: number; reason: string }];
}

const bus = new MessageBus<OrderEvents>();

const off = bus.subscribe("order.placed", ({ orderId, total }) => {
  console.log(`order ${orderId}: $${total}`);
});

bus.publish("order.placed", { orderId: 123, total: 99 });  // ✅ compiles
bus.publish("order.placed", { wrong: true });              // ❌ compile error

off();  // unsubscribe
```

### Wildcard
Publishes should also notify a `"*"` subscriber:

```ts
bus.subscribe("*", (topic: string, ...args: unknown[]) => {
  console.log(topic, args);
});
```

### Requirements

| Feature | Behavior |
|---------|----------|
| `subscribe(topic, fn)` | Returns an unsubscribe function |
| `publish(topic, ...args)` | Emits to the topic's listeners (+ `*`) |
| `once(topic, fn)` | Fires once |
| `topics()` | Lists current topics |
| `clear(topic?)` | Removes all (or one topic's) listeners |

### Demo (`demo.ts`)
Simulate an order flow: `order.received` → `payment.processed` → `inventory.updated`, with one subscriber per stage and a wildcard logger.

### Submission
- `bus.ts`, `demo.ts`
- Prove unsubscribe works (listener no longer fires)
- `npx tsc --noEmit` clean

---

## Assignment 3: Large-File Copy with Compression & Progress

**Objective:** Copy a large file with gzip compression while printing typed live progress.

### Behavior

```bash
npx tsx copy-progress.ts big.dat
```

```text
[=====>                       ] 23%  1.4 GB / 6.0 GB
[=============================] 100% done in 41.2s
```

### Requirements

1. Read source with `fs.createReadStream`
2. Compress with `zlib.createGzip()`
3. Write destination `big.dat.gz` with `fs.createWriteStream`
4. Report progress using `readable.bytesRead` and `fs.promises.stat` for total
5. Overwrite progress with `\r` in the terminal
6. Use `pipeline()` (not bare `.pipe`) so errors are clean

### Typed progress helper

```ts
interface Progress {
  bytesRead: number;
  totalBytes: number;
  percent: number;
  elapsedMs: number;
}

function formatProgress(p: Progress): string {
  const pct = Math.round(p.percent);
  const filled = "=".repeat(pct).padEnd(30, " ");
  const mbRead = (p.bytesRead / 1024 / 1024).toFixed(1);
  const mbTotal = (p.totalBytes / 1024 / 1024).toFixed(1);
  return `[${filled}] ${pct}%  ${mbRead} MB / ${mbTotal} MB`;
}
```

```ts
async function compressWithProgress(filePath: string): Promise<void> {
  const { size } = await fs.promises.stat(filePath);
  const start = Date.now();

  const read = fs.createReadStream(filePath);
  const gzip = zlib.createGzip();
  const write = fs.createWriteStream(`${filePath}.gz`);

  read.on("data", () => {
    const progress: Progress = {
      bytesRead: read.bytesRead,
      totalBytes: size,
      percent: (read.bytesRead / size) * 100,
      elapsedMs: Date.now() - start
    };
    process.stdout.write(`\r${formatProgress(progress)}`);
  });

  await pipeline(read, gzip, write);
  console.log(`\r\ndone in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}
```

### Stretch
- Show real-time MB/s throughput
- Support a `--no-compress` flag that skips gzip

### Submission
- `copy-progress.ts`
- Run on a >100 MB file; capture final output line
- `npx tsc --noEmit` clean

---

## Grading Criteria (Part A)

| Criteria | Points |
|----------|--------|
| Streams used correctly (no full-file `readFileSync`) | 35% |
| `pipeline()` used where applicable | 15% |
| Typed interfaces + edge cases handled | 20% |
| Typed EventEmitter usage correct | 20% |
| `tsc --noEmit` clean | 10% |

---

## Tips
1. Build the `LineSplitter` once — reuse it for the log tailer project
2. Always register `"error"` listeners on streams and emitters
3. `\r` overwrites the line; add `\n` at the very end when done
4. Test your Transform against a 5-line CSV before the 1000-line one
5. Run `npx tsc --noEmit` after every file — fix the FIRST error, re-run