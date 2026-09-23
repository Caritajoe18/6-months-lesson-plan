# Day 2 — Streams: Readable, Writable, Transform, Pipe & zlib (TypeScript)

**Previous:** [Day 1 — Event Loop](../01-node-internals/day-1-event-loop.md)
**Next:** [Day 3 — Buffers & EventEmitter](day-3-buffers-eventemitter.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Explain why streams exist and when to use them
- Read from Readable streams and write to Writable streams with type safety
- Compose pipelines with `pipe` and `pipeline`
- Write typed Transform streams (generics in the stream types)
- Compress/decompress with the `zlib` module

---

## 1. Why Streams?

Loading a giant file into memory is wasteful — even impossible for truly huge files.

```text
❌ Read entire 10 GB file into memory → 10 GB in RAM

✅ Stream it: read 64 KB → process → discard → read next chunk
```

```text
   10 GB file
   Chunk 1 ──▶ process ──▶ next ──▶ ...  (only ~64 KB in memory)
```

> Streams = process data **piece by piece** as it arrives. Great for files, network requests, logs, CSV.

---

## 2. The Stream Big Picture (typed)

There are four kinds of streams:

```text
Readable    → source you pull data FROM      (fs.createReadStream)
Writable    → destination you push data TO   (fs.createWriteStream)
Duplex      → both directions at once        (net.Socket)
Transform   → read, modify, write            (crypto, zlib, JSON lines)
```

| Stream | You can read | You can write | TS type |
|--------|:----------:|:-----------:|---------|
| Readable | ✅ | ❌ | `Readable` |
| Writable | ❌ | ✅ | `Writable` |
| Duplex | ✅ | ✅ | `Duplex` |
| Transform | ✅ | ✅ (modified) | `Transform` |

All are exported from `node:stream` and come with full type definitions.

---

## 3. Readable Streams — Reading

### Listening to 'data'

```ts
import fs from "node:fs";

const readStream = fs.createReadStream("big.txt", { encoding: "utf8" });

readStream.on("data", (chunk: string) => {
  process.stdout.write(chunk);   // write each chunk out as it arrives
});

readStream.on("end", () => console.log("\n=== done ==="));
readStream.on("error", (err: Error) => console.error("Failed:", err.message));
```

Each `chunk` is a `string` (thanks to `encoding: "utf8"`). Without an encoding, the type is `Buffer`.

### Using async iteration (modern, clean)

```ts
for await (const chunk of fs.createReadStream("big.txt", "utf8")) {
  process.stdout.write(chunk);
}
```

### Paused vs flowing modes

```text
Streams start "paused".
Adding 'data' listener → switches to flowing.
Call .pause() / .resume() to control backpressure yourself (rarely needed).
```

---

## 4. Writable Streams — Writing

```ts
const writeStream: fs.WriteStream = fs.createWriteStream("output.txt");

writeStream.write("line 1\n");
writeStream.write("line 2\n");

writeStream.end();   // signal we're done

writeStream.on("finish", () => console.log("finished writing"));
```

### The danger of writing too fast

```ts
const written: boolean = writeStream.write(chunk);
// false means "you're flooding me" → wait for 'drain' before writing more
```

```ts
function writeWithBackpressure(stream: fs.WriteStream, chunks: string[]): Promise<void> {
  return chunks.reduce<Promise<void>>(async (chain, chunk) => {
    await chain;
    const canContinue = stream.write(chunk);
    if (canContinue) return;
    await new Promise<void>((resolve) => stream.once("drain", resolve));
  }, Promise.resolve());
}
```

> `pipe`/`pipeline` handle backpressure automatically. Prefer them.

---

## 5. pipe() — wiring streams together

```ts
import fs from "node:fs";

const readable = fs.createReadStream("source.txt");
const writable = fs.createWriteStream("copy.txt");

readable.pipe(writable);
writable.on("finish", () => console.log("copy done"));
```

> ⚠️ `pipe` does **not** forward errors on its own. Prefer `pipeline`.

### `pipeline()` — the recommended way

```ts
import { pipeline } from "node:stream/promises";
import fs from "node:fs";

await pipeline(
  fs.createReadStream("source.txt"),
  fs.createWriteStream("copy.txt")
);
console.log("copy done, cleanly");
```

Type check: `pipeline(readStream, writeStream)` inferences `string | Buffer | Uint8Array` chunk types automatically — a misplaced stream shows up as a compile error.

---

## 6. Transform Streams (typed)

A Transform is a Readable + Writable that modifies data in between.

```ts
import { Transform, type TransformCallback } from "node:stream";
import { pipeline } from "node:stream/promises";

const upper = new Transform({
  transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    this.push(String(chunk).toUpperCase());
    callback();
  }
});

await pipeline(process.stdin, upper, process.stdout);
// type "hello" → outputs "HELLO"
```

> The `TransformCallback` from `node:stream` is a function — pass `callback()` on success, `callback(err)` on failure.

### A Line-Splitting Transform (typed class — foundation for the CSV assignment)

```ts
import { Transform, type TransformCallback } from "node:stream";

class LineSplitter extends Transform {
  private buffer: string = "";

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    this.buffer += chunk.toString("utf8");
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";   // last partial line stays buffered
    for (const line of lines) {
      this.push(line);
    }
    callback();
  }

  _flush(callback: TransformCallback): void {
    if (this.buffer) this.push(this.buffer);
    callback();
  }
}
```

> `_transform`'s last line may be incomplete — that's exactly why `LineSplitter` buffers the tail and emits it in `_flush`.

### A JSON-Lines Transform (generic-friendly)

```ts
class JsonLineEncoder<T> extends Transform {
  constructor() {
    super({ objectMode: true });  // emit objects, not strings
  }

  _transform(obj: T, _encoding: BufferEncoding, callback: TransformCallback): void {
    this.push(JSON.stringify(obj) + "\n");
    callback();
  }
}
```

```ts
const encoder = new JsonLineEncoder<{ id: number; name: string }>();
encoder.write({ id: 1, name: "Ada" });
```

---

## 7. zlib — Compression

```ts
import { createGzip, createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import fs from "node:fs";

// Compress
await pipeline(
  fs.createReadStream("huge.log"),
  createGzip(),
  fs.createWriteStream("huge.log.gz")
);
```

```ts
// Decompress
await pipeline(
  fs.createReadStream("huge.log.gz"),
  createGunzip(),
  fs.createWriteStream("huge.log.restored")
);
```

### Choice of Codecs

| Codec | Called via | Notes |
|-------|------------|-------|
| gzip | `createGzip` / `createGunzip` | Good general compression, decodable everywhere |
| brotli | `createBrotliCompress` / `createBrotliDecompress` | Better ratios, slower — web loads |
| deflate | `createDeflate` / `createInflate` | Classic zlib wire format |

---

## 8. Composing a Realistic Pipeline (with typed progress)

```ts
import fs from "node:fs";
import zlib from "node:zlib";
import { pipeline } from "node:stream/promises";

async function compressWithProgress(filePath: string): Promise<void> {
  const { size } = await fs.promises.stat(filePath);

  const read = fs.createReadStream(filePath);
  const gzip = zlib.createGzip();
  const write = fs.createWriteStream(`${filePath}.gz`);

  read.on("data", () => {
    const pct = (read.bytesRead / size) * 100;
    process.stdout.write(`\r${pct.toFixed(1)}%`);
  });

  await pipeline(read, gzip, write);
  console.log("\rcompressed done");
}

await compressWithProgress("huge.log");
```

> `read.bytesRead` is a `number` on Readable streams — handy for progress meters.

---

## 9. Common Mistakes

```text
❌ fs.readFileSync on a huge file → memory blow-up
❌ .pipe without error handlers → unhandled errors crash process
❌ Ignoring the boolean return of .write() → ignoring backpressure
❌ Splitting lines inside _transform without buffering the tail → data loss
❌ Forgetting to .end() a writable → never "finish"
❌ Using a string chunk type in _transform WITHOUT objectMode / encoding → TS error
```

---

## Exercises

1. Copy `source.txt` → `copy.txt` with `.pipe()`, then again with `pipeline()`.
2. Build a `LineSplitter` Transform and echo lines with numbers.
3. Gzip a log file and print before/after byte sizes (typed).
4. Write a `MaskSecrets` Transform that masks text after `:` in each line.
5. Count lines in a large file via a stream without loading it into memory — return the count as `Promise<number>`.
6. Run `npx tsc --noEmit` and confirm zero errors on your stream code.

---

## Key Takeaways

- Streams process data in chunks instead of loading everything into RAM
- `Readable` / `Writable` / `Transform` are all strongly typed from `node:stream`
- `.pipe()` is simple; `pipeline()` is safe (errors, cleanup, backpressure)
- Type `_transform` with `Buffer`/`string` chunk + `TransformCallback`
- `Buffer.alloc`/`Buffer.from` + `setEncoding('utf8')` avoid multi-byte corruption
- `zlib` compress with `createGzip`/`createGunzip` directly in the pipeline