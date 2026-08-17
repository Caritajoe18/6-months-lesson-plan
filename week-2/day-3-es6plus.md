# Day 3 — ES6+ Features (Hands-On)

## Learning Objectives

By the end of this lesson, you will be able to:

- Write concise functions using arrow syntax
- Create classes with constructors, methods, and inheritance
- Organize code with `import`/`export` modules
- Safely access nested properties with optional chaining
- Handle null/undefined values with nullish coalescing

---

## 1. Arrow Functions

Arrow functions provide a shorter syntax for writing functions.

### Traditional Function

```js
function add(a, b) {
  return a + b;
}
```

### Arrow Function

```js
const add = (a, b) => a + b;
```

### Single Parameter (No Parentheses Needed)

```js
const double = n => n * 2;

console.log(double(5)); // 10
```

### No Parameters

```js
const greet = () => "Hello!";

console.log(greet()); // "Hello!"
```

### Multi-Line Arrow Function

```js
const calculate = (a, b) => {
  const sum = a + b;
  const product = a * b;
  return { sum, product };
};

console.log(calculate(3, 4)); // { sum: 7, product: 12 }
```

### Arrow Functions and `this`

Arrow functions do **not** have their own `this` — they inherit from the surrounding scope.

```js
const person = {
  name: "Ada",
  greet: function () {
    // Traditional function: 'this' refers to person
    console.log(`Hello, I'm ${this.name}`);
  },
  delayedGreet: function () {
    setTimeout(() => {
      // Arrow function: 'this' still refers to person
      console.log(`Hello, I'm ${this.name}`);
    }, 1000);
  }
};
```

### When NOT to Use Arrow Functions

- **Object methods** where you need `this`
- **Constructors** (use `class` instead)
- **Prototype methods**

```js
// Avoid
const person = {
  name: "Ada",
  greet: () => {
    console.log(this.name); // undefined — 'this' is wrong!
  }
};

// Prefer
const person = {
  name: "Ada",
  greet() {
    console.log(this.name); // "Ada"
  }
};
```

---

## 2. Classes

Classes provide a cleaner way to create objects and handle inheritance.

### Basic Class

```js
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }

  greet() {
    return `Hello, I'm ${this.name}`;
  }
}

const ada = new Person("Ada", 30);
console.log(ada.greet()); // "Hello, I'm Ada"
console.log(ada.name);    // "Ada"
```

### Methods

```js
class Calculator {
  constructor(value = 0) {
    this.value = value;
  }

  add(n) {
    this.value += n;
    return this; // enables chaining
  }

  subtract(n) {
    this.value -= n;
    return this;
  }

  getResult() {
    return this.value;
  }
}

const calc = new Calculator();
const result = calc.add(10).subtract(3).add(5).getResult();
console.log(result); // 12
```

### Inheritance

```js
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    return `${this.name} makes a sound`;
  }
}

class Dog extends Animal {
  speak() {
    return `${this.name} barks`;
  }
}

class Cat extends Animal {
  speak() {
    return `${this.name} meows`;
  }
}

const dog = new Dog("Rex");
const cat = new Cat("Whiskers");

console.log(dog.speak()); // "Rex barks"
console.log(cat.speak()); // "Whiskers meows"
```

### Super (Calling Parent Constructor)

```js
class Employee extends Person {
  constructor(name, age, role) {
    super(name, age); // call parent constructor
    this.role = role;
  }

  describe() {
    return `${this.greet()} and I'm a ${this.role}`;
  }
}

const emp = new Employee("John", 25, "Developer");
console.log(emp.describe()); // "Hello, I'm John and I'm a Developer"
```

### Static Methods

```js
class MathHelper {
  static add(a, b) {
    return a + b;
  }

  static multiply(a, b) {
    return a * b;
  }
}

console.log(MathHelper.add(2, 3));      // 5
console.log(MathHelper.multiply(4, 5)); // 20
// No need to create an instance
```

---

## 3. Import / Export (Modules)

Modules let you split code into separate files and share functionality between them.

### Named Exports

**math.js:**

```js
export const add = (a, b) => a + b;
export const subtract = (a, b) => a - b;
export const PI = 3.14159;
```

**app.js:**

```js
import { add, subtract, PI } from "./math.js";

console.log(add(2, 3));      // 5
console.log(subtract(10, 4)); // 6
console.log(PI);              // 3.14159
```

### Default Exports

**logger.js:**

```js
export default function log(message) {
  console.log(`[LOG]: ${message}`);
}
```

**app.js:**

```js
import log from "./logger.js";

log("Application started");
```

### Renaming Imports

```js
import { add as sum } from "./math.js";

console.log(sum(2, 3)); // 5
```

### Import Everything

```js
import * as math from "./math.js";

