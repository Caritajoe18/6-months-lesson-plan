# Day 1 — The Event Loop, libuv, Blocking & Task Scheduling (TypeScript)

**Previous:** [Week 6 — TypeScript](../week-6/syllabus.md)
**Next:** [Day 2 — Streams](day-2-streams.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Explain the Node.js event loop and the role of libuv
- Distinguish blocking vs non-blocking operations
- Predict execution order of async tasks in typed code
- Use `process.nextTick`, `setImmediate`, and `setTimeout` correctly
- Type a worker-thread job for CPU-bound work

---

## 1. Single-Threaded Myth Beneath the Hood

Node.js runs your **JavaScript on one thread** — the "main thread" — but the platform itself is multi-threaded.

```text
┌────────────────────────────────────────────┐
│            Your JavaScript (1 thread)       │
│        (call stack + the Event Loop)        │
├────────────────────────────────────────────┤
│                  Node.js Core APIs          │
├────────────────────────────────────────────┤
│                  libuv                      │
│  (thread pool — default 4 threads)          │
│  handles: fs I/O, DNS, crypto, network...   │
├────────────────────────────────────────────┤
│                 OS Kernel                   │
└────────────────────────────────────────────┘
```

### What Is libuv?

libuv is a **C library** that Node uses for:

```text
✅ The event loop itself
✅ A thread pool (ThreadPool, default UV_THREADPOOL_SIZE=4)
✅ Non-blocking I/O (files, sockets, timers, signals)
✅ Cross-platform networking
```

> The ThreadPool default of 4 is a starting point, not a cap — it's configurable and sized by workload. What matters for you: the pool exists, and blocking promises hand work to it.

---

## 2. Blocking vs Non-Blocking

### Blocking (synchronous)

```ts
import fs from "node:fs";

const data: string = fs.readFileSync("big.txt", "utf8"); // blocks JavaScript
console.log(data);
```

While `readFileSync` runs, **nothing else can happen**. No timers, no events, no other requests.

```text
1. readFileSync starts
2. JavaScript is frozen (nothing runs)
3. File read completes
4. Code resumes
```

### Non-Blocking (asynchronous)

```ts
import fs from "node:fs";

fs.readFile("big.txt", "utf8", (err, data) => {
  if (err) {
    console.error(err.message);
    return;
  }
  console.log(data);
});

console.log("waits for nothing");
```

```text
1. readFile is scheduled
2. Call stack continues immediately
3. libuv reads the file on a thread pool thread
4. When done, the callback is queued to the event loop
```

### Safest default: use promises

```ts
import { readFile } from "node:fs/promises";

const data: string = await readFile("big.txt", "utf8");
```

> Prefer `fs/promises` in your app code. Callbacks are legacy; sync forms are a trap.

---

## 3. The Event Loop

The event loop is a **loop that processes queued work** in phases, repeatedly, until there's nothing left.

```text
        ┌──────────────┐
   ────▶│    timers     │   setTimeout / setInterval callbacks
        └──────────────┘
        ┌──────────────┐
   ────▶│   pending     │   TCP / UDP / stream callbacks
        └──────────────┘
        ┌──────────────┐
   ────▶│   poll        │   I/O callbacks, awaits
        └──────────────┘
        ┌──────────────┐
   ────▶│   check       │   setImmediate callbacks
        └──────────────┘
        ┌──────────────┐
   ────▶│   close       │   socket/file close handlers
        └──────────────┘
                 │
                 └── (repeat)
```

### The Phases (in order, each iteration)

| Phase | Runs |
|-------|------|
| **timers** | `setTimeout`, `setInterval` due callbacks |
| **pending** | I/O events (rarely seen in practice) |
| **poll** | most I/O callbacks, `fs`, network, `await` continuations |
| **check** | `setImmediate` callbacks |
| **close** | `'close'` events |

---

## 4. process.nextTick vs setImmediate

These two are often confused. They are **different things**.

### process.nextTick

Runs **before the event loop continues** — right after the current operation finishes.

```ts
process.nextTick(() => console.log("nextTick"));

Promise.resolve().then(() => console.log("promise - microtask"));
```

```text
output order:
  1. promise - microtask   (microtasks run first)
  2. nextTick

nextTick callbacks run before the loop moves to the next phase —
before timers, before I/O, before setImmediate.
```

### setImmediate

Runs during the **check phase** — after the current poll phase finishes.

```ts
setImmediate(() => console.log("setImmediate - check phase"));
```

### The Classic Ordering

```ts
import fs from "node:fs";

fs.readFile(__filename, () => {
  setTimeout(() => console.log("setTimeout (timers)"), 0);
  setImmediate(() => console.log("setImmediate (check)"));
});
```

```text
Because the readFile callback runs in the poll phase:
  setImmediate (check)  →  fires THIS iteration (right after poll)
  setTimeout (timers)   →  fires NEXT iteration

Output:
  setImmediate (check)
  setTimeout (timers)
```

### When to Use What

| Tool | Best for | Runs |
|------|----------|------|
| `process.nextTick` | Fix subtle ordering / re-queue work | Before next phase, even before promises (mostly) |
| `setImmediate` | Defer until I/O is done | After current poll |
| `setTimeout(0)` | Throttle / rough defer | Next timer phase |
| `Promise.resolve().then` | Microtask work | Before nextTick? After current sync code |

> ⚠️ Bad practice: `process.nextTick` in infinite loops — it starves the event loop (I/O never runs). `setImmediate` is often the safer "I'll do this soon" choice.

---

## 5. Timers Deep Dive

### setTimeout — minimum, not exact

```ts
console.log("before");

const timerId: NodeJS.Timeout = setTimeout(
  () => console.log("didn't run instantly"),
  0
);
clearTimeout(timerId);  // cancel if you need to

console.log("after");
```

The 0 is a **minimum** delay, and `setTimeout` returns a `NodeJS.Timeout` handle (worth typing for `clearTimeout`).

### Nested setTimeout = natural throttle

```ts
function heartbeat(tick: number): void {
  console.log("beat", tick);
  setTimeout(() => heartbeat(tick + 1), 1000); // schedule next after work
}

heartbeat(0);
```

> Don't rely on sub-ms precision. Prefer `performance.now()` for measuring.

---

## 6. Why "Await" Helps

```ts
async function main(): Promise<void> {
  console.log("1");
  await 0;             // yields control
  console.log("2");
}

main();
console.log("3");
```

```text
Output:
  1
  3
  2
```

Awaiting yields the main thread, letting other queued work run.

---

## 7. CPU-Bound Work on the Main Thread

A sync loop that blocks the event loop freezes the whole server.

```ts
// ❌ Blocks everything
function computePrimes(limit: number): number {
  // heavy loop on the main thread (JS runs here)
  return 0;
}
```

### The Mitigations

| Technique | When |
|-----------|------|
| Break work into chunks + `setImmediate` | Small medium work |
| `worker_threads` | Continuous CPU-heavy work |
| `child_process.fork()` | many implementations |
| Offload to the threadpool | native functions (`crypto`, `zlib`) already do |

### Worker Threads, typed (small taste)

```ts
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

// ---- main thread side ----
function runInWorker(limit: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData: limit });
    worker.on("message", (value: number) => resolve(value));
    worker.on("error", reject);
  });
}

// ---- worker side ----
if (!isMainThread) {
  const limit: number = workerData;
  const primes = countPrimes(limit);          // CPU-heavy
  parentPort!.postMessage(primes);
}
```

---

## 8. Easy Experiments to Run (typed)

```ts
// experiment.ts
import fs from "node:fs";

console.log("sync start");

Promise.resolve().then(() => console.log("promise 1"));
process.nextTick(() => console.log("nextTick 1"));

setTimeout(() => console.log("setTimeout 0"), 0);
setImmediate(() => console.log("setImmediate (check)"));

fs.readFile(__filename, () => {
  console.log("fs callback (poll)");
  process.nextTick(() => console.log("nextTick inside fs"));
  setImmediate(() => console.log("immediate inside fs (check)"));
  setTimeout(() => console.log("timeout inside fs (timers)"), 0);
});

console.log("sync end");
```

Run: `npx tsx experiment.ts`

---

## Exercises

1. Predict and then verify the output of the experiment above.
2. Write a script that prints `nextTick` before `setImmediate` when scheduled inside a `fs.readFile` callback.
3. Write a typed "1-second heartbeat" using nested `setTimeout` for 5 ticks, logging `performance.now()` each tick. Note the drift.
4. Type a `countPrimes(limit: number): number` and ship it to a worker thread; return the value via a Promise.

---

## Key Takeaways

- JS runs on one thread; libuv handles I/O on a thread pool
- Blocking ops freeze your app — prefer `fs/promises` in type-safe code
- The loop iterates phases: timers → poll → check → close
- `setImmediate` ≠ `process.nextTick`; they run at different times
- `setTimeout(0)` is a *minimum* — never an exact timer
- Type your async helpers: `(): Promise<T>`, `NodeJS.Timeout` handles
- CPU-bound sync code starves the event loop; use worker threads