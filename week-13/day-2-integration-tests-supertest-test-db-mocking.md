# Day 2 — Integration Tests with Supertest, Test Databases & Mocking

**Previous:** [Day 1 — Testing Fundamentals, the Test Pyramid & Unit Tests with Vitest](day-1-testing-fundamentals-test-pyramid-vitest.md)
**Next:** [Day 3 — TDD, Coverage Thresholds & Test Factories](day-3-tdd-coverage-thresholds-test-factories.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Explain what an integration test covers that a unit test cannot
- Drive an Express app through Supertest without opening a network port manually
- Refactor an app into an injectable factory so tests can substitute dependencies
- Create and protect a disposable test database
- Apply migrations, reset data, and keep tests independent
- Test authentication flows: registration, login, protected routes, and authorization
- Test CRUD endpoints, validation, ownership, and pagination
- Replace email and third-party HTTP services with controllable fakes
- Assert the outbound request, not just the inbound response
- Diagnose flaky integration tests

---

## 1. What an Integration Test Is

A unit test verifies one piece of logic with its dependencies replaced. An **integration test** verifies that several real pieces work together. For a web API, that usually means:

```text
Supertest → Express app → route → middleware → controller → service → repository → test database
```

The boundaries you move inward or outward define the test:

| Included for real | Replaced | What it verifies |
|-------------------|----------|------------------|
| Express app + router + middleware + database | Email, payments, third-party APIs | Routing, validation, auth, status codes, persistence, constraints |
| Only a controller + service | Database, email | Controller/service collaboration without DB cost |
| Full app + real external sandbox | Nothing | A contract with a third-party provider (rare, slow) |

Do **not** replace the database in an integration test if the claim depends on the database. An "integration" test with a mocked repository usually just re-tests your mocks. The unique-email constraint, foreign keys, transactions, and SQL behavior only exist in the real database.

Integration tests are slower than unit tests but far more realistic. They are the best place to verify HTTP behavior, which is what your API consumers actually depend on.

---

## 2. Supertest Basics

Supertest takes an Express app and makes real HTTP requests against it using an ephemeral server. It does not require you to call `app.listen()`:

```ts
import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp(/* dependencies */);

const response = await request(app)
  .post("/auth/register")
  .send({ email: "ada@example.test", password: "long-enough", displayName: "Ada" });

expect(response.status).toBe(201);
expect(response.body.user.email).toBe("ada@example.test");
```

Install it:

```bash
npm install --save-dev supertest @types/supertest
```

Common request shapes:

```ts
await request(app).get("/posts?page=2&limit=10");
await request(app).get("/auth/me").set("Authorization", `Bearer ${token}`);
await request(app).patch("/posts/1").send({ title: "Updated" });
await request(app).delete("/posts/1").set("Authorization", `Bearer ${token}`);
```

Common assertions:

```ts
expect(response.status).toBe(200);
expect(response.headers["content-type"]).toMatch(/application\/json/);
expect(response.body).toMatchObject({ items: expect.any(Array), page: 1 });
expect(response.body.user).not.toHaveProperty("passwordHash");
```

`request(app)` starts a server on an ephemeral port for each request and closes it when the response completes. This avoids port conflicts and makes tests safe to run in parallel — assuming the database is isolated too.

### Test the app, not the server bootstrap

Keep `app.listen()` out of the module that creates the app. A typical split:

```ts
// src/app.ts
export function createApp(deps: AppDependencies) {
  const app = express();
  // middleware, routes, error handlers
  return app;
}

// src/server.ts
import { createApp } from "./app.js";
import { createEmailClient } from "./integrations/email.js";

const app = createApp({ emailClient: createEmailClient() });
const server = app.listen(process.env.PORT ?? 3000);

// graceful shutdown...
```

`server.ts` is intentionally not imported by tests. Importing it would start a listener and keep the process alive.

---

## 3. Make Dependencies Injectable

An app that constructs its own database client, mailer, and payment client deep inside a route is hard to test. Pass dependencies in from the outside — a small amount of wiring buys a lot of testability.

```ts
// src/integrations/email.ts
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailClient {
  send(message: EmailMessage): Promise<{ id: string }>;
}

export function createEmailClient(apiKey: string): EmailClient {
  return {
    async send(message) {
      // calls the real provider; never used in tests
    },
  };
}
```

```ts
// src/integrations/payments.ts
export interface ChargeRequest {
  amountCents: number;
  currency: string;
  customerId: string;
}

export interface ChargeResult {
  id: string;
  status: "succeeded" | "declined";
}

export interface PaymentClient {
  charge(request: ChargeRequest): Promise<ChargeResult>;
}

export function createPaymentClient(options: {
  baseUrl: string;
  apiKey: string;
}): PaymentClient {
  return {
    async charge(request) {
      const response = await fetch(`${options.baseUrl}/v1/charges`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify(request),
      });

      const body = await response.json();
      if (response.status === 402) {
        return { id: String(body.id ?? "unknown"), status: "declined" };
      }
      if (!response.ok) {
        throw new Error(`Payment provider failed with ${response.status}`);
      }
      return { id: String(body.id), status: "succeeded" };
    },
  };
}
```

```ts
// src/app.ts
import express from "express";
import { createAuthRouter } from "./routes/auth.js";
import { createPostsRouter } from "./routes/posts.js";
import type { EmailClient } from "./integrations/email.js";
import type { PaymentClient } from "./integrations/payments.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

export interface Logger {
  error(message: string, context?: Record<string, unknown>): void;
}

export interface AppDependencies {
  emailClient: EmailClient;
  paymentClient: PaymentClient;
  logger?: Logger;
  now?: () => Date;
}

export function createApp(deps: AppDependencies) {
  const app = express();
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", createAuthRouter(deps));
  app.use("/posts", createPostsRouter(deps));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
```

The real server supplies real adapters. Tests supply fakes. The route code does not know the difference.

> If your existing app exports a ready-made `app`, refactoring to a factory is a small change: move the route registration into `createApp`, keep default adapters in `server.ts`, and update tests to call `createApp({ ... })`. Do this before writing many integration tests; retrofitting is more painful later.

---

## 4. Set Up an Isolated Test Database

### Use the same engine as production

Test against PostgreSQL if the app uses PostgreSQL. A SQLite substitute will not enforce the same constraints, types, locking, or SQL behavior, so tests can pass while production fails. For MongoDB, use a separate test database (or a disposable container).

### Use a distinct database and guard against mistakes

```dotenv
# .env.test
DATABASE_URL=postgresql://app:app@127.0.0.1:5432/week13_test
JWT_SECRET=test-only-secret
REDIS_URL=redis://127.0.0.1:6379/15
```

The Redis URL above selects database `15`, keeping cached test keys away from your development data. Better still, inject a fake cache in tests that do not specifically verify caching.

Add a hard guard before any test touches the database:

```ts
// tests/db.ts
import "dotenv/config";
import { db } from "../src/prisma/db.js";

const rawUrl = process.env.DATABASE_URL ?? "";
const databaseName = (() => {
  try {
    return new URL(rawUrl).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
})();

if (!databaseName.endsWith("_test")) {
  throw new Error(
    `Refusing to run tests against "${databaseName || "unknown"}". ` +
      "DATABASE_URL must point to a database whose name ends with _test.",
  );
}

export async function resetDatabase(): Promise<void> {
  const statement = db.raw.sql`
    TRUNCATE TABLE "posts", "users" RESTART IDENTITY CASCADE
  `
    .affectedCount()
    .build();
  await db.runtime().execute(statement);
}
```

This guard is not paranoia. A misconfigured CI job or a copied `.env` can otherwise destroy development data. Prefer a database user that has rights only to the test database as well.

### Create schema from migrations

Create the database once, then apply the same migrations used by the app:

```bash
createdb week13_test

# Apply the committed migrations to the test database (Week 10 Day 3 flow).
DATABASE_URL=postgresql://app:app@127.0.0.1:5432/week13_test \
  npx prisma db migrate --to <ref>
```

Do not rely on `db push`-style synchronization for integration tests: you want to test the migrations that will run in production. For MongoDB, indexes and validators should likewise be created by the same setup code used in deployment.

### Reset between tests

Options, from simplest to fastest:

| Strategy | How | Trade-off |
|----------|-----|-----------|
| **Truncate before each test** | `TRUNCATE ... RESTART IDENTITY CASCADE` | Simple, predictable; slower than transactions |
| **Transaction rollback** | Wrap each test in a transaction and roll back | Fast, but the app must use the same transaction handle |
| **Unique data per test** | Generate unique emails/IDs; never reset | No cleanup, but stale rows accumulate and uniqueness can still collide |
| **Fresh database per worker** | Template database cloned per worker | Fastest parallel isolation, more setup |

Start with truncation. Optimize only if the suite becomes slow.

```ts
// tests/integration/setup.ts
import { afterAll, beforeEach } from "vitest";
import { db } from "../../src/prisma/db.js";
import { resetDatabase } from "../db.js";

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await db.close();
});
```

`beforeEach` (not `beforeAll`) is deliberate: one test must not see another test's rows.

### Load `.env.test` before the app imports the database

Environment variables must be set before `src/prisma/db.ts` is evaluated. Use two ordered setup files:

```ts
// tests/integration/load-env.ts
import { config } from "dotenv";

config({ path: ".env.test" });
```

```ts
// vitest.integration.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: [
      "tests/integration/load-env.ts",
      "tests/integration/setup.ts",
    ],
    fileParallelism: false,
    testTimeout: 10_000,
    hookTimeout: 20_000,
  },
});
```

Vitest evaluates `setupFiles` in order before the test file, so `.env.test` is loaded before `setup.ts` imports `db`.

### Parallelism and the shared database

Vitest runs test **files** in parallel by default. Two files truncating the same tables at the same time produce confusing failures. For a single shared test database, disable file parallelism for integration tests:

```ts
fileParallelism: false,
```

For a larger suite, use a separate schema or database per worker (for example, `week13_test_${process.env.VITEST_WORKER_ID}`) and keep parallel execution. Do not reach for that complexity until the serial suite is too slow.

### Transaction rollback caveat

Rolling back a transaction per test is only valid if the code under test uses the **same** connection/transaction as the test. If the app imports a shared `db` and the test wraps `db.transaction(...)`, the HTTP handler may still use the pool outside your transaction. Truncation avoids this trap.

---

## 5. Testing Authentication Endpoints

Assume the app exposes:

```text
POST /auth/register   { email, password, displayName }  → 201 { user }
POST /auth/login      { email, password }               → 200 { token }
GET  /auth/me         Authorization: Bearer <token>     → 200 { user }
```

### A minimal user factory

Day 3 covers factories in depth. For now, a small helper keeps tests readable:

```ts
// tests/factories/user.ts
import bcrypt from "bcryptjs";
import { db } from "../../src/prisma/db.js";

let sequence = 0;

export interface CreateUserOverrides {
  email?: string;
  displayName?: string;
  password?: string;
  role?: "USER" | "ADMIN";
}

export async function createUser(overrides: CreateUserOverrides = {}) {
  sequence += 1;
  const password = overrides.password ?? "correct-horse-battery";
  const passwordHash = await bcrypt.hash(password, 4); // low cost: tests only

  return db.orm.public.User.create({
    email: overrides.email ?? `user${sequence}@example.test`,
    displayName: overrides.displayName ?? `Test User ${sequence}`,
    passwordHash,
    role: overrides.role ?? "USER",
  });
}

export const DEFAULT_PASSWORD = "correct-horse-battery";
```

Use bcrypt cost `4` in tests, not the production cost (`10`–`12`). Hashing at cost 12 hundreds of times dominates test duration for no security benefit. Never weaken the production configuration.

### Registration tests

```ts
// tests/integration/auth.test.ts
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { db } from "../../src/prisma/db.js";
import { createUser } from "../factories/user.js";

function makeDeps() {
  return {
    emailClient: { send: vi.fn().mockResolvedValue({ id: "msg_test" }) },
    paymentClient: { charge: vi.fn() },
  };
}

function makeApp() {
  return createApp(makeDeps());
}

async function loginAs(
  app: ReturnType<typeof createApp>,
  email: string,
  password = "correct-horse-battery",
) {
  const response = await request(app)
    .post("/auth/login")
    .send({ email, password });
  expect(response.status).toBe(200);
  return response.body.token as string;
}

describe("POST /auth/register", () => {
  it("creates a user and returns 201 without exposing the password hash", async () => {
    const app = makeApp();

    const response = await request(app).post("/auth/register").send({
      email: "  Ada@Example.TEST ",
      password: "correct-horse-battery",
      displayName: "  Ada Lovelace  ",
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      email: "ada@example.test",
      displayName: "Ada Lovelace",
      role: "USER",
    });
    expect(response.body.user).not.toHaveProperty("passwordHash");
    expect(response.body.user).not.toHaveProperty("password");

    const stored = await db.orm.public.User.where({
      email: "ada@example.test",
    }).first();
    expect(stored?.passwordHash).not.toBe("correct-horse-battery");
  });

  it("rejects a duplicate email with 409 and leaves one user", async () => {
    const app = makeApp();
    await createUser({ email: "ada@example.test" });

    const response = await request(app).post("/auth/register").send({
      email: "ADA@example.test",
      password: "another-long-password",
      displayName: "Ada Again",
    });

    expect(response.status).toBe(409);
    const { total } = await db.orm.public.User.aggregate((a) => ({
      total: a.count(),
    }));
    expect(total).toBe(1);
  });

  it("rejects a short password with 422", async () => {
    const response = await makeApp().post("/auth/register").send({
      email: "ada@example.test",
      password: "short",
      displayName: "Ada",
    });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ error: expect.any(String) });
  });
});
```

In a real suite, move `makeDeps`, `makeApp`, and `loginAs` into `tests/integration/helpers.ts` so the auth and CRUD test files share them.

Notice what this verifies that a unit test cannot:

- the route exists and maps to the controller
- request validation returns the documented status
- the database unique constraint surfaces as **409**, not a 500
- middleware/error handling does not leak stack traces
- the serializer omits the hash

### Login and protected-route tests

```ts
describe("POST /auth/login", () => {
  it("returns a token for valid credentials", async () => {
    await createUser({ email: "ada@example.test", password: "correct-horse-battery" });

    const response = await request(createApp(makeDeps()))
      .post("/auth/login")
      .send({ email: "ada@example.test", password: "correct-horse-battery" });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.email).toBe("ada@example.test");
  });

  it("returns 401 for a wrong password without revealing which field failed", async () => {
    await createUser({ email: "ada@example.test", password: "correct-horse-battery" });

    const response = await request(createApp(makeDeps()))
      .post("/auth/login")
      .send({ email: "ada@example.test", password: "wrong-password" });

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/invalid credentials/i);
    expect(response.body.error).not.toMatch(/password|email/i);
  });

  it("returns 401 for an unknown email", async () => {
    const response = await request(createApp(makeDeps()))
      .post("/auth/login")
      .send({ email: "nobody@example.test", password: "correct-horse-battery" });

    expect(response.status).toBe(401);
  });
});

describe("GET /auth/me", () => {
  it("returns 401 when the Authorization header is missing", async () => {
    const response = await request(createApp(makeDeps())).get("/auth/me");
    expect(response.status).toBe(401);
  });

  it("returns 401 for a malformed or expired token", async () => {
    const response = await request(createApp(makeDeps()))
      .get("/auth/me")
      .set("Authorization", "Bearer not-a-real-token");
    expect(response.status).toBe(401);
  });

  it("returns the current user for a valid token", async () => {
    const app = createApp(makeDeps());
    await createUser({ email: "ada@example.test", password: "correct-horse-battery" });

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "ada@example.test", password: "correct-horse-battery" });

    const me = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${login.body.token}`);

    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("ada@example.test");
    expect(me.body.user).not.toHaveProperty("passwordHash");
  });
});
```

Use the real login endpoint to obtain tokens in auth tests. For non-auth tests where a token is just setup, a `signTestToken(user)` helper is acceptable and faster; sign it with the same test secret the app uses.

### Authorization, not just authentication

Authentication answers "who are you?"; authorization answers "may you do this?" Test both:

```ts
it("returns 403 when a non-owner edits another user's post", async () => {
  const app = createApp(makeDeps());
  const owner = await createUser();
  const other = await createUser();
  const token = await loginAs(app, other.email);

  const post = await db.orm.public.Post.create({
    title: "Owner's post",
    body: "Hello",
    authorId: owner.id,
  });

  const response = await request(app)
    .patch(`/posts/${post.id}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ title: "Hijacked" });

  expect(response.status).toBe(403);

  const unchanged = await db.orm.public.Post.where({ id: post.id }).first();
  expect(unchanged?.title).toBe("Owner's post");
});
```

Assert the **database state** after a rejected write. A 403 response with a completed write is still a security bug.

---

## 6. Testing CRUD Endpoints

For each resource, cover the contract systematically:

| Concern | Example assertion |
|---------|-------------------|
| Create | `201`, returns created resource, persists row |
| Validation | `422` for missing/invalid fields; no row created |
| Read one | `200` shape; `404` for missing ID |
| Read list | bounded pagination, stable ordering, filters |
| Update | allowed fields only; `404` missing; `403` wrong owner |
| Delete | `204`/`200`, row gone, second delete `404` |
| Auth | `401` without token; `403` wrong role |
| Error hygiene | no stack traces, SQL, or secrets in the body |

```ts
describe("POST /posts", () => {
  it("creates a post owned by the authenticated user", async () => {
    const app = createApp(makeDeps());
    const author = await createUser();
    const token = await loginAs(app, author.email);

    const response = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Testing integration", body: "Real route, real database." });

    expect(response.status).toBe(201);
    expect(response.body.post).toMatchObject({
      title: "Testing integration",
      authorId: author.id,
    });

    const stored = await db.orm.public.Post.where({
      id: response.body.post.id,
    }).first();
    expect(stored?.authorId).toBe(author.id);
  });

  it("rejects a missing title with 422 and does not create a row", async () => {
    const app = createApp(makeDeps());
    const author = await createUser();
    const token = await loginAs(app, author.email);

    const response = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ body: "No title here" });

    expect(response.status).toBe(422);
    const { total } = await db.orm.public.Post.aggregate((a) => ({
      total: a.count(),
    }));
    expect(total).toBe(0);
  });
});

describe("GET /posts", () => {
  it("returns a bounded page in creation order", async () => {
    const app = createApp(makeDeps());
    const author = await createUser();
    for (let index = 1; index <= 3; index += 1) {
      await db.orm.public.Post.create({
        title: `Post ${index}`,
        body: "Body",
        authorId: author.id,
        createdAt: new Date(`2026-01-0${index}T00:00:00.000Z`),
      });
    }

    const response = await request(app).get("/posts?page=1&limit=2");

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items.map((post: { title: string }) => post.title)).toEqual([
      "Post 3",
      "Post 2",
    ]);
    expect(response.body.total).toBe(3);
  });

  it("caps an oversized limit instead of returning every row", async () => {
    const response = await request(createApp(makeDeps())).get("/posts?limit=100000");
    expect(response.status).toBe(200);
    expect(response.body.limit).toBeLessThanOrEqual(50);
  });
});

describe("DELETE /posts/:id", () => {
  it("returns 404 for an unknown id", async () => {
    const app = createApp(makeDeps());
    const user = await createUser();
    const token = await loginAs(app, user.email);

    const response = await request(app)
      .delete("/posts/999999")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
  });

  it("deletes the owner's post and then reports 404", async () => {
    const app = createApp(makeDeps());
    const owner = await createUser();
    const token = await loginAs(app, owner.email);
    const post = await db.orm.public.Post.create({
      title: "Delete me",
      body: "Body",
      authorId: owner.id,
    });

    const first = await request(app)
      .delete(`/posts/${post.id}`)
      .set("Authorization", `Bearer ${token}`);
    const second = await request(app)
      .delete(`/posts/${post.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(first.status).toBe(204);
    expect(second.status).toBe(404);
  });
});
```

### Test behavior that is easy to forget

- **Validation happens before the database.** A 422 must not leave a partial row.
- **The normalized value is what is stored.** Registering with `ADA@Example.TEST` should store `ada@example.test`.
- **Secrets never cross the boundary.** No `passwordHash`, reset token, internal stack, or provider error in a response.
- **Authorization is enforced on every method.** Test `PATCH`/`DELETE`, not only `GET`.
- **Pagination is stable.** Use a deterministic sort with a tie-breaker such as `id`; otherwise rows can reorder and tests flake.
- **Unknown IDs and malformed IDs differ.** `/posts/abc` should be a 400/422, not a 500.

---

## 7. Mocking External Calls

External services are the enemy of deterministic tests: they are slow, rate-limited, sometimes unavailable, and may charge money or send real messages. Replace them at the **edge of your system**:

```text
Verified here ─────────────────────────────┐
Route → service → payment adapter → [network] → provider
                                      └─ replaced by a fake or MSW
