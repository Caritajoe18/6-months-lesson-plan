# Day 1 — Objects Deep Dive, Destructuring, Spread/Rest & Object Methods

## Learning Objectives

By the end of this lesson, you will be able to:

- Create and manipulate complex objects
- Use destructuring to extract values from objects
- Apply spread and rest operators with objects
- Iterate over objects using `Object.keys()`, `Object.values()`, and `Object.entries()`
- Nest objects and access deeply nested properties

---

## 1. Object Basics Review

An object is a collection of key-value pairs.

```js
const person = {
  name: "Ada",
  age: 30,
  isActive: true
};
```

**Key rules:**

- Keys are always strings (or Symbols)
- Values can be any data type
- Access with dot notation (`person.name`) or bracket notation (`person["name"]`)

---

## 2. Computed Property Keys

You can use expressions as keys by wrapping them in brackets:

```js
const field = "email";
const user = {
  name: "Ada",
  [field]: "ada@example.com"
};

console.log(user.email); // "ada@example.com"
```

---

## 3. Nested Objects

Objects can contain other objects:

```js
const student = {
  name: "John",
  address: {
    city: "Lagos",
    zip: "100001"
  },
  scores: [75, 82, 68]
};

// Access nested values
console.log(student.address.city);   // "Lagos"
console.log(student.scores[1]);      // 82
```

---

## 4. Destructuring

Destructuring lets you unpack values from objects into distinct variables.

### Basic Syntax

```js
const person = { name: "Ada", age: 30, city: "Lagos" };

const { name, age } = person;

console.log(name); // "Ada"
console.log(age);  // 30
```

### Renaming Variables

```js
const { name: fullName, age: years } = person;

console.log(fullName); // "Ada"
console.log(years);    // 30
```

### Default Values

```js
const { name, age, role = "student" } = person;

console.log(role); // "student" (not in object, so default is used)
```

### Nested Destructuring

```js
const student = {
  name: "John",
  address: {
    city: "Lagos",
    zip: "100001"
  }
};

const { name, address: { city } } = student;

console.log(name); // "John"
console.log(city); // "Lagos"
```

### Function Parameter Destructuring

```js
function greet({ name, age }) {
  console.log(`${name} is ${age} years old`);
}

greet({ name: "Ada", age: 30 }); // "Ada is 30 years old"
```

---

## 5. Spread Operator (`...`)

The spread operator expands an object's properties into another object or function call.

### Copying Objects

```js
const original = { a: 1, b: 2 };
const copy = { ...original };

console.log(copy); // { a: 1, b: 2 }
```

### Merging Objects

```js
const defaults = { color: "blue", size: "medium" };
const userPrefs = { color: "red" };

const settings = { ...defaults, ...userPrefs };

console.log(settings); // { color: "red", size: "medium" }
```

> Later properties override earlier ones with the same key.

### Adding New Properties

```js
const person = { name: "Ada" };
const updated = { ...person, age: 30, city: "Lagos" };

console.log(updated); // { name: "Ada", age: 30, city: "Lagos" }
```

---

## 6. Rest Operator (`...`)

The rest operator collects remaining properties into a new object.

### Extracting and Collecting

```js
const { name, ...rest } = { name: "Ada", age: 30, city: "Lagos" };

console.log(name); // "Ada"
console.log(rest); // { age: 30, city: "Lagos" }
```

### Function Parameters

```js
function logFirst({ first, ...others }) {
  console.log("First:", first);
  console.log("Rest:", others);
}

logFirst({ first: 1, second: 2, third: 3 });
// First: 1
// Rest: { second: 2, third: 3 }
```

---

## 7. Object.keys(), Object.values(), Object.entries()

These static methods return arrays of an object's keys, values, or key-value pairs.

### Object.keys()

```js
const user = { name: "Ada", age: 30, city: "Lagos" };

const keys = Object.keys(user);
console.log(keys); // ["name", "age", "city"]
```

### Object.values()

```js
const values = Object.values(user);
console.log(values); // ["Ada", 30, "Lagos"]
```

### Object.entries()

```js
const entries = Object.entries(user);
console.log(entries);
// [["name", "Ada"], ["age", 30], ["city", "Lagos"]]
```

### Iterating with for...of

```js
for (const [key, value] of Object.entries(user)) {
  console.log(`${key}: ${value}`);
}
// name: Ada
// age: 30
// city: Lagos
```

---

## 8. Other Useful Object Methods

### Object.assign()

```js
const target = { a: 1 };
const source = { b: 2, c: 3 };

Object.assign(target, source);
console.log(target); // { a: 1, b: 2, c: 3 }
```

> Prefer spread (`...`) for most use cases — it's cleaner.

### hasOwnProperty()

```js
const car = { make: "Toyota", model: "Camry" };

console.log(car.hasOwnProperty("make"));  // true
console.log(car.hasOwnProperty("color")); // false
```

---

## 9. Immutability with Objects

You can freeze an object to prevent modifications:

```js
const config = Object.freeze({
  apiUrl: "https://api.example.com",
  timeout: 5000
});

config.apiUrl = "https://other.com"; // Silently fails (or throws in strict mode)
console.log(config.apiUrl);          // "https://api.example.com"
```

> `Object.freeze()` is **shallow** — nested objects can still be modified.

---

## 10. Practical Examples

### Example 1: Merging User Data

```js
const user1 = { name: "Ada", age: 25 };
const user2 = { age: 30, city: "Lagos" };

const merged = { ...user1, ...user2 };
console.log(merged); // { name: "Ada", age: 30, city: "Lagos" }
```

### Example 2: Removing a Property

```js
const { name, ...rest } = { name: "Ada", age: 30, city: "Lagos" };

console.log(rest); // { age: 30, city: "Lagos" }
```

### Example 3: Counting Character Frequency

```js
function countChars(str) {
  const freq = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  return freq;
}

console.log(countChars("hello"));
// { h: 1, e: 1, l: 2, o: 1 }
```

---

## Exercises

1. Create an object representing a book with `title`, `author`, `year`, and `genres` (array). Destructure the title and the first genre.

2. Merge two objects using spread: `{ a: 1, b: 2 }` and `{ b: 3, c: 4 }`. What is the result for key `b`?

3. Write a function that accepts an object and returns a new object with all values uppercased (strings only).

4. Use `Object.entries()` to log every property of an object in the format `"key = value"`.

5. Create a nested object (at least 2 levels deep) and use destructuring to extract a deeply nested value.

---

## Key Takeaways

| Concept | Syntax | Purpose |
|---------|--------|---------|
| Destructuring | `const { a, b } = obj` | Extract values into variables |
| Spread | `{ ...obj }` | Copy/merge objects |
| Rest | `const { a, ...rest } = obj` | Collect remaining properties |
| Object.keys() | `Object.keys(obj)` | Array of keys |
| Object.values() | `Object.values(obj)` | Array of values |
| Object.entries() | `Object.entries(obj)` | Array of [key, value] pairs |
| Object.freeze() | `Object.freeze(obj)` | Make object immutable (shallow) |
