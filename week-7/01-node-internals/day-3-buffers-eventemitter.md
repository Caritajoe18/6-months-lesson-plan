# Day 3 (Hands-on) — Buffers, Streaming Large Files & Typed EventEmitter

**Previous:** [Day 2 — Streams](day-2-streams.md)
**Next:** [Assignments](assignments.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Create and manipulate Buffers with type-safe methods
- Stream very large files in constant memory
- Build **typed** event-driven systems with `EventEmitter`
- Chain custom events and streams into a real tool

---

## 1. Buffers — Binary Data in Node

A Buffer is a **fixed-size chunk of raw memory**, outside the V8 heap, used for binary data.

```ts
// from a string (typed as Buffer)
const b1: Buffer = Buffer.from("Hello", "utf8");

// from an array of bytes
const b2: Buffer = Buffer.from([72, 101, 108, 108, 111]);

// pre-allocated (fills with zeroes)
const b3: Buffer = Buffer.alloc(1024);

console.log(b1.toString("utf8"), b1.length);
```

### Key Buffer Methods (all typed)

| Method | Signature (simplified) | Purpose |
|--------|-------------------------|---------|
| `Buffer.from` | `(str \| arrayBuffer \| array) → Buffer` | Create from string/array |
| `buf.toString` | `(encoding?: BufferEncoding) → string` | Convert back to string |
| `buf.length` | `number` | Size in bytes |
| `buf.subarray` | `(start, end) → Buffer` | View (no copy) |
| `buf.copy` | `(target: Buffer) → number` | Copy into another buffer |
| `Buffer.concat` | `(list: readonly Buffer[]) → Buffer` | Join many buffers |
| `buf.byteLength` | `number` | Actual byte count |

```ts
const list: readonly Buffer[] = [Buffer.from("a"), Buffer.from("b")];
const joined: Buffer = Buffer.concat(list);   // "ab"
```

### Decoding

```ts
const buf = Buffer.from("café", "utf8");
console.log(buf.toString("utf8"));   // café
console.log(buf.toString("hex"));    // 636166c3a9
console.log(buf.toString("base64")); // Y2Fmw6k=
```

> 🪧 `é` is 2 bytes in UTF-8 (`c3 a9`). Splitting a string at arbitrary byte borders breaks characters — streams handle this via `setEncoding('utf8')`.

---

## 2. Streaming Very Large Files

### Reading with a stream

```ts
import fs from "node:fs";

const stream: fs.ReadStream = fs.createReadStream("large.txt", {
  encoding: "utf8"
});
stream.on("data", (chunk: string) => process.stdout.write(chunk));
```

### Constant-memory analysis (count lines in a GB file)

```ts
import fs from "node:fs";

async function countLines(filePath: string): Promise<number> {
  let lines = 0;
  let pending = "";

  for await (const chunk of fs.createReadStream(filePath, "utf8")) {
    pending += chunk;
    let newline: number;
    while ((newline = pending.indexOf("\n")) !== -1) {
      pending = pending.slice(newline + 1);
      lines++;
    }
  }

  if (pending) lines++; // trailing line without \n
  return lines;
}

console.log("lines:", await countLines("huge.log"));
```

### Memory graph

```text
readFileSync  → full file in RAM (bad for 10 GB)
stream        → ~64 KB in RAM regardless of file size ✅
```

---

## 3. Typed EventEmitters

The heart of Node's event-driven design. TypeScript lets you **declare exactly which events exist and their payload types**.

### A minimal (untyped) example

```ts
import { EventEmitter } from "node:events";

const bus = new EventEmitter();

bus.on("greet", (name: string) => console.log(`Hi ${name}`));
bus.emit("greet", "Ada");   // Hi Ada
```

> That works, but `emit("greet", 42)` is not caught at compile time. To get safety, declare your events with generics.

### The recommended typed pattern (TS generics over events)

```ts
import { EventEmitter } from "node:events";

// 1. Declare a map of event → payload tuple
interface JobEvents {
  progress: [percent: number];
  done: [result: string];
  error: [error: Error];
}

// 2. Declare your emitter with strongly-typed overloads
class TypedEmitter<T extends Record<string, unknown[]>> extends EventEmitter {
  on<E extends keyof T>(event: E, listener: (...args: T[E]) => void): this {
    return super.on(event as string, listener as (...args: unknown[]) => void);
  }
  emit<E extends keyof T>(event: E, ...args: T[E]): boolean {
    return super.emit(event as string, ...args);
  }
  once<E extends keyof T>(event: E, listener: (...args: T[E]) => void): this {
    return super.once(event as string, listener as (...args: unknown[]) => void);
  }
}

const job = new TypedEmitter<JobEvents>();

job.on("progress", (percent: number) => {
  console.log(`${percent}%`);      // fully typed
});

job.on("progress", (percent) => {  // payload inferred
  console.log(percent.toFixed(0));
});

job.emit("progress", 45);   // ✅ compiles
job.emit("progress", "no"); // ❌ Type error: string not assignable to number
job.emit("done", "complete");
```

### Key methods (on the plain EventEmitter)

| Method | Purpose |
|--------|---------|
| `on(event, fn)` | Register a listener |
| `once(event, fn)` | Run listener once, then remove |
| `emit(event, ...args)` | Fire all listeners |
| `removeListener(event, fn)` | Remove one |
| `removeAllListeners(event?)` | Clear all (or one) |
| `listenerCount(event)` | Count |

**Error events are special**: emitting `"error"` with no listener throws.

```ts
bus.on("error", (err: Error) => console.error("handled", err.message));
bus.emit("error", new Error("boom"));
```

---

## 4. Extending EventEmitter (typed class)

```ts
import { EventEmitter } from "node:events";

interface Progress {
  percent: number;
  bytes: number;
}

class CopyWithProgress extends EventEmitter {
  private filePath: string;

  constructor(filePath: string) {
    super();
    this.filePath = filePath;
  }

  async copy(dest: string): Promise<void> {
    // ... implementation emits "progress" and "done" ...
  }
}

const copy = new CopyWithProgress("large.bin");

copy.on("progress", ({ percent, bytes }: Progress) => {
  process.stdout.write(`\r${percent}% (${bytes} bytes)`);
});
copy.on("done", () => console.log("\ncopy complete"));

await copy.copy("large.bin.copy");
```

---

## 5. Emitter + Stream Hybrid — Evented File Watcher

Combine both worlds: a tail-style watcher that emits new lines as a file grows.

```ts
import { EventEmitter } from "node:events";
import fs from "node:fs";

interface FileWatcherEvents {
  line: [line: string];
  rotated: [];
  error: [error: Error];
}

class FileWatcher extends EventEmitter {
  private filePath: string;
  private position: number = 0;
  private buffer: string = "";

  constructor(filePath: string) {
    super();
    this.filePath = filePath;
  }

  start(): void {
    if (!fs.existsSync(this.filePath)) {
      throw new Error(`File not found: ${this.filePath}`);
    }
    const timer: NodeJS.Timeout = setInterval(() => this.readNewData(), 1000);
    timer.unref?.();  // don't keep the process alive forever (optional)
  }

  private readNewData(): void {
    try {
      const { size } = fs.statSync(this.filePath);
      if (size < this.position) {
        this.position = 0;
        this.buffer = "";
        this.emit("rotated");
      }
      if (size === this.position) return;

      const fd = fs.openSync(this.filePath, "r");
      const toRead = size - this.position;
      const buf: Buffer = Buffer.alloc(toRead);
      fs.readSync(fd, buf, 0, toRead, this.position);
      fs.closeSync(fd);
      this.position += toRead;

      this.buffer += buf.toString("utf8");
      const lines = this.buffer.split("\n");
      this.buffer = lines.pop() ?? "";

      for (const line of lines) this.emit("line", line);
    } catch (err) {
      this.emit("error", err as Error);
    }
  }
}
```

```ts
const watcher = new FileWatcher("app.log");
watcher.on("line", (line: string) => console.log(line));
watcher.start();
```

> The **log tailer project** uses this exact pattern (with `fs.watchFile`).

---

## 6. Hands-On: A "Pipeline Progress" Copier with Events

```ts
import fs from "node:fs";
import { EventEmitter } from "node:events";
import { pipeline } from "node:stream/promises";

interface CopyProgress {
  bytes: number;
  percent: number;
}

interface CopyEvents {
  progress: [CopyProgress];
  done: [];
  error: [Error];
}

class CopyJob extends EventEmitter {
  async copy(source: string, dest: string): Promise<void> {
    try {
      const { size } = await fs.promises.stat(source);
      const read: fs.ReadStream = fs.createReadStream(source);
      const write: fs.WriteStream = fs.createWriteStream(dest);

      read.on("data", () => {
        this.emit("progress", {
          bytes: read.bytesRead,
          percent: Math.round((read.bytesRead / size) * 100)
        });
      });

      await pipeline(read, write);
      this.emit("done");
    } catch (err) {
      this.emit("error", err as Error);
    }
  }
}

const job = new CopyJob();
job.on("progress", ({ percent }: CopyProgress) =>
  process.stdout.write(`\r${percent}%`)
);
job.on("done", () => console.log("\ncopied"));
job.on("error", (err: Error) => console.error("copy failed:", err.message));

await job.copy("source.zip", "copy.zip");
```

---

## 7. Common Pitfalls

```text
❌ Buffer.concat inside a loop → quadratic copy
❌ Splitting UTF-8 at arbitrary byte offset without setEncoding
❌ Emitting "error" with no listener → thrown exception crashes process
❌ Emitting events before listeners attached (order matters!)
❌ Polling with statSync every tick — use timers carefully, .unref() optional
❌ Using EventEmitter without typing your payload map → typos go unchecked
```

---

## Exercises

1. Convert `"Node rules"` to a Buffer, then print `toString("hex")`.
2. Show why `subarray` shares memory, not copies: mutate slice → original changes.
3. Write a `TypedEmitter`-based class `DownloadTracker` with `started`, `progress`, `complete` events.
4. Pipe a large file through gzip while emitting a live percentage via a typed emitter.
5. (Stretch) Build a streaming word-count on a large file using `LineSplitter` from Day 2.
6. Run `npx tsc --noEmit` — zero errors required.

---

## Key Takeaways

- Buffers hold raw binary; `Buffer.from`, `toString(enc)`, `Buffer.concat` are typed
- `setEncoding('utf8')` prevents multi-byte corruption across chunks
- Readable streams keep memory flat regardless of file size
- TypeScript EventEmitter pattern: declare an **event → payload map** and add overloads
- `once`, `removeListener`, `listenerCount` control listener lifecycle
- Emit `"error"` only with a listener attached — otherwise it throws