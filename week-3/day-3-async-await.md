# Day 3 — async/await, try/catch/finally & Error Handling Patterns

**Previous:** [Day 2 — Promises](day-2-promises.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Use `async` functions and `await` to write cleaner asynchronous code
- Handle errors with `try`, `catch`, and `finally`
- Apply error-handling patterns for real-world applications
- Avoid common async/await pitfalls
- Convert Promise-based code to async/await

---

## 1. What Is async/await?

`async/await` is syntactic sugar over Promises that makes asynchronous code look and behave like synchronous code.

```js
// Promise version
fetchUser(1)
  .then(user => fetchOrders(user.id))
  .then(orders => console.log(orders))
  .catch(err => console.error(err));

// async/await version
async function main() {
  try {
    const user = await fetchUser(1);
    const orders = await fetchOrders(user.id);
    console.log(orders);
  } catch (err) {
    console.error(err);
  }
}
```

---

## 2. The `async` Keyword

An `async` function always returns a Promise.

```js
async function greet() {
  return "Hello"; // Automatically wrapped in Promise
}

greet().then(msg => console.log(msg)); // "Hello"
```

### Even with return values

```js
async function getNumber() {
  return 42;
}

const result = getNumber();
console.log(result); // Promise { 42 } — it's a Promise!
console.log(await result); // 42
```

---

## 3. The `await` Keyword

`await` pauses execution until the Promise resolves, then returns the value.

```js
async function main() {
  const user = await fetchUser(1);  // Pauses here
  console.log(user.name);           // Runs after fetchUser resolves
}
```

### What You Can Await

```js
// ✅ Promises
const user = await fetchUser(1);

// ✅ Functions returning Promises
const data = await fetch("https://api.example.com/data");

// ✅ Promise.all results
const [users, orders] = await Promise.all([
  fetchUsers(),
  fetchOrders()
]);
```

### What You Cannot Await

```js
// ❌ Callbacks
const result = await setTimeout(() => {}, 1000); // Wrong!

// ❌ Plain values (no error, but pointless)
const x = await 42; // Works but unnecessary
```

---

## 4. try / catch / finally

### Basic Error Handling

```js
async function fetchUserData(userId) {
  try {
    const user = await fetchUser(userId);
    const orders = await fetchOrders(user.id);
    return { user, orders };
  } catch (error) {
    console.error("Failed to fetch user data:", error.message);
    throw error; // Re-throw if needed
  } finally {
    console.log("Operation complete");
    hideLoadingSpinner();
  }
}
```

### try/catch/finally Rules

| Block | Purpose | Required? |
|-------|---------|-----------|
| `try` | Code that might fail | Yes |
| `catch` | Handle the error | Optional (but recommended) |
| `finally` | Always runs (cleanup) | Optional |

### finally Always Runs

```js
async function example() {
  try {
    console.log("Try block");
    throw new Error("Oops");
  } catch (err) {
    console.log("Catch block");
  } finally {
    console.log("Finally block");
  }
}

// Output:
// Try block
// Catch block
// Finally block
```

---

## 5. Sequential vs Parallel Execution

### Sequential (Slow)

```js
async function loadData() {
  const users = await fetchUsers();     // Wait...
  const orders = await fetchOrders();   // Wait...
  const products = await fetchProducts(); // Wait...
  return { users, orders, products };
}
// Total time: sum of all three
```

### Parallel (Fast)

```js
async function loadData() {
  const [users, orders, products] = await Promise.all([
    fetchUsers(),
    fetchOrders(),
    fetchProducts()
  ]);
  return { users, orders, products };
}
// Total time: time of slowest only
```

### When to Use Each

| Pattern | Use When |
|---------|----------|
| Sequential | Each step depends on previous result |
| Parallel | Steps are independent |

---

## 6. Error Handling Patterns

### Pattern 1: Try/Catch with Re-throw

```js
async function createUser(data) {
  try {
    const user = await User.create(data);
    await sendWelcomeEmail(user.email);
    return user;
  } catch (error) {
    console.error("Create user failed:", error.message);
    throw error; // Let caller handle it
  }
}

// Caller
try {
  const user = await createUser({ name: "Ada", email: "ada@test.com" });
} catch (error) {
  showError(error.message);
}
```

### Pattern 2: Catch and Return Default

```js
async function fetchUserSettings(userId) {
  try {
    return await fetchSettings(userId);
  } catch (error) {
    return { theme: "light", language: "en" }; // Default settings
  }
}
```

### Pattern 3: Error Wrapper Utility

```js
// Utility to catch errors without try/catch
async function to(promise) {
  try {
    const result = await promise;
    return [null, result];
  } catch (error) {
    return [error, null];
  }
}

// Usage
async function main() {
  const [err, user] = await to(fetchUser(1));
  if (err) {
    console.error("Failed:", err.message);
    return;
  }
  console.log(user.name);
}
```

### Pattern 4: Graceful Degradation

```js
async function loadDashboard() {
  let user = null;
  let notifications = [];
  let stats = null;

  try {
    user = await fetchUser();
  } catch {
    console.error("Could not load user");
  }

  try {
    notifications = await fetchNotifications();
  } catch {
    console.error("Could not load notifications");
  }

  try {
    stats = await fetchStats();
  } catch {
    console.error("Could not load stats");
  }

  return { user, notifications, stats };
}
```

### Pattern 5: Retry with Delay

```js
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(1000 * (i + 1)); // 1s, 2s, 3s
    }
  }
}
```

---

## 7. async/await with Promise Methods

### Promise.all with async/await

```js
async function loadAll() {
  try {
    const [users, products] = await Promise.all([
      fetchUsers(),
      fetchProducts()
    ]);
    return { users, products };
  } catch (error) {
    console.error("One failed:", error.message);
  }
}
```

### Promise.allSettled with async/await

```js
async function loadPartial() {
  const results = await Promise.allSettled([
    fetchUsers(),
    fetchProducts(),
    fetchOrders()
  ]);

  const successful = results
    .filter(r => r.status === "fulfilled")
    .map(r => r.value);

  const failed = results
    .filter(r => r.status === "rejected")
    .map(r => r.reason.message);

  console.log("Loaded:", successful.length);
  console.log("Failed:", failed);
}
```

### Promise.race with async/await

```js
async function fetchWithTimeout(url, ms) {
  const fetchPromise = fetch(url).then(r => r.json());
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Timeout")), ms);
  });

  return Promise.race([fetchPromise, timeout]);
}
```

---

## 8. Top-Level await

In ES modules (`.mjs`), you can use `await` outside functions:

```js
// app.mjs
import { connectDB } from "./db.js";

const db = await connectDB(); // Top-level await!

const app = express();
app.use(db);
```

---

## 9. Common Pitfalls

### Pitfall 1: Unnecessary Sequential Awaits

```js
// ❌ Bad — slow
const users = await fetchUsers();
const products = await fetchProducts();

// ✅ Good — parallel
const [users, products] = await Promise.all([
  fetchUsers(),
  fetchProducts()
]);
```

### Pitfall 2: Missing try/catch

```js
// ❌ Bad — unhandled rejection
async function riskyOperation() {
  const data = await fetch("/api/risky");
  return data.json();
}

// ✅ Good — handle errors
async function riskyOperation() {
  try {
    const data = await fetch("/api/risky");
    return await data.json();
  } catch (error) {
    console.error("Risky operation failed:", error);
    throw error;
  }
}
```

### Pitfall 3: Awaiting in Loops

```js
// ❌ Bad — sequential
for (const id of userIds) {
  const user = await fetchUser(id); // Slow!
}

// ✅ Good — parallel
const users = await Promise.all(
  userIds.map(id => fetchUser(id))
);
```

### Pitfall 4: Forgetting async

```js
// ❌ Bad — returns Promise directly
function getData() {
  return await fetchUser(1); // Syntax error!
}

// ✅ Good — mark function as async
async function getData() {
  return await fetchUser(1);
}
```

---

## 10. Converting Promise Chains to async/await

### Before (Promise Chain)

```js
function processUser(userId) {
  return fetchUser(userId)
    .then(user => fetchOrders(user.id))
    .then(orders => {
      const total = orders.reduce((sum, o) => sum + o.amount, 0);
      return total;
    })
    .then(total => {
      console.log("Total:", total);
      return total;
    })
    .catch(err => {
      console.error(err);
      throw err;
    });
}
```

### After (async/await)

```js
async function processUser(userId) {
  try {
    const user = await fetchUser(userId);
    const orders = await fetchOrders(user.id);
    const total = orders.reduce((sum, o) => sum + o.amount, 0);
    console.log("Total:", total);
    return total;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
```

---

## Exercises

1. Convert this Promise chain to async/await:
   ```js
   fetchUser(1)
     .then(user => fetchOrders(user.id))
     .then(orders => orders.length);
   ```

2. Write an async function that fetches 3 URLs in parallel using `Promise.all`.

3. Implement the `to()` utility function that wraps a Promise into `[error, result]`.

4. Fix this code:
   ```js
   async function getData() {
     for (const id of ids) {
       const data = await fetchAllData(id);
     }
     return data;
   }
   ```

5. Write an async function with retry logic: if fetch fails, retry up to 3 times with 1-second delays.

---

## Key Takeaways

- `async/await` makes Promises easier to read and write
- `async` functions always return Promises
- `await` pauses until the Promise resolves
- Use `try/catch/finally` for error handling
- Run independent operations in parallel with `Promise.all`
- Don't await in loops — use `Promise.all` with `.map()`
- The `to()` utility avoids repetitive try/catch blocks
- Top-level await works in ES modules
