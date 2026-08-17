# Day 2 — Array Methods & Immutability Principles

## Learning Objectives

By the end of this lesson, you will be able to:

- Use `map()`, `filter()`, `reduce()`, `find()`, and `sort()` effectively
- Chain array methods together
- Understand and apply immutability principles
- Avoid common pitfalls with mutable array methods

---

## 1. Array Methods Overview

JavaScript arrays have powerful built-in methods that let you transform, search, and aggregate data without writing manual loops.

| Method | Returns | Mutates Original? |
|--------|---------|-------------------|
| `map()` | New array | No |
| `filter()` | New array | No |
| `reduce()` | Single value | No |
| `find()` | Single element | No |
| `sort()` | Same array | **Yes** |
| `forEach()` | undefined | No |
| `push/pop/splice` | varies | **Yes** |

---

## 2. map()

`map()` creates a new array by applying a function to each element.

```js
const numbers = [1, 2, 3, 4];
const doubled = numbers.map(n => n * 2);

console.log(doubled); // [2, 4, 6, 8]
console.log(numbers); // [1, 2, 3, 4] — unchanged
```

### With Objects

```js
const users = [
  { name: "Ada", age: 25 },
  { name: "John", age: 30 }
];

const names = users.map(u => u.name);
console.log(names); // ["Ada", "John"]
```

### Creating New Objects

```js
const products = [
  { name: "Shirt", price: 20 },
  { name: "Pants", price: 40 }
];

const withTax = products.map(p => ({
  ...p,
  priceWithTax: p.price * 1.1
}));

console.log(withTax);
// [{ name: "Shirt", price: 20, priceWithTax: 22 }, ...]
```

---

## 3. filter()

`filter()` creates a new array with elements that pass a test (return `true`).

```js
const numbers = [1, 2, 3, 4, 5, 6];
const evens = numbers.filter(n => n % 2 === 0);

console.log(evens); // [2, 4, 6]
```

### Filtering Objects

```js
const users = [
  { name: "Ada", age: 25 },
  { name: "John", age: 17 },
  { name: "Mary", age: 30 }
];

const adults = users.filter(u => u.age >= 18);
console.log(adults);
// [{ name: "Ada", age: 25 }, { name: "Mary", age: 30 }]
```

### Chaining filter

```js
const scores = [85, 42, 91, 63, 78, 55];

const passing = scores
  .filter(s => s >= 50)
  .filter(s => s >= 70);

console.log(passing); // [85, 91, 78]
```

---

## 4. reduce()

`reduce()` accumulates array elements into a single value.

### Syntax

```js
array.reduce((accumulator, currentValue, index, array) => {
  return newAccumulator;
}, initialValue);
```

### Sum of Numbers

```js
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((acc, n) => acc + n, 0);

console.log(sum); // 15
```

### Finding the Max

```js
const scores = [72, 85, 91, 64, 88];
const highest = scores.reduce((max, score) => {
  return score > max ? score : max;
}, scores[0]);

console.log(highest); // 91
```

### Counting Occurrences

```js
const fruits = ["apple", "banana", "apple", "orange", "banana", "apple"];
const freq = fruits.reduce((acc, fruit) => {
  acc[fruit] = (acc[fruit] || 0) + 1;
  return acc;
}, {});

console.log(freq);
// { apple: 3, banana: 2, orange: 1 }
```

### Grouping by Property

```js
const people = [
  { name: "Ada", city: "Lagos" },
  { name: "John", city: "Abuja" },
  { name: "Mary", city: "Lagos" }
];

const grouped = people.reduce((acc, person) => {
  const city = person.city;
  if (!acc[city]) acc[city] = [];
  acc[city].push(person);
  return acc;
}, {});

console.log(grouped);
// { Lagos: [{ name: "Ada" }, { name: "Mary" }], Abuja: [{ name: "John" }] }
```

---

## 5. find()

`find()` returns the **first** element that passes a test.

```js
const users = [
  { name: "Ada", age: 25 },
  { name: "John", age: 17 },
  { name: "Mary", age: 30 }
];

const minor = users.find(u => u.age < 18);
console.log(minor); // { name: "John", age: 17 }
```

### findIndex()

Returns the **index** of the first match (-1 if not found):

```js
const index = users.findIndex(u => u.name === "Mary");
console.log(index); // 2
```

---

## 6. sort()

`sort()` sorts an array **in place** (mutates the original).

### Default Sort (Lexicographic)

```js
const nums = [40, 1, 5, 200];
nums.sort();
console.log(nums); // [1, 200, 40, 5] — wrong!
```

### Numeric Sort

```js
const nums = [40, 1, 5, 200];
nums.sort((a, b) => a - b);
console.log(nums); // [1, 5, 40, 200]
```

