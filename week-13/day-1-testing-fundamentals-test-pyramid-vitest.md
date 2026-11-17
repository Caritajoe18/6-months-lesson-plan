# Day 1 — Testing Fundamentals, the Test Pyramid & Unit Tests with Vitest

**Next:** [Day 2 — Integration Tests with Supertest, Test Databases & Mocking](day-2-integration-tests-supertest-test-db-mocking.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Explain what a test is for and what it can never prove
- Distinguish unit, integration, and end-to-end tests, and choose the right level
- Use the test pyramid and the testing trophy as decision aids, not rules
- Install and configure Vitest for a Node.js/TypeScript project
- Structure tests with Arrange–Act–Assert and behavior-focused names
- Assert values, object shapes, errors, async results, and calls
- Write table-driven tests for edge cases
- Identify and avoid the most common unit-testing mistakes

---

## 1. Why Test?

A test is a small program that runs your code and checks an expected outcome. Tests earn their keep in four ways:

| Purpose | What it means in practice |
|---------|---------------------------|
| **Regression safety** | A change that breaks old behavior fails a test before users find out |
| **Design feedback** | Code that is hard to test is usually tightly coupled or has too many responsibilities |
| **Living documentation** | Tests show how a function or endpoint is meant to be called |
| **Debugging speed** | A focused failing test narrows the search space far faster than clicking through a UI |

Tests are also a cost. They must be written, read, maintained, and kept deterministic. A slow, flaky, or over-mocked suite becomes a liability. The goal is not "more tests"; it is **the right tests at the right level**.

### What a test cannot do

A passing test suite does not prove that:

- the requirements are correct (you can test the wrong behavior perfectly)
- the system works under real network, disk, and concurrency conditions
- every input is handled (tests only cover cases someone thought of)
- the code is secure, performant, or accessible

Treat tests as evidence for specific claims, not as a certificate of quality.

---

## 2. The Test Pyramid

The classic pyramid separates tests by **scope** and gives rough guidance on how many of each to write:

```text
          /\
         /e2e\        few, slow, brittle, high confidence in the whole flow
        /------\
       /  integ  \    some, real HTTP + real database, moderate speed
      /----------\
     /    unit     \  many, fast, isolated, precise failure location
    /--------------\
```

| Level | Scope | Speed | What it catches | Typical failure cause |
|-------|-------|-------|-----------------|-----------------------|
| **Unit** | One function, class, or module in isolation | Milliseconds | Logic errors, edge cases, error handling | Wrong branch, bad arithmetic, missed validation |
| **Integration** | Several real parts together: HTTP route + middleware + database | Tens to hundreds of ms | Wiring, validation, status codes, persistence, constraints | Wrong route, missing `await`, bad query, wrong status |
| **End-to-end (E2E)** | Full deployed system through a browser or public API | Seconds to minutes | Real user journeys, cross-service integration | Broken deployment, CORS, auth redirect, UI wiring |

### The testing trophy

For applications that are mostly glue around a database, many teams use the **testing trophy**: a solid base of fast static checks (TypeScript, lint), a large middle of integration tests, and fewer unit and E2E tests. The useful idea is the same: **do not write unit tests for trivial wiring, and do not push every check to E2E**.

### Choosing a level

Ask: *"What is the cheapest level at which this claim can be tested?"*

- "Percent discount rounds half up." → **unit**
- "A user cannot register with an email that already exists." → **integration** (needs the unique constraint)
- "An unauthenticated request to `DELETE /posts/1` returns 401." → **integration**
- "A shopper can sign up, add an item, pay, and see the order." → **E2E**

A common smell is the **ice-cream cone**: lots of manual and E2E tests, few unit or integration tests. It is slow, expensive, and gives vague failure messages.

---

## 3. Setting Up Vitest

Vitest is a fast test runner that understands TypeScript and ES modules through Vite. Install it as a development dependency:

```bash
npm install --save-dev vitest @vitest/coverage-v8
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

`vitest` without `run` starts watch mode and is for local development. CI must use `vitest run` (or `vitest --run`) so it exits.

### `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    restoreMocks: true,
    clearMocks: true,
  },
});
```

- `environment: "node"` — no browser globals such as `document`. This is the correct default for a backend API.
- `globals: false` — import `describe`, `it`, `expect`, and `vi` explicitly. Explicit imports are easier for tooling and readers.
- `include` — keep test discovery deliberate. Do not let the runner pick up `node_modules` or compiled output.
- `restoreMocks` / `clearMocks` — reset spies and mocks between tests. See Section 7.

If your project uses `type: "module"`, name the config `vitest.config.ts`; Vitest loads it through Vite, not `ts-node`.

### Project layout

```text
src/
  lib/pricing.ts
  services/user-service.ts
  lib/pricing.test.ts          # colocated unit test
