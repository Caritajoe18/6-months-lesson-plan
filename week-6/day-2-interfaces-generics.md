# Day 2 — Interfaces, Type Aliases, Unions & Generics

**Previous:** [Day 1 — TypeScript Introduction](day-1-typescript-introduction.md)
**Next:** [Day 3 — Classes & Advanced Types](day-3-classes-advanced-types.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Model data shapes with `interface` and `type`
- Understand when to use each
- Work with unions, intersections, and narrowing
- Type function parameters, returns, and callbacks
- Write reusable code with generics

---

## 1. Describing Shapes

TypeScript's killer feature: describe the "shape" of your data.

### interface

```ts
interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

// use it like any type
function greet(user: User): string {
  return `Hello, ${user.name}!`;
}

const ada: User = {
  id: 1,
  name: "Ada",
  email: "ada@example.com",
  isActive: true
};

console.log(greet(ada));
```

### type alias

```ts
type User = {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
};
```

### interface vs type

| Feature | interface | type |
|---------|-----------|------|
| Objects | Preferred choice | Works too |
| Unions / intersections | No (ugly) | Yes (strength) |
| Extends | `extends` | `&` |
| Declaration merging | Yes | No |
| Primitives | No | Yes (`type UserId = string`) |

```ts
// interface CAN extend
interface Admin extends User {
  permissions: string[];
}

// type CAN extend (intersection)
type Admin = User & {
  permissions: string[];
};
```

> Class convention: use `interface` for object contracts, `type` for unions, tuples, primitives, and when composing with `&`.

---

## 2. Optional & Readonly Properties

```ts
interface Profile {
  name: string;
  age?: number;          // optional — may be absent
  readonly id: string;   // can't be reassigned
}

const p: Profile = { name: "Ada", id: "u-1" }; // age omitted → OK

p.id = "u-2"; // ❌ Cannot assign to 'id' because it is a read-only property
```

---

## 3. Index Signatures

When the keys aren't known ahead of time:

```ts
interface Settings {
  [key: string]: string;   // any string key → string value
}

const settings: Settings = {
  theme: "dark",
  locale: "en-US",
  language: "en"
};
```

---

## 4. Unions

A value that can be **one of several types**.

```ts
type Status = "pending" | "complete" | "failed";
type ID = string | number;
type Result = Success | Failure;
```

### Discriminated Unions — the pattern you'll use daily

```ts
// Each member has a shared "kind" field
interface Success {
  kind: "success";
  data: string[];
}

interface Failure {
  kind: "failure";
  error: string;
}

type APIResult = Success | Failure;

function handle(result: APIResult) {
  switch (result.kind) {
    case "success":
      console.log(result.data);      // safe: data exists only here
      break;
    case "failure":
      console.error(result.error);   // safe: error exists only here
      break;
  }
}
```

This is how **many real APIs model errors** — and `never` can guarantee exhaustiveness:

```ts
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

// If you add a third "kind" later, the default branch errors out at compile time.
```

---

## 5. Narrowing

TypeScript narrows a union down based on checks.

```ts
function format(value: string | number): string {
  if (typeof value === "string") {
    return value.toUpperCase();        // narrowed to string
  }
  return value.toFixed(2);             // narrowed to number
}
```

### Common Narrowing Checks

| Check | Narrowed to |
|-------|-------------|
| `typeof x === "string"` | `string` |
| `Array.isArray(x)` | `any[]` |
| `if (x)` | removes null/undefined-ish values |
| `"prop" in x` | object with that property |
| `x instanceof Date` | `Date` |
| `x.kind === "success"` | discriminated member |

---

## 6. Function Types

### Simple Function Types

```ts
type Greeter = (name: string) => string;

const greet: Greeter = (name) => `Hello, ${name}!`;
```

### Typed Parameters & Returns

```ts
function add(a: number, b: number): number {
  return a + b;
}
```

### Optional & Default Parameters

```ts
function log(message: string, level?: string): void {
  console.log(`[${level ?? "info"}] ${message}`);
}

function multiply(a: number, b: number = 1): number {
  return a * b;
}
```

### Rest Parameters (typed)

```ts
function sum(...nums: number[]): number {
  return nums.reduce((total, n) => total + n, 0);
}

sum(1, 2, 3); // 6
```

---

## 7. Callbacks & Function Arguments

```ts
// Higher-order function with typed callback
function processItems(items: number[], callback: (item: number) => number): number[] {
  return items.map(callback);
}

const doubled = processItems([1, 2, 3], (n) => n * 2);
console.log(doubled); // [2, 4, 6]
```

### Array Built-ins Are Typed Too

```ts
type User = { id: number; name: string; role: "admin" | "user" };

const users: User[] = [
  { id: 1, name: "Ada", role: "admin" },
  { id: 2, name: "Grace", role: "user" }
];

// Callback params are inferred.
const admin = users.find((u) => u.role === "admin");
// admin: User | undefined — guard it!
```

---

## 8. Overloads

A function changes its return type based on arguments.

```ts
function getValue(x: string): string;
function getValue(x: number): number;
function getValue(x: string | number): string | number {
  return x;
}

const a = getValue("hello"); // string
const b = getValue(42);      // number
```

---

## 9. Generics

Generics let you write **reusable functions/classes** that work with *any* type while keeping the type information.

### The Problem

```ts
// With any — loses all type safety
function identity(value: any): any {
  return value;
}
const x: number = identity("no warning!"); // 😬 silently broken

// With generics— preserves the type
function identity<T>(value: T): T {
  return value;
}
const y: number = identity(42);   // ✅ number in, number out
const z: string = identity("hi"); // ✅ string in, string out
```

### Generic Syntax

```ts
// T is a "type parameter" — a placeholder filled by usage
function firstElement<T>(arr: T[]): T | undefined {
  return arr[0];
}

const first = firstElement([10, 20, 30]);   // number | undefined
const firstStr = firstElement(["a", "b"]);  // string | undefined
```

### Generic Interface

```ts
interface ApiResponse<T> {
  status: number;
  data: T;
  error: null;
}

const userRes: ApiResponse<User> = {
  status: 200,
  data: { id: 1, name: "Ada", role: "admin" },
  error: null
};

const listRes: ApiResponse<User[]> = {
  status: 200,
  data: [
    { id: 1, name: "Ada", role: "admin" },
    { id: 2, name: "Grace", role: "user" }
  ],
  error: null
};
```

### Generic Functions With Constraints

```ts
// Constrain T to things that have a "length"
function showLength<T extends { length: number }>(value: T): number {
  return value.length;
}

showLength("hello");   // 5
showLength([1, 2, 3]); // 3
showLength(42);        // ❌ number has no .length
```

### Multiple Type Parameters

```ts
function toPair<A, B>(a: A, b: B): [A, B] {
  return [a, b];
}

const pair = toPair("height", 36); // [string, number]
```

### Suggestions for Naming

```text
T     → Type (generic)
K     → Key
V     → Value
E     → Element
U     → Second type parameter
```

---

## 10. A Realistic Example: Typed Store

```ts
interface Store<T> {
  items: T[];
  add(item: T): void;
  getById(id: number): T | undefined;
}

class InMemoryStore<T extends { id: number }> implements Store<T> {
  private _items: T[] = [];

  get items(): T[] {
    return this._items;
  }

  add(item: T): void {
    this._items.push(item);
  }

  getById(id: number): T | undefined {
    return this._items.find((item) => item.id === id);
  }
}

interface Product {
  id: number;
  name: string;
  price: number;
}

const products = new InMemoryStore<Product>();
products.add({ id: 1, name: "Laptop", price: 999 });
console.log(products.getById(1)?.name); // Laptop
```

---

## 11. Common Pitfalls

```text
❌ interface User { age: number } — but you pass age: notANumber
   → TS catches it if the source is typed. Type your boundaries!

❌ Overusing `any` to "make it compile"
   → Your types are where the safety lives.

❌ Using `type`/`interface` WITHOUT strict mode
   → strictNullChecks catches your undefined bugs.

❌ Forgetting a discriminated union's "kind"
   → TS can't help you switch on something it can't see.
```

---

## Exercises

1. Define a `Book` interface with `id`, `title`, `author`, `publishedYear?`, and `readonly isbn`.
2. Create a discriminated union `Shape` for `Circle` (`radius`) and `Square` (`side`), derive an `area(shape)` function with `never` exhaustiveness.
3. Write a generic `Box<T>` and use it for `Box<string>` and `Box<number[]>`.
4. Write a `filterValid` generic that takes `T | null` array and returns `T[]`.
5. Create a generic `ApiResponse<T>` and use it for three different payload types.

---

## Key Takeaways

- `interface` for object contracts; `type` for unions, primitives, composition
- Discriminated unions + `never` = safe, exhaustive switch logic
- Narrowing refines unions through `typeof`, `in`, `instanceof`
- Type your function boundaries (params, returns, callbacks)
- Generics preserve type information in reusable code
- Constrain generics with `extends` when you need shape guarantees