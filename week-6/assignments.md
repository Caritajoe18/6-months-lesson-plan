# Week 6 Assignments

> All assignments must compile with **`strict: true`** and pass `npx tsc --noEmit` with zero errors.

---

## Assignment 1: Typed Data Models & Utility Types

**Objective:** Model real-world data with interfaces and practice utility types.

### Part A — Domain Models

Create `src/models.ts` defining:

```ts
interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
}

interface Post {
  id: number;
  title: string;
  body: string;
  authorId: number;
  publishedAt?: Date;
}

interface Comment {
  id: number;
  postId: number;
  authorName: string;
  content: string;
}
```

### Part B — Derived Types

Using the models, derive and export:

```ts
// Form input for creating a post (no id, optional publishedAt)
type CreatePostInput = Omit<Post, "id" | "publishedAt">;

// API patch payload — every field optional
type UpdatePostInput = Partial<Omit<Post, "id">>;

// Safe public view of a user (no email)
type PublicUser = Omit<User, "email">;

// A dictionary keyed by post id → Post
type PostMap = Record<number, Post>;
```

### Part C — Validation Without `any`

Write `src/validators.ts` with a narrow-checking helper:

```ts
function isUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "number" &&
    typeof v.name === "string" &&
    typeof v.email === "string" &&
    (v.role === "admin" || v.role === "editor" || v.role === "viewer")
  );
}
```

### Part D — Generated Report

```ts
function countByRole(users: User[]): Record<User["role"], number> {
  const result: Record<User["role"], number> = { admin: 0, editor: 0, viewer: 0 };
  for (const u of users) result[u.role]++;
  return result;
}
```

### Verification

```bash
npm run typecheck   # must pass with strict: true
```

### Submission

- `src/models.ts`, `src/validators.ts`
- A `src/index.ts` that exercises every derived type
- `tsconfig.json` with `strict: true`

---

## Assignment 2: Generic Type Utilities (rebuild the standard library)

**Objective:** Re-implement common generic utilities from scratch.

### Your Task

Implement `src/type-utils.ts` exporting:

```ts
// 1. Recreate Partial
type MyPartial<T> = {
  [P in keyof T]?: T[P];
};

// 2. Recreate Pick
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// 3. Recreate Omit via Exclude
type MyExclude<T, U> = T extends U ? never : T;
type MyOmit<T, K extends keyof T> = MyPick<T, MyExclude<keyof T, K>>;

// 4. Recreate Record
type MyRecord<K extends keyof any, V> = {
  [P in K]: V;
};
```

### Your Tests

Write `src/tests.ts` that fails to compile if the rebuilds are wrong. For example:

```ts
interface User {
  id: number;
  name: string;
  email: string;
}

// These must compile:
const partialUser: MyPartial<User> = { name: "Ada" };
const nameOnly: MyPick<User, "name"> = { name: "Ada" };
const noEmail: MyOmit<User, "email"> = { id: 1, name: "Ada" };
const map: MyRecord<"a" | "b", number> = { a: 1, b: 2 };
```

### Stretch

```ts
// 5. The Head of a tuple
type Head<T extends unknown[]> = T extends [infer First, ...unknown[]] ? First : never;

type H = Head<["a", "b", "c"]>; // "a"

// 6. A DeepReadonly<T>
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
```

### Submission

- `src/type-utils.ts` and `src/tests.ts` with compile-time assertions
- Zero `--noEmit` errors

---

## Assignment 3: Typed Error Handling & a Generic Result

**Objective:** Build a production-style `Result<T>` error pattern.

### Part A — The core `Result`

```ts
// src/result.ts
export type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
```

### Part B — A typed wrapper for async calls

```ts
// src/async.ts
export async function toResult<T, E = Error>(
  promise: Promise<T>
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return ok(data);
  } catch (error) {
    if (error instanceof Error) {
      return err(error as E);
    }
    return err(`Unexpected error: ${String(error)}` as E);
  }
}
```

```ts
type GithubUser = {
  id: number;
  login: string;
  html_url: string;
};

const result = await toResult<GithubUser>(
  fetch("https://api.github.com/users/octocat").then((r) => r.json())
);

if (result.ok) {
  console.log(result.data.login); // safely typed
} else {
  console.error(result.error.message);
}
```

### Part C — Compose operations safely

```ts
// Simulate a multi-step flow, e.g. find user → check role → update
type WorkflowError =
  | { kind: "not_found"; message: string }
  | { kind: "forbidden"; message: string }
  | { kind: "db"; message: string };

function findUser(id: number): Result<User, WorkflowError> { ... }
function checkRole(u: User): Result<boolean, WorkflowError> { ... }
function updateUser(u: User): Result<boolean, WorkflowError> { ... }

// Chain them — error from any step short-circuits
function runWorkflow(id: number): Result<User, WorkflowError> {
  const found = findUser(id);
  if (!found.ok) return found;

  const allowed = checkRole(found.data);
  if (!allowed.ok) return allowed;

  const updated = updateUser(found.data);
  if (!updated.ok) return updated;

  return ok(found.data);
}
```

### Submission

- `src/result.ts`, `src/async.ts`
- A `src/examples.ts` with 3 + error paths and 3 success paths
- Verification: `npm run typecheck` passes and `npm start` prints clear outputs

---

## Grading Criteria

| Criteria | Points |
|----------|--------|
| Compiles clean under `strict: true` | 35% |
| Correct utility type usage/rebuilds | 25% |
| Discriminated union / `never` correctness | 20% |
| Code clarity & naming | 10% |
| No `any` in assignments 2–3 | 10% |

---

## Tips

1. Keep `strict: true`. It works *for* you — fix errors rather than casting them away.
2. `npx tsc --noEmit` is your friend; run it after every file.
3. When stuck on a union, `interface X { kind: "x"; ... }` pattern wins.
4. In `--strictNullChecks`, remember `undefined` is a real state.
5. Use `satisfies` instead of `as` wherever you can keep the exact type.