tests/
  unit/
  integration/
    auth.test.ts
    posts.test.ts
  factories/
  setup.ts
```

Colocate unit tests next to the code they test. Keep integration tests in a separate directory because they need a different setup and usually a different runner configuration.

---

## 4. Anatomy of a Good Test

Every test has three phases:

```ts
import { describe, expect, it } from "vitest";
import { applyPercentDiscount } from "../src/lib/pricing.js";

describe("applyPercentDiscount", () => {
  it("rounds the discounted amount to the nearest cent", () => {
    // Arrange
    const subtotal = 1999;
    const percent = 15;

    // Act
    const total = applyPercentDiscount(subtotal, percent);

    // Assert
    expect(total).toBe(1699);
  });
});
```

### Naming

A test name should describe **observable behavior**, not the function's internals:

```text
✅ rejects a negative quantity
✅ returns 401 when the Authorization header is missing
✅ keeps the original price when the discount is zero
❌ calls calculateTotal
❌ works
❌ test 1
```

`describe` groups related behavior; `it` states one expectation. If a name needs "and", split the test.

### One behavior per test

```ts
// ✅ Each test fails for one clear reason
it("returns an empty array when there are no posts", () => { /* ... */ });
it("caps the page size at 50", () => { /* ... */ });
it("rejects a page size below 1", () => { /* ... */ });

// ❌ If this fails, which of the three behaviors broke?
it("handles list pagination", () => { /* ... */ });
```

This does **not** mean one `expect` per test. Several assertions that together prove one behavior are fine, especially in integration tests.

---

## 5. Asserting with Vitest

### Equality

```ts
expect(2 + 2).toBe(4);                       // Object.is: primitives, same reference
expect({ id: 1 }).toEqual({ id: 1 });        // deep structural equality
expect({ id: 1, role: "USER" }).toMatchObject({ role: "USER" }); // subset
expect({ id: 1, role: "USER" }).toStrictEqual({ id: 1, role: "USER" });
```

Use `toBe` for primitives and references; `toEqual` for structures. `toStrictEqual` also checks `undefined` properties and class prototypes — useful when the exact shape matters.

### Truthiness, numbers, strings

```ts
expect(user).toBeDefined();
expect(user).not.toBeNull();
expect(items).toHaveLength(3);
expect(total).toBeGreaterThan(0);
expect(message).toMatch(/invalid email/i);
```

Avoid `expect(value).toBeTruthy()` when you care about the exact value; it hides `0`, `""`, and `false` bugs.

### Errors

```ts
expect(() => applyPercentDiscount(100, 150)).toThrow(RangeError);
expect(() => applyPercentDiscount(100, 150)).toThrow(/between 0 and 100/);

