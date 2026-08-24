# Project: Async Data Pipeline Manager

## Objective

Build a command-line tool that manages asynchronous data processing tasks. This project combines all Week 3 concepts: callbacks, Promises, async/await, error handling, parallel execution, and retry logic.

---

## Problem Statement

You are building a **Data Pipeline Manager** — a CLI tool that processes data from multiple sources, transforms it, and generates reports. Some tasks will fail randomly, so the system must handle errors gracefully.

---

## Data Flow

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Fetch Data │────▶│  Process    │────▶│  Generate   │
│  (Sources)  │     │  (Transform)│     │  Report     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
  Parallel fetch     Sequential or       Aggregate
  with retries       parallel transform  results
```

---

## Features

### 1. Simulated Data Sources

Create async functions that simulate fetching data from external APIs with random delays and failures.

```js
// Each source has different latency and failure rates
const sources = [
  { name: "users", fetch: fetchUsers, failureRate: 0.2 },
  { name: "products", fetch: fetchProducts, failureRate: 0.1 },
  { name: "orders", fetch: fetchOrders, failureRate: 0.3 },
  { name: "reviews", fetch: fetchReviews, failureRate: 0.15 }
];
```

### 2. Fetch with Retry and Timeout

Each source fetches with:
- Configurable timeout (default: 5 seconds)
- Retry with exponential backoff (default: 3 retries)
- Detailed logging of each attempt

```js
async function fetchWithRetry(source, options = {}) {
  const { retries = 3, timeout = 5000, backoff = 2 } = options;
  // Implementation
}
```

**Example output:**
```text
[10:30:00] Fetching users... (attempt 1)
[10:30:01] users: Success (1023ms)
[10:30:01] Fetching products... (attempt 1)
[10:30:02] products: Failed - Timeout
[10:30:02] products: Retrying in 2000ms... (attempt 2)
[10:30:04] products: Success (2015ms)
[10:30:01] Fetching orders... (attempt 1)
[10:30:02] orders: Failed - Server error
[10:30:02] orders: Retrying in 1000ms... (attempt 2)
[10:30:03] orders: Failed - Server error
[10:30:03] orders: Retrying in 2000ms... (attempt 3)
[10:30:05] orders: Success (1998ms)
[10:30:01] Fetching reviews... (attempt 1)
[10:30:02] reviews: Success (987ms)
```

### 3. Parallel Fetching

Fetch all sources in parallel using `Promise.allSettled`.

```js
async function fetchAllSources(sources, options) {
  const results = await Promise.allSettled(
    sources.map(source => fetchWithRetry(source, options))
  );
  return summarizeResults(results);
}
```

**Expected output:**
```text
=== Fetch Results ===
Total: 4 sources
Successful: 3 (users, products, reviews)
Failed: 1 (orders)
Total time: 5.2s
```

### 4. Data Transformation Pipeline

Process fetched data through a series of transformations.

```js
const pipeline = [
  {
    name: "filter-active",
    transform: (data) => ({
      ...data,
      users: data.users.filter(u => u.isActive)
    })
  },
  {
    name: "calculate-stats",
    transform: (data) => ({
      ...data,
      stats: {
        totalUsers: data.users.length,
        totalProducts: data.products.length,
        totalRevenue: data.orders.reduce((sum, o) => sum + o.amount, 0)
      }
    })
  },
  {
    name: "enrich-reviews",
    transform: (data) => ({
      ...data,
      reviews: data.reviews.map(r => ({
        ...r,
        sentiment: r.rating >= 4 ? "positive" : "negative"
      }))
    })
  }
];
```

### 5. Sequential vs Parallel Processing

Allow running transforms sequentially or in parallel.

```js
// Sequential — each transform waits for previous
async function runSequential(data, transforms) {
  let result = data;
  for (const t of transforms) {
    result = await t.transform(result);
  }
  return result;
}

// Parallel — all transforms run simultaneously
async function runParallel(data, transforms) {
  const results = await Promise.all(
    transforms.map(t => t.transform(data))
  );
  return mergeResults(results);
}
```

### 6. Report Generation

Generate a summary report from processed data.

```js
function generateReport(data, fetchResults, processingTime) {
  return `
====================================
      DATA PIPELINE REPORT
====================================

Fetch Summary:
  Sources attempted: ${fetchResults.total}
  Successful: ${fetchResults.successful}
  Failed: ${fetchResults.failed}
  Total fetch time: ${fetchResults.totalTime}

Data Summary:
  Users: ${data.users?.length || 0}
  Products: ${data.products?.length || 0}
  Orders: ${data.orders?.length || 0}
  Reviews: ${data.reviews?.length || 0}

${data.stats ? `
Statistics:
  Total Revenue: $${data.stats.totalRevenue}
  Average Order: $${(data.stats.totalRevenue / data.orders.length).toFixed(2)}
` : ''}

Processing Time: ${processingTime}ms
Status: ${fetchResults.failed === 0 ? 'COMPLETE' : 'PARTIAL'}
====================================
`;
}
```

---

## Requirements

### Core Functions

1. **fetchWithRetry(source, options)** — Fetch with timeout, retry, and backoff
2. **fetchAllSources(sources, options)** — Parallel fetch with `Promise.allSettled`
3. **runPipeline(data, transforms)** — Execute transformation pipeline
4. **generateReport(data, fetchResults, time)** — Create formatted report

### Error Handling

- All fetch operations must have try/catch
- Failed sources should not crash the pipeline
- Partial results should still generate a report
- Log all errors with timestamps

### CLI Interface

```text
=== Async Data Pipeline Manager ===

