# Day 1 — TypeScript Introduction: Setup, Primitives & Type Inference

**Next:** [Day 2 — Interfaces, Unions & Generics](day-2-interfaces-generics.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Explain why TypeScript exists and what problem it solves
- Install and configure TypeScript in a project
- Understand the compile step and `tsconfig.json`
- Annotate primitive types and read type errors
- Rely on type inference where appropriate

---

## 1. Why TypeScript?

JavaScript is loosely typed:

```js
function add(a, b) {
  return a + b;
}

add(2, "3")    // "23" — bugs silently, no error
add(undefined, 5) // NaN — no warning
```

TypeScript adds **static typing**: it checks types *before* your code runs.

```ts
function add(a: number, b: number): number {
  return a + b;
}

add(2, "3"); // ❌ Argument of type 'string' is not assignable to parameter
```

### The Problem TypeScript Solves

```text
❌ JavaScript:
   Typo in property?  → error only when that branch runs
   Wrong argument?    → silently returns wrong value

✅ TypeScript:
   Type errors surface at compile time — before runtime
   Your editor shows errors as you type
   Refactoring is safe (the compiler finds every use)
```

### TypeScript IS JavaScript

```text
TypeScript = JavaScript + types

Every valid JS file is valid TS (mostly).
TS compiles (transpiles) down to plain JS.
TS types are erased at runtime — no runtime cost.
```

---

## 2. Fast Facts

| Fact | Detail |
|------|--------|
| Created by | Microsoft (open source) |
| First release | 2012 |
| Current major | TypeScript 5.x |
| File extension | `.ts` (and `.tsx` for React) |
| Runs on | Any JS runtime (compiles down) |
| Relationship | Strict superset of JavaScript |

### Who Uses TypeScript?

```text
Angular          → written in TS
Visual Studio    → fully TS-based UI
Node.js          → has built-in TS support (v22+ typed, v23 stable)
Express apps     → most modern templates are .ts
React/Vue        → .tsx / .ts everywhere
```

---

## 3. Setup & Installation

### Option A: Install Globally

```bash
npm install -g typescript
tsc --version
```

### Option B: Local to a Project (recommended)

```bash
mkdir ts-playground && cd ts-playground
npm init -y
npm install -D typescript

# TypeScript is a devDependency —
# it's a build tool, not shipped to production
```

### The TypeScript Toolchain

```text
npm install   ──▶  typescript (tsc = TypeScript Compiler)

tsc file.ts   ──▶  compiler checks types
                    and emits JavaScript
```

---

## 4. Your First TypeScript Program

### hello.ts

```ts
const greeting: string = "Hello, TypeScript!";
const year: number = 2026;
const isCohort: boolean = true;

console.log(greeting);
console.log(year, isCohort);
```

### Compile & Run

```bash
# Compile hello.ts → hello.js
npx tsc hello.ts

# Run the emitted JavaScript
node hello.js

# Type-only checking (no output file)
npx tsc --noEmit
```

---

## 5. Primitive Types

TypeScript's basic types mirror JavaScript.

### The Big Five Primitives

```ts
const name: string = "Ada";          // text
const age: number = 36;              // integers & floats
const active: boolean = true;        // true | false
const id: symbol = Symbol("id");     // unique identifiers
const big: bigint = 9007199254740993n; // very large integers
```

### null and undefined

```ts
// null -- an explicitly absent value
const maybe: null = null;

// undefined -- not yet assigned
let notAssigned: undefined = undefined;

// Note: strict mode (default) separates these from "any type"
```

---

## 6. Type Inference

TypeScript **infers** types even when you don't write them.

```ts
let count = 10;         // inferred: number
let message = "Hello";  // inferred: string
let done = true;        // inferred: boolean

count = "text"; // ❌ Type 'string' is not assignable to type 'number'
```

### Inference Rules

```text
Simple assignment   → literal type   (const)
Initialization      → broad "wide" type (let)
Function return     → inferred from return statements
```

```ts
const x = 5;    // x: 5        (literal — narrower)
let y = 5;      // y: number   (widened)
```

### Inference Abusing Spam

```text
✅ Good: write the type when it adds clarity:
   function getPrice(...): number

✅ Good: write the type at function boundaries:
   parameters and return values

✅ Fine: let TS infer local variables:
   const total = items.reduce(...)
```

> Rule of thumb: **explicit at boundaries, inferred locally.**

---

## 7. any, unknown, void, never

Four "special" types that trip people up.

### any — the escape hatch (avoid)

```ts
let anything: any = 5;
anything = "text";
anything = { random: true };

// any disables ALL checking — you lose TS's benefits.
// Prefer unknown.
```

### unknown — safe "I don't know yet"

```ts
let data: unknown;
data = 42;
data = { name: "Ada" };

// Can't use it without narrowing!
// data.name   ❌ Property 'name' does not exist on type 'unknown'

if (typeof data === "object" && data !== null && "name" in data) {
  console.log((data as { name: string }).name); // now OK
}
```

### void — used for functions that return nothing

```ts
function log(message: string): void {
  console.log(message);
  // no return statement — returns undefined implicitly
}
```

### never — for code that cannot return

```ts
function fail(message: string): never {
  throw new Error(message);
}

function infiniteLoop(): never {
  while (true) {}
}
```

---

## 8. Arrays & Tuples

### Arrays

```ts
const numbers: number[] = [1, 2, 3];

// Alternative syntax (generic)
const names: Array<string> = ["Ada", "Grace"];

// Mixed types
const mixed: (string | number)[] = [1, "two", 3];

// Nested arrays
const matrix: number[][] = [
  [1, 0],
  [0, 1]
];
```

### Tuples — fixed length + order

```ts
// A tuple: exactly two values, known types
let coordinate: [number, number] = [10, 20];

coordinate = [10, 20, 30]; // ❌ Too many elements
coordinate[0] = "x";       // ❌ Type 'string' is not assignable

// Common example: a key-value pair
let entry: [string, number] = ["age", 36];

// Optional tuple element
let option: [string, number?] = ["default", 5];
```

### Readonly arrays

```ts
const fixed: readonly number[] = [1, 2, 3];
fixed.push(4); // ❌ Property 'push' does not exist on type 'readonly number[]'
```

---

## 9. Enums

Enums let you name a set of values.

```ts
enum Role {
  READER,
  WRITER,
  ADMIN
}

const r: Role = Role.ADMIN;
console.log(r); // 2  (numeric, starts at 0)

// String enums (more common — better error messages & debugging)
enum Status {
  PENDING = "pending",
  COMPLETE = "complete",
  FAILED = "failed"
}

const s: Status = Status.FAILED;
```

---

## 10. tsconfig.json

The project configuration file for TypeScript (like `package.json` for the compiler).

### Generate One

```bash
npx tsc --init
```

### Common Configuration

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "commonjs",
    "rootDir": "src",
    "outDir": "dist",

    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,

    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,

    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### The Most Important Flags

| Flag | Effect |
|------|--------|
| `target` | Which JS version to emit (`es2022`) |
| `module` | Module system (`commonjs`, `es2022`, `nodenext`) |
| `rootDir` / `outDir` | Source vs. output folders |
| `strict` | Enable all strict type-checking |
| `strictNullChecks` | `null`/`undefined` must be handled explicitly |
| `noImplicitAny` | Error on implicit `any` parameters |
| `sourceMap` | Maps compiled JS back to `.ts` (debugging) |

> Turn on `strict`. New projects should always use strict mode from day one.

### Standard tsconfig (recommended baseline)

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "node16",
    "moduleResolution": "node16",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "sourceMap": true
  },
  "include": ["src"]
}
```

---

## 11. The CLI in `package.json`

```json
{
  "name": "ts-playground",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit",
    "start": "node dist/index.js",
    "clean": "rm -rf dist"
  }
}
```

```bash
npm run build       # compile once
npm run typecheck   # check types without emitting (CI)
npm run dev         # watch & recompile
npm start           # run the compiled output
```

---

## 12. A Complete First Example

### src/calculator.ts

```ts
type Operator = "add" | "subtract" | "multiply" | "divide";