await expect(registerUser(invalidInput)).rejects.toThrow("Email is required");
```

Test that the **right error** is thrown, not merely that *something* threw.

### Async results

```ts
it("returns the user from the repository", async () => {
  const user = await service.findById(1);
  expect(user).toEqual({ id: 1, displayName: "Ada" });
});
```

Always `await` the promise. A test that forgets `await` can finish before the assertion runs and report a false pass.

### Calls and arguments

```ts
expect(emailClient.send).toHaveBeenCalledTimes(1);
expect(emailClient.send).toHaveBeenCalledWith(
  expect.objectContaining({ to: "ada@example.test" }),
);
```

### Table-driven tests

Use `it.each` for the same rule with different inputs:

```ts
it.each([
  { input: 0, expected: 0 },
  { input: 500, expected: 425 },
  { input: 1999, expected: 1699 },
])("applies a 15% discount to $input cents", ({ input, expected }) => {
  expect(applyPercentDiscount(input, 15)).toBe(expected);
});
```

This keeps the rule and its examples together without copy-pasting the whole test body.

### Snapshots

```ts
expect(response.body).toMatchSnapshot();
```

Snapshots are useful for large, stable serialized output. They are **not** a substitute for explicit assertions: a reviewer may accept a snapshot diff without understanding it, and any harmless formatting change creates noise. For API tests, assert the fields that matter.

---

## 6. Unit-Testing Pure Functions

Pure functions — same input, same output, no side effects — are the easiest and most valuable unit-test targets.

```ts
// src/lib/pricing.ts
export interface CartLine {
  unitPriceCents: number;
  quantity: number;
}

export function subtotalCents(lines: CartLine[]): number {
  return lines.reduce((total, line) => {
    if (!Number.isInteger(line.quantity) || line.quantity < 0) {
      throw new RangeError("quantity must be a non-negative integer");
    }
    if (!Number.isInteger(line.unitPriceCents) || line.unitPriceCents < 0) {
      throw new RangeError("unitPriceCents must be a non-negative integer");
    }
    return total + line.unitPriceCents * line.quantity;
  }, 0);
}

export function applyPercentDiscount(cents: number, percent: number): number {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new RangeError("cents must be a non-negative integer");
  }
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new RangeError("percent must be between 0 and 100");
  }
  return Math.round(cents * (1 - percent / 100));
}
```

```ts
// src/lib/pricing.test.ts
import { describe, expect, it } from "vitest";
import { applyPercentDiscount, subtotalCents } from "./pricing.js";

describe("subtotalCents", () => {
  it("returns 0 for an empty cart", () => {
    expect(subtotalCents([])).toBe(0);
  });

  it("sums the line totals", () => {
    expect(
      subtotalCents([
        { unitPriceCents: 1250, quantity: 2 },
        { unitPriceCents: 300, quantity: 1 },
      ]),
    ).toBe(2800);
  });

  it("throws when a quantity is negative", () => {
    expect(() =>
      subtotalCents([{ unitPriceCents: 100, quantity: -1 }]),
    ).toThrow(RangeError);
  });

  it("throws when a quantity is fractional", () => {
    expect(() =>
      subtotalCents([{ unitPriceCents: 100, quantity: 1.5 }]),
    ).toThrow(/non-negative integer/);
  });
});

