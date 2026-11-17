# Day 3 — TDD, Coverage Thresholds & Test Factories

**Previous:** [Day 2 — Integration Tests with Supertest, Test Databases & Mocking](day-2-integration-tests-supertest-test-db-mocking.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Apply the red–green–refactor loop in small, verifiable steps
- Start from a test list instead of designing everything up front
- Use coverage reports to find untested behavior without gaming the number
- Configure coverage thresholds that fail CI at a meaningful level
- Build test factories that produce valid, overridable data
- Keep factories deterministic and safe under parallel tests
- Decide when TDD helps and when another approach is a better fit

---

## 1. The TDD Loop

Test-Driven Development is a short cycle:

```text
        ┌──────────────┐
        │  1. RED      │  write a failing test for the next small behavior
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │  2. GREEN    │  write the simplest code that passes
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │  3. REFACTOR │  improve the code and tests, all tests stay green
        └──────┬───────┘
               └────────► repeat
```

### The three rules (Kent Beck, simplified)

1. **Do not write production code** unless it makes a failing test pass.
2. **Do not write more test than is needed to fail** — one clear assertion of one behavior.
3. **Do not write more production code than is needed to pass** the current failing test.

The rules feel artificial at first. Their value is that they force tiny steps: you always know why the code exists, and you never debug a large untested change.

### Why this works

- **Every line has a reason.** Production code exists because a test demanded it.
- **Failures are local.** You changed one small thing; the failure points at it.
- **Design improves.** Hard-to-test code pushes you toward smaller units and explicit dependencies.
- **You get a safety net as a side effect.** The test suite grows with the feature.

### When TDD is a good fit

| Good fit | Poor fit |
|----------|----------|
| Business rules with clear inputs and outputs | Exploratory spikes where requirements are unknown |
| Bug fixes (write a test that reproduces the bug first) | Purely visual/UI work with no stable assertion |
| Service logic with dependencies you can inject | Throwaway scripts |
| Parsers, validators, pricing, permissions, state machines | Large mechanical refactors with existing coverage |
| API behavior with a defined contract | Code you cannot run yet (first prove feasibility) |

TDD is a tool, not a religion. Use it where it reduces uncertainty; do not force it where it slows learning.

---

## 2. Start with a Test List

Before writing code, list the behaviors in plain language. Example feature: **coupon discounts**.

```text
Coupon rules
- [ ] reject an empty code
- [ ] normalize case and surrounding whitespace
- [ ] reject an unknown code
- [ ] reject an expired coupon
- [ ] apply a percentage and round to the nearest cent
- [ ] cap the discount at the coupon's maximum
- [ ] never discount below zero
```

This list becomes your backlog. You do not need to implement it in order, but each item becomes one small red–green–refactor cycle. Keep the list next to the test file or in the pull request description.

### Worked example: `discountFor`

Target API:

```ts
const service = createCouponService({ coupons, now });
await service.discountFor(rawCode: string, subtotalCents: number): Promise<number>
```

Dependencies are injected: a coupon repository and a clock.

#### Cycle 1 — Reject an empty code

Write the test first:

```ts
// src/lib/coupons.test.ts
import { describe, expect, it, vi } from "vitest";
import {
  createCouponService,
  ExpiredCouponError,
  InvalidCouponError,
  UnknownCouponError,
} from "./coupons.js";

describe("couponService.discountFor", () => {
  it("rejects an empty code", async () => {
    const service = createCouponService({
      coupons: { findByCode: async () => null },
    });

    await expect(service.discountFor("   ", 1000)).rejects.toBeInstanceOf(
      InvalidCouponError,
    );
  });
});
```

Run it. It fails because `coupons.ts` does not exist. Create the minimum:

```ts
// src/lib/coupons.ts
export class InvalidCouponError extends Error {}

export function createCouponService(_deps: {
  coupons: { findByCode(code: string): Promise<unknown> };
  now?: () => Date;
}) {
  return {
    async discountFor(_code: string, _subtotalCents: number): Promise<number> {
      throw new InvalidCouponError("Coupon code is required");
    },
  };
}
```

Run it. Green. Do not add expiry logic yet. That is the discipline: the current test only claims that an empty code is invalid.

#### Cycle 2 — Normalize the code

```ts
it("normalizes case and whitespace before lookup", async () => {
  const findByCode = vi.fn().mockResolvedValue({
    code: "SAVE10",
    percentOff: 10,
    maxDiscountCents: null,
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
  });
  const service = createCouponService({
    coupons: { findByCode },
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });

  await service.discountFor("  save10 ", 1000);

  expect(findByCode).toHaveBeenCalledWith("SAVE10");
});
```

This fails (the stub still throws). Make it pass by normalizing and looking up. Do **not** implement the discount calculation yet; the test only asserts the lookup input. A minimal implementation might return `0` after lookup. That is fine.

#### Cycle 3 — Reject an unknown code

```ts
it("rejects an unknown code", async () => {
  const service = createCouponService({
    coupons: { findByCode: async () => null },
  });

  await expect(service.discountFor("NOPE", 1000)).rejects.toBeInstanceOf(
    UnknownCouponError,
  );
});
```

#### Cycle 4 — Reject an expired coupon

```ts
it("rejects an expired coupon", async () => {
  const service = createCouponService({
    coupons: {
      findByCode: async () => ({
        code: "OLD",
        percentOff: 25,
        maxDiscountCents: null,
        expiresAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    },
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });

  await expect(service.discountFor("OLD", 1000)).rejects.toBeInstanceOf(
    ExpiredCouponError,
  );
});
```

The boundary matters: a coupon that expires at exactly the current instant is expired. The injected `now` makes this test exact and fast.

#### Cycle 5 — Apply and round the percentage

```ts
it("applies the percentage and rounds to the nearest cent", async () => {
  const service = createCouponService({
    coupons: {
      findByCode: async () => ({
        code: "SAVE15",
        percentOff: 15,
        maxDiscountCents: null,
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      }),
    },
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });

  await expect(service.discountFor("SAVE15", 1999)).resolves.toBe(300);
});
```

`1999 * 0.15 = 299.85`, rounded to `300`. Use integer arithmetic deliberately: `Math.round(subtotalCents * (percentOff / 100))` is fine here; for money, be explicit about the rounding rule and test it.

#### Cycle 6 — Cap the discount

```ts
it("caps the discount at the coupon maximum", async () => {
  const service = createCouponService({
    coupons: {
      findByCode: async () => ({
        code: "MAX500",
        percentOff: 50,
        maxDiscountCents: 500,
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      }),
    },
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });

  await expect(service.discountFor("MAX500", 4000)).resolves.toBe(500);
});
```

#### Final implementation (after refactoring)

```ts
// src/lib/coupons.ts
export interface Coupon {
  code: string;
  percentOff: number;
  maxDiscountCents: number | null;
  expiresAt: Date;
}

export interface CouponRepository {
  findByCode(code: string): Promise<Coupon | null>;
}

export class InvalidCouponError extends Error {
  constructor(message = "Coupon code is required") {
    super(message);
    this.name = "InvalidCouponError";
  }
}

export class UnknownCouponError extends Error {
  constructor(message = "Coupon not found") {
    super(message);
    this.name = "UnknownCouponError";
  }
}

export class ExpiredCouponError extends Error {
  constructor(message = "Coupon has expired") {
    super(message);
    this.name = "ExpiredCouponError";
  }
}

export function createCouponService(deps: {
  coupons: CouponRepository;
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());

  return {
    async discountFor(rawCode: string, subtotalCents: number): Promise<number> {
      const code = rawCode.trim().toUpperCase();
      if (code.length === 0) {
        throw new InvalidCouponError();
      }
      if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
        throw new InvalidCouponError("Subtotal must be a non-negative integer");
      }

      const coupon = await deps.coupons.findByCode(code);
      if (coupon === null) {
        throw new UnknownCouponError();
      }
      if (coupon.expiresAt.getTime() <= now().getTime()) {
        throw new ExpiredCouponError();
      }

      const percentageDiscount = Math.round(
        subtotalCents * (coupon.percentOff / 100),
      );
      const capped =
        coupon.maxDiscountCents === null
          ? percentageDiscount
          : Math.min(percentageDiscount, coupon.maxDiscountCents);

      return Math.min(capped, subtotalCents);
    },
  };
}
```

Note what the refactor added beyond the current tests: `subtotalCents` validation and the final `Math.min(..., subtotalCents)` guard. In real TDD, add a failing test for each first ("rejects a negative subtotal", "never discounts more than the subtotal"). The example compresses those cycles; do not copy the shortcut into your own work.

### The refactor step

Refactoring is not "rewrite everything". It is small, behavior-preserving cleanup:

- rename a vague variable
- extract a helper when a test names the concept
- remove duplicated setup with a factory
- split a long function once tests protect both halves
- improve a test name

Run the tests after every refactor. If they fail, the refactor changed behavior; revert or fix it.

### Commit per cycle (optional but effective)

A small commit after each green/refactor step gives you a clean history and an easy rollback point. The message can describe the behavior, for example:

```text
test: reject expired coupons
feat: cap coupon discounts at maxDiscountCents
refactor: extract coupon code normalization
```

---

## 3. Coverage: What It Measures

Enable coverage:

```bash
npm install --save-dev @vitest/coverage-v8
npx vitest run --coverage
```

| Metric | Meaning | Blind spot |
|--------|---------|------------|
| **Statements** | Percentage of executable statements run | A statement can run without being asserted |
| **Branches** | Percentage of `if`/`else`, ternary, `&&`, `||`, and switch branches taken | Both branches can run while the test ignores the result |
| **Functions** | Percentage of functions called | A function can be called and produce the wrong value |
| **Lines** | Percentage of source lines executed | Same as statements for most code |

Example branch coverage gap:

```ts
export function shippingCents(country: string, totalCents: number): number {
  if (country === "US" && totalCents >= 5000) {
    return 0;
  }
  return 999;
}
```

A test with only `shippingCents("US", 6000)` covers the `true` branch of both conditions but not the `false` path or the free-shipping boundary. Coverage may report high statement/line coverage while a whole rule is untested.

### What coverage does **not** prove

- that the assertions are meaningful (you can execute every line and assert nothing)
- that the expected values are correct
- that concurrency, retries, or failure modes are handled
- that the API contract matches what consumers need
- that the code is secure or performant

A test that executes a function and only checks "did not throw" can push coverage to 100% and catch almost nothing.

### Do not game the number

Avoid:

```ts
it("covers the branch", () => {
  expect(typeof applyCoupon).toBe("function"); // no behavior tested
});
```

Avoid blanket `/* istanbul ignore next */` or `/* v8 ignore next */` comments just to raise the percentage. Use them only for genuinely unreachable defensive code, and leave a reason.

---

## 4. Coverage Thresholds

Set a **floor** that CI enforces, not a target that encourages empty tests.

```ts
// vitest.coverage.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: [
      "tests/integration/load-env.ts",
      "tests/integration/setup.ts",
    ],
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.d.ts",
        "src/server.ts",
        "src/config/**",
        "src/prisma/**",
        "src/types/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 75,
      },
    },
  },
});
```

```json
{
  "scripts": {
    "test:coverage": "vitest run --coverage --config vitest.coverage.config.ts"
  }
}
```

### Choosing numbers

- Start where the project is today, then ratchet up. A threshold you cannot meet is ignored; a threshold at 100% invites fake tests.
- Require **branches** explicitly. Line coverage alone hides untested `else` paths.
- Set **higher thresholds for critical modules** with per-file thresholds:

```ts
thresholds: {
  lines: 80,
  functions: 80,
  statements: 80,
  branches: 75,
  "src/services/**": {
    lines: 90,
    functions: 90,
    branches: 85,
  },
  "src/lib/pricing.ts": {
    lines: 100,
    branches: 100,
  },
},
```

- Use `perFile: true` for a stricter policy where every file must meet the floor, not just the project average:

```ts
thresholds: {
  perFile: true,
  lines: 80,
  functions: 80,
  statements: 80,
  branches: 75,
},
```

Per-file thresholds catch the "one well-tested file hides five untested files" problem. They can be noisy for small modules; apply them to the directories that matter.

### Excluding code honestly

Exclude generated code, bootstrap wiring, type-only files, and configuration:

```text
src/server.ts        starts the listener
src/prisma/**        generated contract/client
src/types/**         types only, no runtime behavior
src/**/*.d.ts        declarations
```

Do **not** exclude a file merely because it is under-tested. Either test it or explain in the README why it is untestable and what compensating check exists.

### Unit and integration coverage together

Coverage only counts code that was actually imported and run. Unit tests may never import your routers; integration tests may never import some branches. Run coverage over the **combined** suite:

- Use one configuration that includes both unit and integration tests (`vitest.coverage.config.ts` above), **or**
- Run each suite with `--coverage` and merge the reports (for example with `vitest --mergeReports` in versions that support it, or a coverage merger such as `nyc merge`) in CI.

If the coverage run uses the integration setup, it needs the test database. Keep the coverage job in the same pipeline step as the integration suite so the database is available.

### CI gate

```yaml
# .github/workflows/test.yml (excerpt)
- run: npm ci
- name: Apply test migrations
  run: npx prisma db migrate --to <ref>
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
- name: Tests + coverage thresholds
  run: npm run test:coverage
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    JWT_SECRET: test-only-secret
```

Vitest exits non-zero when a threshold fails, so this step fails the pull request. Upload `coverage/lcov.info` or the HTML report as a build artifact for reviewers.

### Reading the report

Open `coverage/index.html` and sort by uncovered branches, not by the lowest line percentage. Ask:

- Which **rules** are untested, not which lines?
- Is the untested branch reachable through the public API?
- Is it defensive code that deserves a test, or dead code that should be deleted?
- Are tests asserting the behavior, or only executing it?

High coverage with vague assertions is worse than moderate coverage with precise ones.

---

## 5. Test Factories

A factory builds test data with **valid defaults** and **explicit overrides**:

```ts
const user = await createUser({ email: "ada@example.test" });
```

The test states only what matters. Everything else is valid and irrelevant. Compare with copying a 15-field object into every test: one schema change breaks every test, and the reader cannot tell which fields matter.

### Fixtures vs factories

| Approach | Description | Trade-off |
|----------|-------------|-----------|
| **Fixture** | A fixed JSON/object reused by tests | Fast to write; shared mutable state; unrelated changes break tests |
| **Factory** | A function that builds a fresh valid object per call | Slightly more code; isolated, explicit, easy to extend |
| **Seeder** | Bulk data inserted into a database | Useful for demo/performance data; poor for focused assertions |

Use factories for tests. Keep seeders for local development and demos.

### A user factory

```ts
// tests/factories/user.ts
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "../../src/prisma/db.js";

export const TEST_PASSWORD = "correct-horse-battery";

export interface UserOverrides {
  email?: string;
  displayName?: string;
  password?: string;
  passwordHash?: string;
  role?: "USER" | "ADMIN";
  createdAt?: Date;
}

let sequence = 0;

export interface NewUser {
  email: string;
  displayName: string;
  passwordHash: string;
  role: "USER" | "ADMIN";
  createdAt: Date;
}

export function buildUser(overrides: UserOverrides = {}): NewUser {
  sequence += 1;

  return {
    email: overrides.email ?? `user-${randomUUID()}@example.test`,
    displayName: overrides.displayName ?? `Test User ${sequence}`,
    passwordHash: overrides.passwordHash ?? "not-a-real-hash",
    role: overrides.role ?? "USER",
    createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00.000Z"),
  };
}

export async function createUser(overrides: UserOverrides = {}) {
  const password = overrides.password ?? TEST_PASSWORD;
  const passwordHash =
    overrides.passwordHash ?? (await bcrypt.hash(password, 4));

  const data = buildUser({ ...overrides, passwordHash });
  return db.orm.public.User.create(data);
}

export async function createAdmin(overrides: UserOverrides = {}) {
  return createUser({ ...overrides, role: "ADMIN" });
}
```

Key decisions:

- **Fresh object per call.** No shared fixture is mutated by a test.
- **Valid by default.** `createUser()` alone produces a user that can log in.
- **Overrides are explicit.** A test that cares about `role` says so.
- **Unique email by default.** `randomUUID()` prevents unique-constraint collisions across tests and parallel workers. Tests must not assert on that random value; assert on values they passed in.
- **Low bcrypt cost.** Cost `4` keeps integration tests fast. Production stays at `10`–`12`.
- **`buildUser` vs `createUser`.** `buildUser` is a plain object for unit tests and validation cases; `createUser` persists through the real repository, so it also exercises DB defaults and constraints.
- **Deterministic timestamps by default.** `createdAt` is fixed unless overridden. Use the app's injected clock if the app needs it; do not rely on "now" in assertions.
- **Passwords are returned only as hashes.** Never put a plaintext password into a response object by accident.

### Related-data factories

```ts
// tests/factories/post.ts
import { db } from "../../src/prisma/db.js";
import { createUser } from "./user.js";

export interface PostOverrides {
  title?: string;
  body?: string;
  published?: boolean;
  authorId?: number;
}

let sequence = 0;

export async function createPost(overrides: PostOverrides = {}) {
  sequence += 1;
  const authorId = overrides.authorId ?? (await createUser()).id;

  return db.orm.public.Post.create({
    title: overrides.title ?? `Test post ${sequence}`,
    body: overrides.body ?? "A post created for a test.",
    published: overrides.published ?? false,
    authorId,
  });
}

export async function createPublishedPost(overrides: PostOverrides = {}) {
  return createPost({ ...overrides, published: true });
}
```

The factory handles the foreign key so the test does not repeat setup. When a test needs two posts by the **same** author, it creates the author explicitly and passes `authorId`:

```ts
const author = await createUser();
const first = await createPost({ authorId: author.id });
const second = await createPost({ authorId: author.id });
```

### Factory rules

- **One factory per entity**, with small named variants (`createAdmin`, `createPublishedPost`). Do not build a generic `create("post", ...)` mini-framework.
- **Override only what the test is about.** If the test does not mention `displayName`, let the factory choose it.
- **Do not hide assertions inside factories.** A factory creates data; the test asserts behavior.
- **Keep factories in test code.** They should not ship in the application bundle, and they should be excluded from coverage.
- **Do not depend on insertion order** unless the behavior under test is ordering. Use explicit IDs only when the scenario needs them.
- **Reset or unique-ify unique fields.** Truncation resets sequences between tests; `randomUUID()` protects against collisions when files run in parallel.
- **No real external calls.** Factories create local database rows only.

### Faker: useful, with limits

```ts
import { faker } from "@faker-js/faker";

beforeEach(() => {
  faker.seed(12345);
});
```

- Seed it if a test depends on generated values.
- Prefer explicit values for anything the test asserts.
- Use faker for volume and variety (for example, 50 posts to test pagination), not for precise edge cases.
- Generated strings can exceed column limits or contain characters that violate validation rules. Factories should still produce **valid** data.

```ts
export async function createManyPosts(count: number, overrides: PostOverrides = {}) {
  return Promise.all(
    Array.from({ length: count }, () => createPost(overrides)),
  );
}
```

Be careful with `Promise.all` against a connection pool: 5,000 concurrent inserts will exhaust it. Batch with a bounded concurrency or sequential loops for large counts.

---

## 6. Keeping Tests Deterministic

| Source of nondeterminism | Control |
|--------------------------|---------|
| Current time | Inject `now()` or use `vi.setSystemTime` |
| Random IDs/values | Inject the generator; assert shape, not value |
| Database rows from other tests | Truncate in `beforeEach`; disable file parallelism |
| Test order | Each test creates its own data; never rely on a previous test |
| Network / email / payments | Inject fakes or MSW |
| Floating point money | Use integer cents; assert rounding explicitly |
| Locale/timezone formatting | Pass an explicit locale/timezone; test around DST if relevant |
| Unstable sort | Add a tie-breaker (`created_at`, `id`) and assert the order |
| Background jobs/timers | Fake timers; run jobs manually in tests |
| Logs and stdout | Inject a logger; assert only when the log is part of the contract |

### Bug-fix workflow

When a bug is reported:

1. Write a test that reproduces it and **fails for the right reason**.
2. Fix the code.
3. Confirm the test passes.
4. Keep the test forever — it is the regression guard.

This is TDD applied to maintenance, and it is often the highest-value use of testing in a real codebase.

---

## 7. Putting the Workflow Together

A realistic feature loop:

```text
1. Write the test list in the PR description.
2. For each item:
   a. Write one failing test (RED). Run only that file.
   b. Implement the smallest change that passes (GREEN).
   c. Refactor names, duplication, and helpers. Run all tests.
3. Add integration tests for the HTTP contract and database effects.
4. Replace external services with fakes; test success and failure.
5. Run coverage; inspect uncovered branches (not just percentages).
6. Tighten thresholds for critical modules.
7. Run the suite twice and in CI; fix flakiness before merging.
```

### What "done" looks like

- Unit tests cover the business rules and edge cases
- Integration tests cover the route contract, auth, validation, and persistence
- External calls are faked and asserted
- No test depends on another test's data or execution order
- Coverage meets the agreed thresholds, with meaningful assertions
- The suite passes locally and in CI with `vitest run`
- The README documents the test commands and external-service policy

---

## Check Your Understanding

1. Why do the three TDD rules forbid writing production code before a failing test?
2. What is the difference between the red, green, and refactor steps in terms of what you may change?
3. Why can a project have 95% line coverage and still miss an important rule?
4. What does branch coverage measure that line coverage does not?
5. Why is a per-file coverage threshold stricter than a project-wide one?
6. Why should factories produce unique emails by default in an integration suite?
7. What is the difference between `buildUser()` and `createUser()`, and when do you use each?
8. Why is a fixed timestamp preferable to `new Date()` in a test assertion?
9. Why is "write a test that reproduces the bug first" valuable even outside a TDD team?
10. What would you check first if an integration test passes alone but fails in the full suite?