```

### Pattern A: Inject a fake adapter (preferred)

You already made `emailClient` and `paymentClient` dependencies. In tests, pass a controllable fake:

```ts
it("sends one welcome email to the normalized address", async () => {
  const emailClient = { send: vi.fn().mockResolvedValue({ id: "msg_1" }) };
  const app = createApp({ emailClient, paymentClient: { charge: vi.fn() } });

  const response = await request(app).post("/auth/register").send({
    email: "  Ada@Example.TEST ",
    password: "correct-horse-battery",
    displayName: "Ada",
  });

  expect(response.status).toBe(201);
  expect(emailClient.send).toHaveBeenCalledTimes(1);
  expect(emailClient.send).toHaveBeenCalledWith({
    to: "ada@example.test",
    subject: "Welcome to the app",
    text: expect.stringContaining("Ada"),
  });
});
```

This asserts the **outbound contract**: recipients, subject, and content. If someone later sends the email to the raw unnormalized input, the test fails.

### Failure policy

External failures need an explicit product decision. For example: a welcome email failing must not roll back a successful registration; a payment failure must not create a paid order.

```ts
it("still registers the user when the welcome email fails", async () => {
  const logger = { error: vi.fn() };
  const emailClient = {
    send: vi.fn().mockRejectedValue(new Error("smtp unavailable")),
  };
  const app = createApp({ emailClient, paymentClient: { charge: vi.fn() }, logger });

  const response = await request(app).post("/auth/register").send({
    email: "ada@example.test",
    password: "correct-horse-battery",
    displayName: "Ada",
  });

  expect(response.status).toBe(201);
  expect(logger.error).toHaveBeenCalledWith(
    "Welcome email failed",
    expect.objectContaining({ userId: expect.any(Number) }),
  );
  const stored = await db.orm.public.User.where({
    email: "ada@example.test",
  }).first();
  expect(stored).not.toBeNull();
});
```

Write down the policy in the README: *"Registration succeeds even if the welcome email is delayed; emails are retried by the mail worker."* Otherwise the next developer will guess and change the behavior.

### Pattern B: Mock at the HTTP layer with MSW

If your code calls `fetch` directly (or an HTTP client MSW supports), Mock Service Worker intercepts the request without changing your code:

```bash
npm install --save-dev msw
```

```ts
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.js";
import { createPaymentClient } from "../../src/integrations/payments.js";
import { createUser } from "../factories/user.js";