1. Run full pipeline
2. Fetch data only
3. Process existing data
4. View last report
5. Exit

Choose an option:
```

---

## Project Structure

```
async-pipeline/
├── src/
│   ├── sources/
│   │   ├── users.js
│   │   ├── products.js
│   │   ├── orders.js
│   │   └── reviews.js
│   ├── pipeline/
│   │   ├── fetcher.js        # fetchWithRetry, fetchAllSources
│   │   ├── transforms.js     # Data transformations
│   │   └── reporter.js       # Report generation
│   ├── utils/
│   │   ├── delay.js          # Promise-based delay
│   │   ├── logger.js         # Timestamped logging
│   │   └── retry.js          # Retry utility
│   └── app.js                # Main application
├── index.js                  # Entry point
└── README.md
```

---

## Sample Data Sources

```js
// sources/users.js
export function fetchUsers() {
  return new Promise((resolve, reject) => {
    const delay = 500 + Math.random() * 1500;
    setTimeout(() => {
      if (Math.random() > 0.2) {
        resolve([
          { id: 1, name: "Ada Lovelace", email: "ada@example.com", isActive: true },
          { id: 2, name: "Grace Hopper", email: "grace@example.com", isActive: true },
          { id: 3, name: "Alan Turing", email: "alan@example.com", isActive: false },
          { id: 4, name: "Margaret Hamilton", email: "margaret@example.com", isActive: true }
        ]);
      } else {
        reject(new Error("Users API: Service unavailable"));
      }
    }, delay);
  });
}

// sources/products.js
export function fetchProducts() {
  return new Promise((resolve, reject) => {
    const delay = 800 + Math.random() * 1200;
    setTimeout(() => {
      if (Math.random() > 0.1) {
        resolve([
          { id: 1, name: "Laptop", price: 999, category: "Electronics" },
          { id: 2, name: "Keyboard", price: 79, category: "Electronics" },
          { id: 3, name: "Book", price: 29, category: "Education" }
        ]);
      } else {
        reject(new Error("Products API: Timeout"));
      }
    }, delay);
  });
}

// sources/orders.js
export function fetchOrders() {
  return new Promise((resolve, reject) => {
    const delay = 600 + Math.random() * 1000;
    setTimeout(() => {
      if (Math.random() > 0.3) {
        resolve([
          { id: 1, userId: 1, productId: 1, amount: 999, date: "2026-08-01" },
          { id: 2, userId: 2, productId: 2, amount: 79, date: "2026-08-05" },
          { id: 3, userId: 1, productId: 3, amount: 29, date: "2026-08-10" }
        ]);
      } else {
        reject(new Error("Orders API: Rate limited"));
      }
    }, delay);
  });
}

// sources/reviews.js
export function fetchReviews() {
  return new Promise((resolve, reject) => {
    const delay = 400 + Math.random() * 800;
    setTimeout(() => {
      if (Math.random() > 0.15) {
        resolve([
          { id: 1, productId: 1, rating: 5, text: "Excellent!" },
          { id: 2, productId: 2, rating: 4, text: "Good quality" },
          { id: 3, productId: 3, rating: 3, text: "Decent" }
        ]);
      } else {
        reject(new Error("Reviews API: Connection refused"));
      }
    }, delay);
  });
}
```

---

## Bonus Features

1. **Real API Integration:** Use actual HTTP requests with `fetch` instead of simulated data
2. **Export Report:** Save report to a file
3. **Pipeline History:** Store and display previous pipeline runs
4. **Custom Transforms:** Allow users to define their own transformations
5. **Concurrency Control:** Limit how many sources fetch simultaneously

---

## How to Run

1. Create the project folder
2. Create each file with the appropriate code
3. Run: `node index.js`

---

## Grading Rubric

| Criteria | Points |
|----------|--------|
| All async operations work correctly | 25% |
| Retry with exponential backoff works | 20% |
| Parallel fetching with Promise.allSettled | 20% |
| Proper error handling (try/catch, partial failures) | 15% |
| Clean async/await code | 10% |
| Formatted console output | 10% |

---

## Tips

1. Start with simulated sources — they're easier to test
2. Build the retry utility first — other functions depend on it
3. Use `console.log` with timestamps to verify timing
4. Test with different failure rates to ensure graceful degradation
5. The report should still generate even if some sources fail