console.log(math.add(2, 3));
console.log(math.PI);
```

### Re-exporting

```js
export { add, subtract } from "./math.js";
```

---

## 4. Optional Chaining (`?.`)

Optional chaining safely accesses deeply nested properties without throwing an error if something is `null` or `undefined`.

### Problem Without Optional Chaining

```js
const user = {
  name: "Ada",
  address: {
    city: "Lagos"
  }
};

// This throws an error if 'profile' doesn't exist
console.log(user.profile?.bio); // TypeError: Cannot read property 'bio' of undefined
```

### Solution With Optional Chaining

```js
console.log(user.profile?.bio); // undefined — no error!
```

### Different Use Cases

```js
const user = {
  name: "Ada",
  address: {
    city: "Lagos"
  }
};

// Object property
console.log(user.address?.city);   // "Lagos"
console.log(user.profile?.bio);    // undefined

// Nested optional
console.log(user.address?.street?.name); // undefined

// Array access
const data = { items: [1, 2, 3] };
console.log(data.items?.[0]); // 1
console.log(data.tags?.[0]);  // undefined

// Method call
const user2 = { greet: () => "Hello" };
console.log(user2.greet?.()); // "Hello"
console.log(user2.farewell?.()); // undefined — no error!
```

---

## 5. Nullish Coalescing (`??`)

The nullish coalescing operator returns the right-hand value only when the left-hand value is `null` or `undefined`.

### The Problem with `||`

```js
const count = 0;
console.log(count || 10); // 10 — wrong! 0 is a valid value

const name = "";
console.log(name || "Anonymous"); // "Anonymous" — wrong! "" is intentional
```

### The Solution with `??`

```js
const count = 0;
console.log(count ?? 10); // 0 — correct!

const name = "";
console.log(name ?? "Anonymous"); // "" — correct!

const value = null;
console.log(value ?? "default"); // "default"

const value2 = undefined;
console.log(value2 ?? "default"); // "default"
```

### When to Use Which

| Operator | Falsy Values | Use Case |
|----------|-------------|----------|
| `||` | 0, "", false, null, undefined, NaN | When 0 or "" should also be replaced |
| `??` | null, undefined only | When 0 or "" are valid values |

### Chaining

```js
const config = {
  timeout: 0,
  retries: null
};

const timeout = config.timeout ?? 5000;    // 0
const retries = config.retries ?? 3;       // 3
const debug = config.debug ?? false;        // false (undefined ?? false)
```

---

## 6. Combining ES6+ Features

### Example: Data Processing Class

```js
class DataProcessor {
  constructor(data = []) {
    this.data = data;
  }

  filterBy(key, value) {
    return new DataProcessor(
      this.data.filter(item => item[key] === value)
    );
  }

  mapTo(key) {
    return this.data.map(item => item[key]);
  }

  reduce(fn, initial) {
    return this.data.reduce(fn, initial);
  }

  get length() {
    return this.data.length;
  }
}

const users = [
  { name: "Ada", age: 25, role: "dev" },
  { name: "John", age: 30, role: "dev" },
  { name: "Mary", age: 35, role: "pm" }
];

const devs = new DataProcessor(users)
  .filterBy("role", "dev");

console.log(devs.mapTo("name")); // ["Ada", "John"]
console.log(devs.length);        // 2
```

### Example: Safe Data Access

```js
const apiResponse = {
  data: {
    users: [
      { name: "Ada", address: { city: "Lagos" } },
      { name: "John", address: null }
    ]
  }
};

const users = apiResponse.data?.users ?? [];

const cities = users.map(user => user.address?.city ?? "Unknown");

console.log(cities); // ["Lagos", "Unknown"]
```

---

## Exercises

1. Convert these traditional functions to arrow functions:
   ```js
   function multiply(a, b) { return a * b; }
   function getFullName(first, last) { return first + " " + last; }
   ```

2. Create a `BankAccount` class with `deposit()`, `withdraw()`, and `getBalance()` methods. Ensure balance cannot go negative.

3. Create two files: `utils.js` with exported `capitalize()` and `reverse()` functions, and `app.js` that imports and uses them.

4. Write code using optional chaining and nullish coalescing to safely access:
   ```js
   const response = { data: { user: { profile: { name: "Ada" } } } };
   ```
   Get `response.data?.user?.profile?.name ?? "Anonymous"`.

5. Create a `Stack` class with `push()`, `pop()`, and `peek()` methods.

---

## Key Takeaways

| Feature | Syntax | Purpose |
|---------|--------|---------|
| Arrow Function | `() => {}` | Concise function syntax |
| Class | `class Foo {}` | Object-oriented patterns |
| Import/Export | `import {} from ""` | Code organization |
| Optional Chaining | `?.` | Safe property access |
| Nullish Coalescing | `??` | Default for null/undefined only |

**Remember:**
- Arrow functions inherit `this` — great for callbacks, not for methods
- Classes use `new` keyword and `constructor()`
- Modules need `"type": "module"` in `package.json` or `.mjs` extension
- `?.` prevents TypeError on null/undefined
- `??` only triggers on null/undefined, not other falsy values
