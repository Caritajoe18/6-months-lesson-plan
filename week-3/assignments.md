# Week 3 Assignments

---

## Assignment 1: Simulate Async Tasks with setTimeout & Build a Promise Queue

**Objective:** Understand callbacks, Promises, and asynchronous task scheduling.

### Part A: Callback Simulation

Create functions that simulate async operations using `setTimeout`.

```js
// simulateTask.js
```

#### Requirements

1. **delay(duration)** — Returns a Promise that resolves after `duration` ms

```js
await delay(1000); // waits 1 second
```

2. **logWithTimestamp(message, delayMs)** — Logs a message after a delay

```js
logWithTimestamp("Task 1 started", 0);
logWithTimestamp("Task 1 done", 1000);
```

3. **simulateTasks(tasks)** — Takes an array of `{ name, duration }` objects and logs each task when it completes

```js
simulateTasks([
  { name: "Download file", duration: 2000 },
  { name: "Process data", duration: 1000 },
  { name: "Upload result", duration: 1500 }
]);

// Expected output (with timestamps):
// [0ms] Task "Download file" started
// [0ms] Task "Process data" started
// [0ms] Task "Upload result" started
// [1000ms] Task "Process data" completed
// [1500ms] Task "Upload result" completed
// [2000ms] Task "Download file" completed
```

### Part B: Promise Queue

Build a class that executes async tasks sequentially, one at a time.

```js
class PromiseQueue {
  constructor() {
    this.queue = [];
    this.running = false;
  }

  add(taskFn) {
    // Add task to queue
    // Return a Promise that resolves when THIS task completes
  }

  async process() {
    // Process tasks one at a time
  }
}
```

#### Requirements

```js
const queue = new PromiseQueue();

queue.add(() => delay(1000).then(() => "Task 1 done"));
queue.add(() => delay(500).then(() => "Task 2 done"));
queue.add(() => delay(1500).then(() => "Task 3 done"));

// Tasks execute sequentially
// Each task waits for the previous one to finish
```

#### Expected Behavior

```text
Task 1 starts
Task 1 completes (1000ms)
Task 2 starts
Task 2 completes (500ms)
Task 3 starts
Task 3 completes (1500ms)
Total: ~3000ms (sequential)
```

### Submission

- File: `promise-queue.js`
- Include example usage with `console.log()`
- Run with: `node promise-queue.js`

---

## Assignment 2: Parallel Data Fetching with Partial Failures

**Objective:** Practice `Promise.all`, `Promise.allSettled`, and handling mixed success/failure.

### Problem Statement

You are building a dashboard that loads data from multiple sources. Some sources may fail. The dashboard should still display whatever data it can get.

### Part A: Simulate API Calls

```js
function fetchUsers() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.3) {
        resolve([
          { id: 1, name: "Ada" },
          { id: 2, name: "John" }
        ]);
      } else {
        reject(new Error("Users API failed"));
      }
    }, 1000);
  });
}

function fetchProducts() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.2) {
        resolve([
          { id: 1, name: "Laptop", price: 999 },
          { id: 2, name: "Phone", price: 699 }
        ]);
      } else {
        reject(new Error("Products API failed"));
      }
    }, 1500);
  });
}

function fetchOrders() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.4) {
        resolve([
          { id: 1, userId: 1, productId: 1, amount: 999 }
        ]);
      } else {
        reject(new Error("Orders API failed"));
      }
    }, 800);
  });
}
```

### Part B: Dashboard Loader

```js
async function loadDashboard() {
  // Use Promise.allSettled to fetch all sources
  // Return a report object
}
```

#### Expected Output Shape

```js
{
  success: true,
  data: {
    users: [...],     // null if failed
    products: [...],  // null if failed
    orders: [...]     // null if failed
  },
  errors: [
    { source: "products", message: "Products API failed" }
  ],
  loadedAt: "2026-08-17T10:30:00.000Z"
}
```

### Part C: Resilient Dashboard

Add these features:

