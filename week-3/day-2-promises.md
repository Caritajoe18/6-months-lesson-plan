# Day 2 — Promises, Chaining & Promise Methods

**Previous:** [Day 1 — Callbacks & Event Loop](day-1-callbacks-event-loop.md)
**Next:** [Day 3 — async/await & Error Handling](day-3-async-await.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Create and use Promises
- Chain `.then()`, `.catch()`, and `.finally()`
- Handle multiple promises with `Promise.all`, `Promise.allSettled`, `Promise.race`, `Promise.any`
- Convert callback-based code to Promises
- Avoid common Promise pitfalls

---

## 1. What Is a Promise?

A Promise is an object representing the **eventual completion or failure** of an asynchronous operation.

```text
Three States:
┌─────────────┐
│  Pending    │  ← Operation in progress
└──────┬──────┘
       │
  ┌────┴────┐
  │         │
  ▼         ▼
Fulfilled   Rejected
(Success)   (Failure)
```

### Creating a Promise

```js
const myPromise = new Promise(function (resolve, reject) {
  const success = true;

  if (success) {
    resolve("Operation completed!");
  } else {
    reject(new Error("Something went wrong"));
  }
});
```

### Using a Promise

```js
myPromise
  .then(function (result) {
    console.log(result); // "Operation completed!"
  })
  .catch(function (error) {
    console.error(error.message); // "Something went wrong"
  });
```

---

## 2. Promises vs Callbacks

### Before (Callback)

```js
function fetchUser(id, callback) {
  setTimeout(() => {
    callback(null, { id, name: "Ada" });
  }, 1000);
}

fetchUser(1, function (err, user) {
  if (err) return console.error(err);
  console.log(user.name);
});
```

### After (Promise)

```js
function fetchUser(id) {
  return new Promise(function (resolve, reject) {
    setTimeout(() => {
      resolve({ id, name: "Ada" });
    }, 1000);
  });
}

fetchUser(1)
  .then(function (user) {
    console.log(user.name); // "Ada"
  })
  .catch(function (err) {
    console.error(err);
  });
```

### Advantages of Promises

| Aspect | Callbacks | Promises |
|--------|-----------|----------|
| Nesting | Deep nesting | Flat chaining |
| Error handling | Duplicated | Centralized `.catch()` |
| Readability | Pyramid of doom | Linear flow |
| Composability | Difficult | `Promise.all` etc. |

---

## 3. Promise Chaining

Chain multiple `.then()` calls to avoid nesting.

```js
getUser(1)
  .then(function (user) {
    return getOrders(user.id);
  })
  .then(function (orders) {
    return getOrderDetails(orders[0].id);
  })
  .then(function (details) {
    console.log(details);
  })
  .catch(function (err) {
    console.error("Something failed:", err.message);
  });
```

### How Chaining Works

```text
getUser(1)
  .then(...)  → returns a NEW promise
  .then(...)  → receives result of previous .then
  .then(...)  → receives result of previous .then
  .catch(...) → catches ANY error from any .then above
```

### Returning Values in Chains

```js
fetchUser(1)
  .then(function (user) {
    return user.name;  // Return a plain value
  })
  .then(function (name) {
    console.log(name); // "Ada" — previous .then returned this
  });
```

### Returning Promises in Chains

```js
fetchUser(1)
  .then(function (user) {
    return fetchOrders(user.id); // Returns a Promise
  })
  .then(function (orders) {
    // orders is the resolved value of fetchOrders
    console.log(orders);
  });
```

---

## 4. .catch() — Error Handling

### Single .catch at End

```js
fetchUser(1)
  .then(user => fetchOrders(user.id))
  .then(orders => fetchDetails(orders[0].id))
  .then(details => console.log(details))
  .catch(err => {
    // Catches error from ANY step above
    console.error("Failed:", err.message);
  });
```

### Inline .catch

```js
fetchUser(1)
  .then(
    user => fetchOrders(user.id),
    err => {
      console.error("User fetch failed:", err.message);
      return []; // Recovery — return default value
    }
  )
  .then(orders => {
    console.log(orders); // [] or actual orders
  });
```

### .catch() Returns a Promise

```js
fetchUser(1)
  .then(user => fetchOrders(user.id))
  .catch(err => {
    console.error("Error:", err.message);
    return []; // Recovery — chain continues with []
  })
  .then(orders => {
    // Runs with [] if there was an error
    // Runs with actual orders if no error
    console.log(orders);
  });
```

---

## 5. .finally() — Cleanup

Runs regardless of success or failure:

```js
fetchUser(1)
  .then(user => {
    console.log("User:", user.name);
  })
  .catch(err => {
    console.error("Error:", err.message);
  })
  .finally(() => {
    // Always runs — good for cleanup
    console.log("Operation complete");
    hideLoadingSpinner();
  });
```

---

## 6. Promise.all()

Waits for **all** promises to resolve. Fails if **any** promise rejects.

```js
const p1 = fetch("/api/users").then(r => r.json());
const p2 = fetch("/api/products").then(r => r.json());
const p3 = fetch("/api/orders").then(r => r.json());

Promise.all([p1, p2, p3])
  .then(function (results) {
    const [users, products, orders] = results;
    console.log("All loaded:", users.length, products.length, orders.length);
  })
  .catch(function (err) {
    console.error("One failed:", err.message);
  });
```

### Promise.all() Behavior

```text
All resolve  → .then() receives array of results
Any rejects → .catch() receives first rejection
```

---

## 7. Promise.allSettled()

Waits for **all** promises to complete, regardless of success or failure.

```js
const p1 = fetch("/api/users").then(r => r.json());
const p2 = fetch("/api/broken").then(r => r.json()); // Will fail
const p3 = fetch("/api/orders").then(r => r.json());

Promise.allSettled([p1, p2, p3])
  .then(function (results) {
    results.forEach(function (result) {
      if (result.status === "fulfilled") {
        console.log("Success:", result.value);
      } else {
        console.log("Failed:", result.reason.message);
      }
    });
  });
```

### Result Shape

```js
[
  { status: "fulfilled", value: [...] },     // Success
  { status: "rejected", reason: Error },     // Failure
  { status: "fulfilled", value: [...] }      // Success
]
```

### Promise.allSettled() Behavior

```text
All resolve  → .then() with all results (mixed status)
Any rejects → Still .then() with all results
Never → .catch()
```

---

## 8. Promise.race()

Resolves or rejects with the **first** promise to settle.

```js
const fast = new Promise(resolve => setTimeout(() => resolve("fast"), 100));
const slow = new Promise(resolve => setTimeout(() => resolve("slow"), 5000));

Promise.race([fast, slow])
  .then(result => console.log(result)); // "fast"
```

### Race for Timeout

```js
function fetchWithTimeout(url, timeoutMs) {
  const fetchPromise = fetch(url).then(r => r.json());
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Timeout")), timeoutMs);
  });

  return Promise.race([fetchPromise, timeoutPromise]);
}

fetchWithTimeout("/api/data", 3000)
  .then(data => console.log(data))
  .catch(err => console.error(err.message)); // "Timeout" if slow
```

---

## 9. Promise.any()

Resolves with the **first successful** promise. Ignores rejections.

```js
const p1 = new Promise((_, reject) => reject("fail1"));
const p2 = new Promise(resolve => setTimeout(() => resolve("success"), 100));
const p3 = new Promise((_, reject) => reject("fail3"));

Promise.any([p1, p2, p3])
  .then(result => console.log(result)); // "success"
```

### All Fail — AggregateError

```js
const p1 = Promise.reject("fail1");
const p2 = Promise.reject("fail2");

Promise.any([p1, p2])
  .catch(err => {
    console.log(err instanceof AggregateError); // true
    console.log(err.errors); // ["fail1", "fail2"]
  });
```

---

## 10. Promise Methods Comparison

| Method | Resolves When | Rejects When | Use Case |
|--------|---------------|--------------|----------|
| `Promise.all` | All resolve | Any rejects | All-or-nothing |
| `Promise.allSettled` | All settle | Never | Partial results OK |
| `Promise.race` | First settles | First settles | Timeout |
| `Promise.any` | First resolves | All reject | First success |

---

## 11. Converting Callbacks to Promises

### Manual Conversion

```js
// Callback version
function getUser(id, callback) {
  setTimeout(() => {
    callback(null, { id, name: "Ada" });
  }, 1000);
}

// Promise version
function getUser(id) {
  return new Promise(function (resolve, reject) {
    setTimeout(() => {
      resolve({ id, name: "Ada" });
    }, 1000);
  });
}
```

### promisify (Node.js)

```js
const { promisify } = require("util");
const fs = require("fs");

const readFile = promisify(fs.readFile);

readFile("/etc/passwd", "utf8")
  .then(data => console.log(data.slice(0, 100)))
  .catch(err => console.error(err));
```

### Promise.all for Parallel Execution

```js
// ❌ Sequential — slow
getUser(1)
  .then(user => getUser(2))
  .then(user2 => getUser(3))
  .then(user3 => console.log("Done"));

// ✅ Parallel — fast
Promise.all([
  getUser(1),
  getUser(2),
  getUser(3)
])
  .then(([user1, user2, user3]) => {
    console.log("Done — all loaded in parallel");
  });
```

---

## 12. Common Pitfalls

### Pitfall 1: Not Returning in .then()

```js
// ❌ Bad — next .then receives undefined
fetchUser(1)
  .then(user => {
    fetchOrders(user.id); // Forgot return!
  })
  .then(orders => {
    console.log(orders); // undefined
  });

// ✅ Good
fetchUser(1)
  .then(user => {
    return fetchOrders(user.id);
  })
  .then(orders => {
    console.log(orders); // actual orders
  });
```

### Pitfall 2: Not Catching Errors

```js
// ❌ Bad — unhandled rejection
fetchUser(1)
  .then(user => fetchOrders(user.id))
  .then(orders => console.log(orders));
// If fetchUser fails, no .catch()!

// ✅ Good
fetchUser(1)
  .then(user => fetchOrders(user.id))
  .then(orders => console.log(orders))
  .catch(err => console.error(err));
```

### Pitfall 3: Swallowing Errors in .catch()

```js
// ❌ Bad — error hidden
fetchUser(1)
  .catch(err => {
    // Silently ignore
  });

// ✅ Good — log or re-throw
fetchUser(1)
  .catch(err => {
    console.error(err);
    throw err; // Re-throw for upstream handling
  });
```

---

## Exercises

1. Convert this callback to a Promise:
   ```js
   function delay(ms, callback) {
     setTimeout(callback, ms);
   }
   ```

2. Chain three `.then()` calls to: fetch a user → fetch their orders → find the most expensive order.

3. Use `Promise.all` to fetch 3 different URLs in parallel.

4. Use `Promise.race` to implement a 5-second timeout for a fetch request.

5. Predict the output:
   ```js
   Promise.resolve(1)
     .then(x => x + 1)
     .then(x => { throw new Error("oops") })
     .catch(() => 1)
     .then(x => x + 1)
     .then(x => console.log(x));
   ```

---

## Key Takeaways

- Promises represent future values (pending, fulfilled, rejected)
- `.then()` chains avoid callback hell
- `.catch()` at the end handles errors from any step
- `.finally()` runs regardless of outcome
- `Promise.all` — all must succeed
- `Promise.allSettled` — all must complete (success or failure)
- `Promise.race` — first to settle wins
- `Promise.any` — first success wins
- Always return values in `.then()` chains