describe("applyPercentDiscount", () => {
  it("returns the full amount for a 0% discount", () => {
    expect(applyPercentDiscount(1000, 0)).toBe(1000);
  });

  it("returns 0 for a 100% discount", () => {
    expect(applyPercentDiscount(1000, 100)).toBe(0);
  });

  it("rounds to the nearest cent", () => {
    expect(applyPercentDiscount(1999, 15)).toBe(1699);
  });

  it.each([-1, 101, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an invalid percentage: %s",
    (percent) => {
      expect(() => applyPercentDiscount(1000, percent)).toThrow(RangeError);
    },
  );
});
```

### What edges to cover

| Category | Examples |
|----------|----------|
| Empty / zero | empty array, empty string, `0`, no matches |
| Boundaries | page `1`, max page size, discount `0` and `100`, one character |
| Invalid input | negative numbers, `NaN`, `null`, wrong type, out-of-range enum |
| Unicode / whitespace | trimmed input, casing, emoji, combining characters |
| Failure paths | dependency rejects, missing record, duplicate key |
| Idempotency | calling twice produces the same stored state |

Do not test every possible input. Test the **boundaries and the rules**; exhaustive input testing is what property-based testing is for.

---

## 7. Testing Code with Dependencies

A function that calls a database, clock, UUID generator, or HTTP client is not pure. To unit-test it, replace those dependencies at a **seam** — usually a parameter or constructor argument.

```ts
// src/services/user-service.ts
export interface User {
  id: number;
  email: string;
  displayName: string;
  passwordHash: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  create(input: {
    email: string;
    displayName: string;
    passwordHash: string;
  }): Promise<User>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export class EmailAlreadyUsedError extends Error {
  constructor() {
    super("Email is already registered");
    this.name = "EmailAlreadyUsedError";
  }
}

export function createUserService(deps: {
  users: UserRepository;
  hasher: PasswordHasher;
}) {
  return {
    async register(input: {
      email: string;
      password: string;
      displayName: string;
    }): Promise<User> {
      const email = input.email.trim().toLowerCase();
      const displayName = input.displayName.trim();

      if (!email.includes("@")) {
        throw new RangeError("Invalid email");
      }
      if (input.password.length < 8) {
        throw new RangeError("Password must be at least 8 characters");
      }
      if (await deps.users.findByEmail(email)) {
        throw new EmailAlreadyUsedError();
      }

      const passwordHash = await deps.hasher.hash(input.password);
      return deps.users.create({ email, displayName, passwordHash });
    },
  };
}
```

Test it with hand-written fakes or Vitest mocks. Prefer a small fake when behavior matters; use `vi.fn()` when you only care that a call happened.

```ts
import { describe, expect, it, vi } from "vitest";
import {
  createUserService,
  EmailAlreadyUsedError,
  type PasswordHasher,
  type UserRepository,
} from "../src/services/user-service.js";

function setup(overrides: {
  findByEmail?: UserRepository["findByEmail"];
  create?: UserRepository["create"];
  hash?: PasswordHasher["hash"];
} = {}) {
  const users: UserRepository = {
    findByEmail: overrides.findByEmail ?? vi.fn().mockResolvedValue(null),
    create:
      overrides.create ??
      vi.fn().mockImplementation(async (input) => ({ id: 1, ...input })),
  };
  const hasher: PasswordHasher = {
    hash: overrides.hash ?? vi.fn().mockResolvedValue("hashed-password"),
    verify: vi.fn(),
  };
  return { service: createUserService({ users, hasher }), users, hasher };
}

describe("userService.register", () => {
  it("normalizes the email and stores a hash instead of the password", async () => {
    const { service, users, hasher } = setup();

    const user = await service.register({
      email: "  Ada@Example.TEST ",
      password: "correct horse battery",
      displayName: "  Ada Lovelace  ",
    });

    expect(user.email).toBe("ada@example.test");
    expect(user.displayName).toBe("Ada Lovelace");
    expect(user.passwordHash).toBe("hashed-password");
    expect(user.passwordHash).not.toContain("correct horse");
    expect(hasher.hash).toHaveBeenCalledWith("correct horse battery");
    expect(users.create).toHaveBeenCalledOnce();
  });

  it("rejects an invalid email before touching the repository", async () => {
    const { service, users } = setup();

    await expect(
      service.register({
        email: "not-an-email",
        password: "long-enough",
        displayName: "Ada",
      }),
    ).rejects.toThrow(/invalid email/i);

    expect(users.findByEmail).not.toHaveBeenCalled();
  });

  it("rejects a duplicate email", async () => {
    const { service } = setup({
      findByEmail: vi.fn().mockResolvedValue({
        id: 7,
        email: "ada@example.test",
        displayName: "Ada",
        passwordHash: "existing",
      }),
    });

    await expect(
      service.register({
        email: "ADA@example.test",
        password: "long-enough",
        displayName: "Ada",
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyUsedError);
  });

  it("does not create the user when hashing fails", async () => {
    const { service, users } = setup({
      hash: vi.fn().mockRejectedValue(new Error("hash failure")),
    });

    await expect(
      service.register({
        email: "ada@example.test",
        password: "long-enough",
        displayName: "Ada",
      }),
    ).rejects.toThrow("hash failure");

    expect(users.create).not.toHaveBeenCalled();
  });
});
```

This is a **unit** test: no database, no bcrypt work, no network. It runs in milliseconds and pinpoints which rule failed.

### Spies

Use `vi.spyOn` to wrap an existing method temporarily:

```ts
const spy = vi.spyOn(console, "error").mockImplementation(() => {});
reportFailure(new Error("boom"));
expect(spy).toHaveBeenCalledWith("Report failed", expect.any(Error));
spy.mockRestore();
```

`restoreMocks: true` in the config calls `mockRestore()` automatically between tests, which is why the explicit call is often unnecessary.

### Fake timers and the clock

Time-dependent code is a common source of flakiness. Do not `await sleep(1000)` in tests. Control time:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { isExpired } from "../src/lib/tokens.js";

describe("isExpired", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("treats a token as expired exactly at its expiry time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));

    expect(isExpired(new Date("2026-01-01T11:59:59.000Z"))).toBe(true);
    expect(isExpired(new Date("2026-01-01T12:00:01.000Z"))).toBe(false);
  });
});
```

If the code under test uses `setTimeout`, use `vi.advanceTimersByTimeAsync(...)` and await it so queued promises settle. Fake timers change global behavior — enable them only for the test that needs them and restore real timers afterward.

### Randomness

Inject the generator instead of calling `Math.random()` or `crypto.randomUUID()` directly:

```ts
export function createInviteCode(ids: () => string): string {
  return `invite_${ids()}`;
}
```

Then a test can pass a fixed generator and assert an exact value. For generated values that are not part of the contract, assert the shape (`expect(code).toMatch(/^invite_/)`) rather than a specific random string.

---

## 8. Common Unit-Testing Mistakes

| Mistake | Why it hurts | Fix |
|---------|--------------|-----|
| Testing private helpers | Refactors break tests even when behavior is unchanged | Test through the public interface |
| Over-mocking | Mocks encode the implementation; the test passes while real code is broken | Mock only true external boundaries; use fakes for behavior |
| Mocking the subject under test | You verify the mock, not the code | Never mock the function you are testing |
| Shared mutable state | Test order changes results | Build fresh data per test; reset in `beforeEach` |
| No `await` on async assertions | False passes and unhandled rejections | Always `await` promises; enable a lint rule |
| Using the real clock | Flaky around midnight, timezones, short TTLs | Fake timers or inject a clock |
| Sleeping to wait | Slow and still flaky | Await the actual condition/promise |
| Assertion-free tests | They only check "did not throw" | Assert an observable result |
| Snapshot-everything | Unreviewed diffs, brittle noise | Assert the fields that define the contract |
| Chasing 100% coverage | Tests with no assertions to hit lines | Cover behavior; set sensible thresholds (Day 3) |
| Copy-pasted test cases | Diverging expectations, hard to maintain | Use `it.each` |
| Real network/DB in a unit test | Slow, non-deterministic, dangerous | Move to integration; inject a fake |

### A test that cannot fail

```ts
it("registers a user", async () => {
  await service.register(validInput); // no assertion
});
```

This passes if `register` returns `undefined`, stores nothing, or silently catches every error. Add an assertion about the returned user or the repository call.

---

## 9. Running and Reading Results

```bash
npm test                 # watch mode
npx vitest run           # one pass, for CI
npx vitest run pricing   # filter files by name
npx vitest run -t "rejects a duplicate email"   # filter by test name
```

Read a failure from the top down:

1. **File and test name** — which behavior broke?
2. **Expected vs received** — what did you assume?
3. **Diff** — for objects and arrays, Vitest prints the differing path.
4. **Stack trace** — whether the failure is in the test setup or the production code.

When a test fails, first ask whether the code or the test is wrong. Do not "fix" the test by loosening the assertion until it passes.

---

## Check Your Understanding

1. Why is a unit test usually a poor place to verify a database unique constraint?
2. What does the test pyramid optimize for, and when would the testing trophy be a better guide?
3. Why is `expect(value).toBeTruthy()` risky when checking a numeric total?
4. What is the difference between `toBe` and `toEqual`?
5. Why can a test that calls `await service.register(...)` without an assertion be worse than no test?
6. How would you test code that sends a password-reset email without contacting a real mail server?
7. Why are fake timers preferable to `await new Promise((r) => setTimeout(r, 1000))`?
