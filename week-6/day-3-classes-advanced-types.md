# Day 3 — Classes, Advanced Types & Tooling in a Node.js Project

**Previous:** [Day 2 — Interfaces, Unions & Generics](day-2-interfaces-generics.md)
**Next:** [Assignments](assignments.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Write typed classes with access modifiers and generics
- Use utility types (`Partial`, `Pick`, `Omit`, `Record`, etc.)
- Combine union, literal, and mapped types confidently
- Run TypeScript in Node.js (tsx, build, source maps, debugging)
- Handle typed errors in async code

---

## 1. Classes in TypeScript

TypeScript adds **type annotations + access modifiers** on top of JS classes.

### Basic Typed Class

```ts
class Product {
  constructor(
    public id: number,
    public name: string,
    public price: number
  ) {}

  describe(): string {
    return `${this.name} costs $${this.price}`;
  }
}

const laptop = new Product(1, "Laptop", 999);
console.log(laptop.describe());
```

### Parameter Properties ("public" in constructor)

The `public id` in the constructor is a convenience that **auto-declares + assigns the field**:

```ts
class Product {
  constructor(
    public id: number,     // this.id = id happens automatically
    public name: string,
    private _price: number
  ) {}
}
```

---

## 2. Access Modifiers

```ts
class BankAccount {
  public owner: string;        // accessible everywhere
  private _balance: number;    // only inside the class
  protected history: number[]; // class + subclasses only

  constructor(owner: string, initial: number) {
    this.owner = owner;
    this._balance = initial;
    this.history = [];
  }

  public deposit(amount: number): void {
    this._balance += amount;
    this.history.push(amount);
  }

  public get balance(): number {
    return this._balance;
  }
}

class SavingsAccount extends BankAccount {
  withdraw(amount: number): void {
    // this._balance  ❌ private — not accessible in subclass
    // this.history   ✅ protected — accessible
    console.log(`Balance: ${this.balance}`);  // via getter
  }
}
```

| Modifier | Class | Subclass | Outside |
|----------|-------|----------|---------|
| `public` (default) | ✅ | ✅ | ✅ |
| `protected` | ✅ | ✅ | ❌ |
| `private` | ✅ | ❌ | ❌ |

> Tip: many codebases use `_name` for `private` fields (still a convention, since JS private needs `#`).

### The `#` private (ES2022)

```ts
class C {
  #secret = "shh";   // native JS private — truly private
}
```

---

## 3. Abstract Classes & Interfaces

### interfaces (contracts)

```ts
interface PaymentMethod {
  pay(amount: number): boolean;
}

class CreditCard implements PaymentMethod {
  pay(amount: number): boolean {
    console.log(`Charging $${amount} to card`);
    return true;
  }
}

class Paypal implements PaymentMethod {
  pay(amount: number): boolean {
    console.log(`Charging $${amount} via PayPal`);
    return true;
  }
}
```

### abstract classes (partial implementations)

```ts
abstract class Shape {
  constructor(public color: string) {}

  abstract area(): number;   // must be implemented by subclass

  describe(): string {        // shared implementation
    return `${this.color} shape, area is ${this.area()}`;
  }
}

class Circle extends Shape {
  constructor(color: string, public radius: number) {
    super(color);
  }

  area(): number {
    return Math.PI * this.radius ** 2;
  }
}

const c = new Circle("red", 3);
console.log(c.describe()); // red shape, area is 28.27...
```

---

## 4. The `as` Keyword, Assertions & `satisfies`

### Type Assertions (`as`)

```ts
// When YOU know more than TypeScript:
const input = document.getElementById("input") as HTMLInputElement;
input.value = "typed!";

// Alternative — angle brackets (avoid in .tsx)
const input2 = <HTMLInputElement>document.getElementById("input");
```

> ⚠️ `as` does NOT change anything at runtime. It's a compile-time instruction. Use sparingly — prefer narrowing.

### `as const` (literal preservation)

```ts
const role = "admin";
//  role: "admin"  — a literal, thanks to const

const config = { debug: true, theme: "dark" } as const;
//  config.debug: true
//  config.theme: "dark"
//  (both become readonly literals, not widened to boolean/string)
```

### `satisfies` (day-one TS 4.9+)

Check that a value matches a type **without changing its inferred type**:

```ts
const routes = {
  home: "/",
  about: "/about"
} satisfies Record<string, `/${string}`>;

routes.home; // string (exact literal preserved, satisfied checked)
```

---

## 5. Utility Types — Superpowers

TypeScript ships built-in helpers that transform types.

### Partial, Required, Readonly

```ts
interface User {
  id: number;
  name: string;
  email: string;
}

type PartialUser = Partial<User>;   // every prop optional
type RequiredUser = Required<User>; // every prop required
type FrozenUser = Readonly<User>;   // properties can't change
```

### Pick, Omit — prune object shapes

```ts
type NameOnly = Pick<User, "name" | "email">;
// {name: string; email: string}

type NoEmail = Omit<User, "email">;
// {id: number; name: string}
```

### Record — build object types cleanly

```ts
type Status = "pending" | "complete" | "failed";

const statusLabel: Record<Status, string> = {
  pending: "Waiting",
  complete: "Done",
  failed: "Broken"
};
```

Without `Record`, the above becomes repetitive; with it, missing keys fail to compile.

### Extract, Exclude, NonNullable

```ts
type A = "a" | "b" | "c";
type B = "b" | "c" | "d";

type InBoth = Extract<A, B>;   // "b" | "c"
type InANotB = Exclude<A, B>;  // "a"

type Maybe = string | null | undefined;
type Definitely = NonNullable<Maybe>;  // string
```

### ReturnType & Parameters

```ts
function makeUser() {
  return { id: 1, name: "Ada", email: "a@b.c" };
}

type User = ReturnType<typeof makeUser>;  // {id: number; name: string; email: string}
```

### Combined Usage

```ts
type UserInput = Omit<User, "id">;        // what a form submits
type UpdateUser = Partial<UserInput>;     // PATCH-style
```

---

## 6. Mapped Types

Transform each property of an object type.

```ts
type User = { id: number; name: string; email: string };

// Make every value boolean
type Flags = { [K in keyof User]: boolean };
// { id: boolean; name: boolean; email: boolean }

// Keep keys but make values nullable
type Nullable<T> = { [P in keyof T]: T[P] | null };
type NullableUser = Nullable<User>;

// Add modifiers
type ReadonlyAll<T> = { readonly [P in keyof T]: T[P] };
type FrozenUser = ReadonlyAll<User>;
```

---

## 7. Template Literal Types & Branding

### Template literal types — string pattern strength

```ts
type EventName = `user.${string}`;

function logEvent(name: EventName) { }

logEvent("user.login");    // ✅
logEvent("user.logout");   // ✅
logEvent("order.created"); // ❌ must start with "user."
```

### Branded types — prevent accidental mixing

```ts
type UserId = string & { __brand: "UserId" };
type OrderId = string & { __brand: "OrderId" };

const userId = "u-1" as UserId;
const orderId = "o-1" as OrderId;

function byUserId(id: UserId) {}

byUserId(userId);        // ✅
byUserId(orderId);       // ❌ OrderId is not assignable to UserId
```

---

## 8. Typed Error Handling in Async Code

### Typed Errors with a union (the safe pattern)

```ts
interface AppError {
  kind: "AppError";
  message: string;
  status?: number;
}

interface NetworkError {
  kind: "NetworkError";
  message: string;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: AppError | NetworkError };
```

```ts
async function fetchUser(id: number): Promise<Result<User>> {
  try {
    const res = await fetch(`/api/users/${id}`);
    const data = (await res.json()) as User;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: { kind: "NetworkError", message: String(err) } };
  }
}

const result = await fetchUser(1);
if (result.ok) {
  console.log(result.data.name);       // safely typed
} else {
  console.error(result.error.message); // narrowly typed union
}
```

---

## 9. Running TypeScript in Node.js

TypeScript is at type-check/compile time; Node runs the emitted JS. Several ways to run `.ts` files.

### Option A: Compile, then run

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

```bash
npm run build
npm start            # runs dist/index.js
```

### Option B: tsx (developer experience, fastest)

```bash
npm install -D tsx
```

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  }
}
```

`tsx` runs `.ts` directly, with source maps and watch mode — no `dist/` needed for local dev.

### Option C: Using node's native TS (Node 23+ / 22.6.0+)

```bash
node --experimental-strip-types src/index.ts   # older
node src/index.ts                              # Node 23.6+ works out of the box
```

---

## 10. Source Maps & Debugging

### Enable source maps

tsconfig:

```json
{
  "compilerOptions": {
    "sourceMap": true
  }
}
```

This produces `index.js.map` so the debugger and stack traces point *back to the `.ts`* code.

### Debug .ts with Node inspector

```bash
node --inspect dist/index.js
# or, with tsx:
npx tsx --inspect src/index.ts
```

### Point breakpoints in your editor

VS Code reads `sourceMap` and lets you set breakpoints in `.ts` files directly.

---

## 11. ESM vs CJS in Node + TS

| Concern | CommonJS | ESM |
|---------|----------|-----|
| package.json `"type"` | `commonjs` (default) | `"module"` |
| tsconfig `module` | `commonjs` / `nodenext` | `node16` / `nodenext` |
| Extension | `.ts` → `.js` | `.ts` → `.js` (import paths keep `.js`) |
| `import x from "pkg"` | transpiles to require | native |

Best practice today (Node ESM-first):

```json
{
  "type": "module",
  "compilerOptions": {
    "module": "node16",
    "moduleResolution": "node16"
  }
}
```

```ts
// In ESM, relative imports keep the .js extension even though you wrote .ts
import { readFile } from "node:fs/promises";
import { helper } from "./helper.js";
```

---

## 12. Putting It All Together — A Typed Service Layer

```ts
interface DatabaseClient<T> {
  findById(id: number): Promise<T | undefined>;
  insert(entity: T): Promise<T>;
}