const provider = setupServer();

beforeAll(() => provider.listen({ onUnhandledRequest: "error" }));
afterEach(() => provider.resetHandlers());
afterAll(() => provider.close());

function makeHttpDeps() {
  return {
    emailClient: { send: vi.fn().mockResolvedValue({ id: "msg_test" }) },
    paymentClient: createPaymentClient({
      baseUrl: "https://api.payments.test",
      apiKey: "test-key",
    }),
  };
}

describe("POST /orders", () => {
  it("charges the provider and creates a paid order", async () => {
    let received: unknown;

    provider.use(
      http.post("https://api.payments.test/v1/charges", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ id: "ch_123", status: "succeeded" }, { status: 201 });
      }),
    );

    const app = createApp(makeHttpDeps());
    const user = await createUser();
    const token = await loginAs(app, user.email);

    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ amountCents: 2500, currency: "USD" });

    expect(response.status).toBe(201);
    expect(received).toMatchObject({ amountCents: 2500, currency: "USD" });
    expect(response.body.order.status).toBe("paid");
  });

  it("maps a provider decline to 422 without leaking the provider error", async () => {
    provider.use(
      http.post("https://api.payments.test/v1/charges", () =>
        HttpResponse.json(
          { error: "card_declined", internal_trace: "secret-trace" },
          { status: 402 },
        ),
      ),
    );

    const app = createApp(makeHttpDeps());
    const user = await createUser();
    const token = await loginAs(app, user.email);

    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ amountCents: 2500, currency: "USD" });

    expect(response.status).toBe(422);
    expect(response.body.error).toMatch(/declined/i);
    expect(JSON.stringify(response.body)).not.toContain("card_declined");
    expect(JSON.stringify(response.body)).not.toContain("secret-trace");
  });
});
```

MSW only helps if the app uses the **real** HTTP client. Construct the app with the real client pointed at a test base URL, as `makeHttpDeps()` does. Do not inject a fake payment client in these tests, or the request never leaves your code and MSW has nothing to intercept.

`onUnhandledRequest: "error"` is important: if a test forgets a handler, it fails instead of silently making a real network request.

Simulate transport failures with `HttpResponse.error()`. Simulate timeouts by **injecting a client with a short timeout**, not by sleeping for 30 seconds in a test. Keep provider tests to the cases you map: success, decline/4xx, provider 5xx, and transport failure.

> MSW intercepts popular Node clients, but coverage varies by client and version. If interception does not work, the adapter-injection pattern is the more reliable option.

### Pattern C: `vi.mock` a module (use sparingly)

```ts
vi.mock("../src/integrations/email.js", () => ({
  createEmailClient: () => ({
    send: vi.fn().mockResolvedValue({ id: "test" }),
  }),
}));
```

`vi.mock` is hoisted above imports and replaces the module for the whole file. It is convenient for legacy code but couples tests to module paths and can hide broken wiring. Prefer dependency injection for new code. If you use `vi.mock`, reset implementations between tests so state does not leak.

### What not to mock

| Don't mock | Why |
|------------|-----|
| The database when testing persistence/constraints | You would only test your fake |
| The code under test | The test proves nothing |
| Express itself | Supertest already gives you the real HTTP layer |
| Time zones/clock via sleeping | Use fake timers or an injected clock |
| Auth middleware in auth tests | You would skip the behavior you are verifying |

For tests of *unrelated* endpoints, you may stub authentication (for example, an injected `authenticate` that sets `req.user`) to keep the test focused. Be explicit in the test name that auth is stubbed.

---

## 8. Flaky Integration Tests

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Passes alone, fails in the suite | Shared rows between tests | Reset in `beforeEach`; disable file parallelism |
| Random 500s | Test and app use different databases/env | Load `.env.test` before importing `db`; assert the DB name |
| Port already in use | Calling `app.listen()` in tests | Use `request(app)`; never import `server.ts` |
| Intermittent 401 | Token from another user or expired clock | Create a fresh token per test; freeze time if TTLs are short |
| Different order every run | Unstable sort / no tie-breaker | Add a deterministic `ORDER BY ... , id` |
| Timeout waiting for email | Real mailer or hung network | Inject a fake; never call the real provider |
| Test passes locally, fails in CI | CI DB not migrated or parallel workers collide | Run migrations in CI; isolate/disable parallelism |
| Lingering process | DB/Redis/HTTP client not closed | `afterAll` closes the pool; check open handles |

Run integration tests serially until you have a concrete reason to parallelize. A fast but wrong suite is worse than a slower reliable one.

---

## 9. Integration Test Checklist

- [ ] The app is created by a factory; no listener is started in tests
- [ ] `DATABASE_URL` points to a `*_test` database and is guarded in code
- [ ] Schema is created from the same migrations as production
- [ ] Data is reset before each test
- [ ] Every test creates its own users and rows; no test depends on order
- [ ] Outbound email/payment calls are faked; no real network requests
- [ ] Tests assert status, response shape, and the resulting database state
- [ ] Passwords, tokens, hashes, and provider errors never appear in responses or logs
- [ ] `401` and `403` are tested, not just the happy path
- [ ] Integration tests run with `vitest run --config vitest.integration.config.ts`
- [ ] The suite passes twice in a row and after `TRUNCATE`

---

## Check Your Understanding

1. Why is mocking the repository a poor choice for an integration test of a unique-email rule?
2. Why should tests import `app.ts` rather than `server.ts`?
3. What can go wrong if two integration test files truncate the same tables in parallel?
4. Why does the test database need real migrations instead of an auto-synced schema?
5. Why is asserting the outbound email payload as important as asserting the HTTP response?
6. When an external payment call fails, what should the test assert besides the status code?
7. Why is `onUnhandledRequest: "error"` important in MSW setup?
8. How would you prove that a rejected `PATCH` did not modify the row?