### Sort Objects

```js
const users = [
  { name: "Ada", age: 25 },
  { name: "John", age: 17 },
  { name: "Mary", age: 30 }
];

users.sort((a, b) => a.age - b.age);
console.log(users);
// [{ name: "John", age: 17 }, { name: "Ada", age: 25 }, { name: "Mary", age: 30 }]
```

### Non-Mutating Sort

```js
const original = [40, 1, 5, 200];
const sorted = [...original].sort((a, b) => a - b);

console.log(sorted);  // [1, 5, 40, 200]
console.log(original); // [40, 1, 5, 200] — unchanged
```

---

## 7. forEach()

`forEach()` executes a function for each element but returns `undefined`.

```js
const names = ["Ada", "John", "Mary"];

names.forEach((name, index) => {
  console.log(`${index + 1}. ${name}`);
});
// 1. Ada
// 2. John
// 3. Mary
```

> Use `map()` when you need a new array. Use `forEach()` when you just need side effects (like logging).

---

## 8. Method Chaining

You can chain array methods together for clean data pipelines.

```js
const orders = [
  { product: "Shirt", amount: 20, status: "completed" },
  { product: "Pants", amount: 40, status: "pending" },
  { product: "Shoes", amount: 60, status: "completed" },
  { product: "Hat", amount: 15, status: "completed" }
];

const totalCompleted = orders
  .filter(o => o.status === "completed")
  .map(o => o.amount)
  .reduce((sum, amt) => sum + amt, 0);

console.log(totalCompleted); // 95
```

---

## 9. Immutability Principles

Immutability means not changing data directly. Instead, create new copies with changes applied.

### Why Immutability?

- Prevents bugs from unexpected changes
- Makes code predictable and easier to debug
- Required in frameworks like React

### Mutable vs Immutable

**Mutable (avoid):**

```js
const users = ["Ada", "John"];
users.push("Mary");        // modifies original
users[0] = "Eve";          // modifies original
```

**Immutable (prefer):**

```js
const users = ["Ada", "John"];

const updated = [...users, "Mary"];  // new array
const replaced = users.map((u, i) => i === 0 ? "Eve" : u); // new array

console.log(users);    // ["Ada", "John"] — unchanged
console.log(updated);  // ["Ada", "John", "Mary"]
console.log(replaced); // ["Eve", "John"]
```

### Spread for Immutable Updates

```js
const user = { name: "Ada", age: 25 };

const updatedUser = { ...user, age: 26 };

console.log(user);       // { name: "Ada", age: 25 } — unchanged
console.log(updatedUser); // { name: "Ada", age: 26 }
```

### Filter Instead of splice

```js
const items = ["a", "b", "c", "d"];

// Avoid
items.splice(1, 1); // removes "b", mutates array

// Prefer
const remaining = items.filter((_, i) => i !== 1);
console.log(remaining); // ["a", "c", "d"]
```

---

## 10. Common Pitfalls

### Pitfall 1: sort() Mutates

```js
const nums = [3, 1, 2];
nums.sort((a, b) => a - b);
console.log(nums); // [1, 2, 3] — original changed!
```

**Fix:** `[...nums].sort(...)` or `nums.toSorted()` (ES2023)

### Pitfall 2: map() vs forEach()

```js
const result = [1, 2, 3].forEach(n => n * 2);
console.log(result); // undefined — forEach returns nothing!
```

**Fix:** Use `map()` when you need the result.

### Pitfall 3: Forgetting to Return in arrow functions

```js
const doubled = [1, 2, 3].map(n => { n * 2 }); // Wrong — returns undefined
const doubled = [1, 2, 3].map(n => n * 2);      // Correct
```

---

## Exercises

1. Given `const nums = [5, 2, 8, 1, 9, 3]`, use `filter()` to get numbers greater than 4, then `map()` to double them.

2. Use `reduce()` to calculate the average of an array of numbers.

3. Given an array of objects `[{name: "Ada", score: 85}, {name: "John", score: 62}]`, find the person with the highest score using `reduce()`.

4. Create an array of objects with a `completed` boolean. Use `filter()` to get completed items, then `map()` to extract their names.

5. Given `const words = ["hello", "world", "hello", "js", "hello"]`, use `reduce()` to count how many times each word appears.

---

## Key Takeaways

| Method | Purpose | Mutates? |
|--------|---------|----------|
| `map()` | Transform each element | No |
| `filter()` | Keep elements that pass a test | No |
| `reduce()` | Accumulate into single value | No |
| `find()` | Get first matching element | No |
| `sort()` | Sort elements | **Yes** |
| `forEach()` | Execute side effect per element | No |

**Golden rule:** Prefer methods that return new arrays over those that mutate.