class UserRepository implements DatabaseClient<User> {
  constructor(private readonly client: DatabaseClient<User>) {}

  findById(id: number): Promise<User | undefined> {
    return this.client.findById(id);
  }

  insert(entity: User): Promise<User> {
    return this.client.insert(entity);
  }
}

// Usage — everything downstream is typed
const repo = new UserRepository(mockClient);
const user = await repo.findById(1);
if (user) {
  console.log(user.name.toUpperCase()); // ✅ typed
}
```

---

## Exercises

1. Write a `BankAccount` class using `public`, `private`, `protected`, and a getter.
2. Refactor a plain object with `interface` into a class that `implements` it.
3. Use `Pick`, `Omit`, `Partial`, and `Record` to derive three new types from a base `User`.
4. Add branded types for `UserId` and `OrderId`; verify they can't be mixed.
5. Wire up a Node project that runs with `tsx` and `tsc` build, with source maps on, then attach the inspector.
6. Model a `Result<T>` union and handle async errors without losing type safety.

---

## Key Takeaways

- Classes: `public` / `protected` / `private` + parameter properties
- `interface` for contracts, `abstract class` for shared + abstract logic
- Utility types (`Partial`, `Pick`, `Omit`, `Record`, `ReturnType`) do heavy lifting
- Union + discriminated + `never` make errors modeled as data
- Run TS with `tsc` (build) or `tsx` (dev); source maps enable debugging in `.ts`
- Node 23+ runs `.ts` natively; ESM is the modern default
- `as` is a compile-time cast — prefer narrowing and `satisfies`