function calculate(a: number, b: number, op: Operator): number {
  switch (op) {
    case "add":
      return a + b;
    case "subtract":
      return a - b;
    case "multiply":
      return a * b;
    case "divide":
      if (b === 0) throw new Error("Cannot divide by zero");
      return a / b;
    default:
      // exhaustiveness check — never is the compiler's friend
      const _exhaustive: never = op;
      return _exhaustive;
  }
}

console.log(calculate(10, 5, "add"));   // 15
console.log(calculate(10, 0, "divide")); // throws
```

---

## Exercises

1. Install TypeScript locally and run `npx tsc --init`.
2. Write variables for each primitive type; try to reassign a wrong type and watch the error.
3. Create a `Product` shape using a type alias with `name: string`, `price: number`, `inStock: boolean`.
4. Write a function with typed parameters and return type that uses `never` for an error path.
5. Configure `tsconfig.json` with `strict: true`, `rootDir: src`, `outDir: dist`.

---

## Key Takeaways

- TypeScript = JS + static types, compiled away at build time
- `tsc` compiles `.ts` → `.js`; `--noEmit` checks without output
- Primitives: `string`, `number`, `boolean`, `symbol`, `bigint`
- `any` disables safety — prefer `unknown`, `void`, `never`
- Tuples give arrays fixed shapes; enums name sets of values
- `tsconfig.json` controls the compiler; `strict` should stay on
- Write types at function boundaries, let inference handle locals