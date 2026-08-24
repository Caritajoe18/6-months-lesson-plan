# Day 1 — Callbacks, Callback Hell & The Event Loop

**Next:** [Day 2 — Promises](day-2-promises.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Understand what callbacks are and why they exist
- Recognize and avoid callback hell
- Explain the event loop mental model
- Differentiate between synchronous and asynchronous code
- Use `setTimeout`, `setInterval`, and `setImmediate`

---

## 1. What Is a Callback?

A callback is a **function passed as an argument** to another function, to be executed later.

```js
function greet(name, callback) {
  console.log(`Hello, ${name}`);
  callback();
}

greet("Ada", function () {
  console.log("Goodbye!");
});

// Output:
// Hello, Ada
// Goodbye!
```

### Why Callbacks?

JavaScript is **single-threaded** — it can only do one thing at a time. Callbacks let the program continue running while waiting for something (like a file read, API call, or timer).

```js
console.log("Start");

setTimeout(function () {
  console.log("Middle");
}, 2000);

console.log("End");

// Output:
// Start
// End
// Middle (after 2 seconds)
```

`setTimeout` doesn't block — it schedules a callback to run later.

---

## 2. Synchronous vs Asynchronous

### Synchronous Code (Blocking)

```js
console.log("A");
console.log("B");
console.log("C");

// Output:
// A
// B
// C
```

Each line waits for the previous one to finish.

### Asynchronous Code (Non-Blocking)

```js
console.log("A");

setTimeout(() => {
  console.log("B");
}, 0); // 0ms delay — still runs LAST

console.log("C");

// Output:
// A
// C
// B
```

Even with a 0ms delay, the callback goes to the **task queue** and runs after the current code finishes.

---

## 3. setTimeout and setInterval

### setTimeout

Executes a function **once** after a delay.

```js
setTimeout(function () {
  console.log("Runs after 1 second");
}, 1000);
```

### clearInterval

Executes a function **repeatedly** at intervals.

```js
let count = 0;

const interval = setInterval(function () {
  count++;
  console.log(`Count: ${count}`);

  if (count === 5) {
    clearInterval(interval); // Stop after 5
  }
}, 1000);

// Output:
// Count: 1
// Count: 2
// Count: 3
// Count: 4
// Count: 5
```

### clearTimeout / clearInterval

```js
const timer = setTimeout(() => {
  console.log("This will never run");
}, 5000);

clearTimeout(timer); // Cancel the timeout
```

---

## 4. Callback Patterns

### Node.js Style (Error-First Callbacks)

```js
function readFile(path, callback) {
  // Simulate reading a file
  setTimeout(() => {
    if (path) {
      callback(null, `Contents of ${path}`);
    } else {
      callback(new Error("No path provided"));
    }
  }, 1000);
}

readFile("/etc/passwd", function (err, data) {
  if (err) {
    console.error("Error:", err.message);
    return;
  }
  console.log("Data:", data);
});
```

The convention: first argument is error (or null), second is the result.

### Callback with Multiple Results

```js
function fetchUser(id, callback) {
  setTimeout(() => {
    callback(null, {
      id: id,
      name: "Ada",
      email: "ada@example.com"
    });
  }, 1000);
}

fetchUser(1, function (err, user) {
  if (err) {
    console.error(err);
    return;
  }
  console.log(user.name); // "Ada"
});
```

---

## 5. Callback Hell

When callbacks depend on each other, nesting grows deeper and deeper.

```js
getUser(1, function (err, user) {
  getOrders(user.id, function (err, orders) {
    getOrderDetails(orders[0].id, function (err, details) {
      getShippingInfo(details.shippingId, function (err, shipping) {
        console.log(shipping);
        // ... even deeper
      });
    });
  });
});
```

This is called the **pyramid of doom**:

```text
getUser
  └── getOrders
        └── getOrderDetails
              └── getShippingInfo
                    └── ... (indents keep growing)
```

### Problems with Callback Hell

| Problem | Impact |
|---------|--------|
| Hard to read | Indentation grows infinitely |
| Hard to debug | Error handling duplicated everywhere |
| Hard to maintain | Changing one level affects others |
| Hard to test | Functions are deeply coupled |

---

## 6. The Event Loop

The event loop is how JavaScript handles asynchronous operations despite being single-threaded.

### The Mental Model

```text
┌───────────────────────────────────┐
│            Call Stack              │  ← Where code executes
│        (Synchronous code)          │
└──────────────┬────────────────────┘
               │
               ▼
┌───────────────────────────────────┐
│          Web APIs / Node APIs     │  ← setTimeout, fetch, fs
│      (Browser or Node runtime)    │
└──────────────┬────────────────────┘
               │
               ▼
┌───────────────────────────────────┐
│           Callback Queue          │  ← Callbacks waiting to run
│        (Task / Microtask)         │
└──────────────┬────────────────────┘
               │
               ▼
┌───────────────────────────────────┐
│           Event Loop              │  ← Checks if call stack is empty
│      (Loops and picks tasks)      │     then pushes from queue
└───────────────────────────────────┘
```

### Step by Step

```js
console.log("1");                     // Call stack: executes immediately

setTimeout(() => {
  console.log("2");                   // Web API: schedules for 1s
}, 1000);

Promise.resolve().then(() => {
  console.log("3");                   // Microtask: runs after sync code
});

console.log("4");                     // Call stack: executes immediately

// Output:
// 1
// 4
// 3
// 2
```

### Task Queue vs Microtask Queue

```text
Microtask Queue (higher priority):
  - Promise.then/catch/finally
  - queueMicrotask()

Task Queue (lower priority):
  - setTimeout, setInterval
  - setImmediate (Node.js)
  - I/O callbacks
```

```js
console.log("Start");

setTimeout(() => console.log("Timeout"), 0);

Promise.resolve().then(() => console.log("Promise"));

queueMicrotask(() => console.log("Microtask"));

console.log("End");

// Output:
// Start
// End
// Microtask
// Promise
// Timeout
```

Microtasks run **before** the next task.

---

## 7. Event Loop in Action

### Example 1: Stacking Timers

```js
setTimeout(() => console.log("A"), 0);
setTimeout(() => console.log("B"), 0);
setTimeout(() => console.log("C"), 0);

// Output:
// A
// B
// C
```

They go to the queue in order and execute one at a time.

### Example 2: Blocking the Event Loop

```js
console.log("Start");

const start = Date.now();
while (Date.now() - start < 3000) {
  // Block for 3 seconds
}

console.log("End");

// Output (with 3 second delay):
// Start
// End
```

**Never block the event loop!** It freezes everything else.

### Example 3: I/O Operations

```js
const fs = require("fs");

console.log("Reading file...");

fs.readFile("/etc/passwd", function (err, data) {
  console.log("File read complete");
});

console.log("This runs first!");

// Output:
// Reading file...
// This runs first!
// File read complete (after I/O finishes)
```

---

## 8. Converting Callback Hell to Cleaner Code

### Before (Callback Hell)

```js
function getUserData(userId, callback) {
  getUser(userId, function (err, user) {
    if (err) return callback(err);
    getOrders(user.id, function (err, orders) {
      if (err) return callback(err);
      callback(null, { user, orders });
    });
  });
}
```

### After (Flattened Callbacks)

```js
function getUserData(userId, callback) {
  getUser(userId, function (err, user) {
    if (err) return callback(err);

    // No more nesting — flatten!
    getOrders(user.id, handleOrders);

    function handleOrders(err, orders) {
      if (err) return callback(err);
      callback(null, { user, orders });
    }
  });
}
```

### After (Using Promises — Preview of Day 2)

```js
function getUserData(userId) {
  return getUser(userId)
    .then(user => getOrders(user.id))
    .then(orders => ({ user: orders.user, orders }));
}
```

---

## 9. Common Mistakes

### Forgetting to Return

```js
function doSomething(callback) {
  callback();
  return; // Good practice — explicit return
}
```

### Swallowing Errors

```js
// ❌ Bad
readFile("path", function (err, data) {
  // Error ignored!
  console.log(data);
});

// ✅ Good
readFile("path", function (err, data) {
  if (err) {
    console.error("Failed:", err.message);
    return;
  }
  console.log(data);
});
```

### Not Canceling Intervals

```js
// ❌ Bad — keeps running forever
setInterval(() => {
  console.log("tick");
}, 1000);

// ✅ Good — cancel when done
const interval = setInterval(() => {
  console.log("tick");
}, 1000);

setTimeout(() => clearInterval(interval), 5000);
```

---

## Exercises

1. Write a function that takes a callback and calls it after 2 seconds.
2. Create three nested setTimeout calls to simulate callback hell, then flatten them.
3. Explain why `setTimeout(() => {}, 0)` doesn't execute immediately.
4. Write a function that uses setInterval to count down from 10 to 0.
5. Draw the event loop for this code and predict the output:
   ```js
   console.log("A");
   setTimeout(() => console.log("B"), 0);
   Promise.resolve().then(() => console.log("C"));
   console.log("D");
   ```

---

## Key Takeaways

- Callbacks are functions passed as arguments for later execution
- Callback hell is deep nesting that makes code hard to read and maintain
- The event loop lets JavaScript handle async despite being single-threaded
- Microtasks (Promises) run before macrotasks (setTimeout)
- Never block the event loop with long synchronous operations
- Promises and async/await solve callback hell (coming in Days 2 & 3)