1. **Timeout:** If any API takes more than 3 seconds, treat it as failed
2. **Retry:** Retry failed APIs once before giving up
3. **Partial Success:** Display whatever loaded successfully

```js
async function loadDashboardResilient() {
  // Implementation with timeout + retry + partial success
}
```

### Submission

- File: `parallel-fetch.js`
- Must use `Promise.allSettled`
- Include timeout and retry logic
- Run with: `node parallel-fetch.js`

---

## Assignment 3: Retry with Exponential Backoff

**Objective:** Build a production-grade retry utility with exponential backoff.

### What Is Exponential Backoff?

When a request fails, wait longer before each retry:

```text
Attempt 1: Fail → Wait 1 second
Attempt 2: Fail → Wait 2 seconds
Attempt 3: Fail → Wait 4 seconds
Attempt 4: Fail → Wait 8 seconds
Attempt 5: Fail → Give up
```

### Part A: Basic Retry Function

```js
async function retry(fn, options = {}) {
  // fn: async function to retry
  // options: { retries: 3, delay: 1000, backoff: 2 }
}
```

#### Requirements

```js
// Retry 3 times, starting with 1 second delay
const result = await retry(
  () => fetch("https://api.example.com/data"),
  { retries: 3, delay: 1000, backoff: 2 }
);
```

### Part B: Exponential Backoff with Jitter

Add random jitter to prevent thundering herd:

```js
// Without jitter: 1000, 2000, 4000
// With jitter:    1200, 1800, 4300
```

```js
function calculateDelay(attempt, baseDelay, backoffMultiplier) {
  const exponentialDelay = baseDelay * Math.pow(backoffMultiplier, attempt);
  const jitter = exponentialDelay * 0.1 * Math.random();
  return exponentialDelay + jitter;
}
```

### Part C: Full Retry Utility

```js
class RetryableOperation {
  constructor(options = {}) {
    this.maxRetries = options.retries || 3;
    this.baseDelay = options.delay || 1000;
    this.backoff = options.backoff || 2;
    this.onRetry = options.onRetry || null; // Callback for logging
  }

  async execute(fn) {
    // Implement with:
    // - Exponential backoff
    // - Jitter
    // - Retry callback
    // - Final error if all retries fail
  }
}
```

#### Usage

```js
const retryable = new RetryableOperation({
  retries: 5,
  delay: 1000,
  backoff: 2,
  onRetry: (attempt, error) => {
    console.log(`Retry ${attempt}: ${error.message}`);
  }
});

try {
  const result = await retryable.execute(async () => {
    const response = await fetch("https://api.example.com/data");
    if (!response.ok) throw new Error("Request failed");
    return response.json();
  });
  console.log("Success:", result);
} catch (error) {
  console.error("All retries failed:", error.message);
}
```

### Part D: Real-World Usage

Create a function that:

1. Fetches a URL with retry
2. Logs each retry attempt
3. Returns the result or throws after all retries fail

```js
async function fetchWithRetry(url) {
  const retryable = new RetryableOperation({
    retries: 3,
    delay: 1000,
    backoff: 2,
    onRetry: (attempt, error) => {
      console.log(`Attempt ${attempt} failed: ${error.message}`);
      console.log(`Retrying in ${calculateDelay(attempt, 1000, 2)}ms...`);
    }
  });

  return retryable.execute(async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  });
}
```

### Submission

- File: `retry-backoff.js`
- Must implement exponential backoff with jitter
- Include `onRetry` callback for logging
- Run with: `node retry-backoff.js`

---

## Grading Criteria

| Criteria | Points |
|----------|--------|
| Correctness (runs without errors) | 35% |
| Proper async/await usage | 25% |
| Error handling (try/catch, .catch) | 20% |
| Code quality and readability | 10% |
| Console output clarity | 10% |

---

## Tips

1. Start with the simplest version, then add complexity
2. Test with both successful and failing scenarios
3. Use `console.log()` with timestamps to verify timing
4. For Promise.allSettled, always check `result.status` before accessing `result.value`
5. For exponential backoff, verify the delays are actually increasing
