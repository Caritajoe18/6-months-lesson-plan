# Week 13 — Assignments: Testing

> Use Node.js with TypeScript or JavaScript. You may apply these assignments to an API you built in Weeks 7–12 or to the provided starter project. Keep all test code out of production bundles, never commit real credentials, and use a dedicated test database. A test that cannot fail is not a test.

**Deliverables for every assignment**

- Source code and tests committed
- Commands to run the tests in `README.md`
- A short `TESTING.md` (one page) explaining your test strategy, test data approach, and any trade-offs
- Green run of `vitest run` (not watch mode) from a clean checkout

| Assignment | Weight |
|------------|--------|
| 1. Unit tests for services and utilities | 30% |
| 2. Integration tests for auth and CRUD | 40% |
| 3. Mock external calls | 30% |

---

## Assignment 1: Unit Tests for Service and Utility Functions

**Objective:** Build a fast, deterministic unit-test suite for the business logic in your API.

### Choose your targets

Select **at least two** modules with meaningful logic. Examples:

- pricing, discounts, tax, or cart totals
- pagination and sorting parameter parsing
- slug generation, text normalization, or email normalization
- password policy or permission evaluation
- JWT claim construction (not signing with real secrets)
- date-range or reporting-window calculations
- a service that coordinates a repository and a hasher/mailer through injected dependencies

Do **not** choose trivial getters, framework wiring, or generated code.

### Required behavior

1. Write **at least 15 unit tests** across the chosen modules.
2. Cover, where applicable:
   - the happy path
   - empty/zero input
   - boundary values (minimum, maximum, exactly at a threshold)
   - invalid input and the specific error type/message
   - async success and async rejection
   - a branch where a dependency is called and where it is not
3. Use `it.each` for at least one table-driven rule.
4. Use a fake dependency or `vi.fn()` for every external collaborator. No database, network, filesystem, real clock, or real UUIDs.
5. Use fake timers or an injected clock for any time-dependent logic.
6. Assert observable behavior and outgoing calls — not private helpers or internal ordering.
7. Remove or refactor code only when needed to introduce a seam (dependency injection). Do not change behavior merely to raise coverage.

### Requirements

- Unit tests must run without a database or any environment secrets.
- Each test creates its own data; no test depends on another test.
- Tests must be readable: Arrange–Act–Assert, behavior-focused names.
- No test may pass when the implementation is replaced with `throw new Error()`. Spot-check this by temporarily breaking a function.
- Add a `test:unit` script that runs only the unit suite.
- Report coverage for the modules you chose, with a target of **≥ 90% lines and ≥ 85% branches** for those files. Include the summary in `TESTING.md`.
- Do not use blanket ignore comments to reach the target.

### Suggested structure

```text
src/lib/pricing.test.ts
src/services/user-service.test.ts
tests/unit/…
```

### Grading

| Criteria | Points |
|----------|--------|
| Behavioral coverage of rules and edge cases | 35% |
| Correct isolation (fakes, injected clock, no I/O) | 25% |
| Test readability, naming, and table-driven cases | 20% |
| Meaningful assertions and failure-path coverage | 10% |
| Coverage report and `TESTING.md` explanation | 10% |

---

## Assignment 2: Integration Tests for Auth and CRUD Endpoints

**Objective:** Prove the HTTP contract and database behavior of your authentication flow and one CRUD resource using Supertest and a disposable test database.

### Required behavior

Test the following flows end to end through the Express app, with the real router, middleware, validation, service, and database:

**Authentication**

| Case | Expected |
|------|----------|
| Register with valid data | `201`, normalized email, no password/hash in response |
| Register with a duplicate email (including different casing) | `409`, still one row |
| Register with invalid input (short password, bad email) | `422`, no row created |
| Login with valid credentials | `200`, usable token |
| Login with a wrong password / unknown email | `401`, no field-disclosure |
| Protected route without a token | `401` |
| Protected route with a malformed/expired token | `401` |
| Protected route with a valid token | `200`, correct user |
| Role-restricted action as the wrong role | `403` |

**CRUD resource** (posts, tasks, products, or similar)

| Case | Expected |
|------|----------|
| Create (authenticated) | `201`, persisted, owner set from the token |
| Create with invalid/missing fields | `422`, no row created |
| List | bounded pagination, stable deterministic order |
| List with an oversized `limit` | capped, not unbounded |
| Get by ID | `200` with the expected shape |
| Get an unknown ID | `404` |
| Get/accept a malformed ID | `400`/`422`, not `500` |
| Update own record | `200`, only allowed fields change |
| Update another user's record | `403`, database unchanged |
| Delete own record, then delete again | success, then `404` |
| Any endpoint with a server error | no stack trace, SQL, or secret in the body |

### Requirements

- Use a dedicated database whose name ends in `_test`. Add a runtime guard that refuses to run otherwise.
- Create the schema from the **same migrations** used by the application.
- Reset data before each test (`TRUNCATE ... RESTART IDENTITY CASCADE` or an equivalent).
- Keep integration tests independent and order-agnostic. The full suite must pass twice in a row.
- Build rows through factories or helpers; no copied 15-field literals in every test.
- Do not call real email, payment, or third-party services. Inject fakes.
- Do not import `server.ts` or call `app.listen()` in tests. Use `request(app)`.
- Keep the test database credentials in `.env.test` (git-ignored). Commit `.env.example`.
- Add `test:integration` and `test:coverage` scripts and a CI workflow that runs them.
- Set coverage thresholds for the tested routes/controllers/services (suggested: 80% lines, 75% branches). CI must fail when they drop below.

### Deliverables

- Integration test files plus factories and setup
- `vitest.integration.config.ts`
- Database setup/teardown helper and guard
- CI workflow that provisions the test database, applies migrations, and runs the suite
- `TESTING.md` with the isolation strategy and how to run the suite locally

### Grading

| Criteria | Points |
|----------|--------|
| Auth flow coverage, including `401`/`403`/`409`/`422` | 25% |
| CRUD contract, persistence, ownership, and pagination | 25% |
| Test database isolation, migration, reset, and safety guard | 20% |
| Test independence, determinism, and factory use | 15% |
| CI integration, coverage thresholds, and documentation | 15% |

---

## Assignment 3: Mock External Calls (Email and Third-Party APIs)

**Objective:** Test code that depends on external services without contacting them, and verify both the outbound request and the application's failure policy.

### Required behavior

Choose **one email flow** and **one third-party API flow** that your app uses, or add a small feature that uses them. Examples:

- welcome email on registration
- password-reset email
- order confirmation email
- payment charge or refund
- address/geocoding lookup
- shipping-rate or inventory lookup

For **each** external call, test:

1. **Success:** the application returns the expected response and the outbound payload contains the correct recipient/amount/identifier.
2. **Provider error:** a 4xx/5xx or declined result maps to the documented application response (`422`, `502`, etc.).
3. **Transport failure:** a network error or timeout is handled without crashing the process or leaving partial state.
4. **No leakage:** provider error codes, internal traces, API keys, and stack traces do not appear in the API response or logs.
5. **Failure policy:** assert the documented outcome. For example, a failed welcome email must not roll back registration; a failed payment must not create a paid order.
6. **No duplicate effect:** where relevant, a retried request does not charge twice or create duplicate orders. A unique idempotency key or provider request ID is acceptable evidence.

### Choose one mocking approach

- **Preferred:** inject an adapter (`EmailClient`, `PaymentClient`) and pass a fake in tests.
- **Acceptable:** use MSW to intercept the HTTP call at the network boundary.

Do **not** mock the service, controller, or repository you are trying to verify. Do not hit a real provider, even in "test mode", unless the assignment explicitly requires a sandbox and you have permission.

### Requirements

- With the network disabled, the suite still passes.
- `onUnhandledRequest: "error"` (MSW) or an equivalent guard prevents accidental real requests.
- Assert the outgoing request body/arguments, not only the response status.
- Test at least one failure per external dependency.
- Never log or return secrets. Redact tokens and authorization headers in diagnostics.
- Add the failure policy and the test commands to `TESTING.md`.
- Include an `.env.example`; no real API keys in the repository.
- If you add a retry, test the retry count and the final failure. Use fake timers so the test does not actually wait.

### Suggested test cases

```text
POST /auth/register
  ✓ sends one welcome email to the normalized address
  ✓ still creates the user when the email provider fails (policy documented)
  ✓ does not send a welcome email when registration is rejected

POST /orders
  ✓ charges the provider once with the expected amount and currency
  ✓ maps a declined card to 422 without leaking the provider error
  ✓ does not mark the order paid when the provider is unavailable
  ✓ returns a safe 502 when the provider times out
  ✓ retried request does not create a second charge
```

### Grading

| Criteria | Points |
|----------|--------|
| Success-path assertion of the outbound contract | 25% |
| Error, decline, timeout, and transport-failure coverage | 25% |
| Correct failure policy and database state | 20% |
| No secret leakage; no real external calls | 15% |
| Documentation, reproducibility, and CI safety | 15% |

---

## Definition of Done

All three assignments together should satisfy:

- [ ] `npm ci && npm run test:run` passes from a clean checkout
- [ ] Unit tests require no database, network, or secrets
- [ ] Integration tests use a guarded `*_test` database and reset data
- [ ] Test order can be shuffled (`vitest run --sequence.shuffle`) without failures
- [ ] External services are faked; the suite passes offline
- [ ] Coverage thresholds are enforced in CI
- [ ] No test depends on watch mode, sleeps, real time, or a previous test's data
- [ ] No credentials, tokens, password hashes, or personal data are committed or logged
- [ ] `README.md` and `TESTING.md` explain setup, commands, and test strategy

## Submission Checklist

- [ ] Link to the repository or branch
- [ ] CI run URL showing tests and coverage
- [ ] `TESTING.md` summarizing:
  - which modules/endpoints are covered and why
  - how the test database is isolated and reset
  - which external services are faked and how failures are handled
  - the current coverage report and the thresholds enforced
  - known gaps and what you would test next
- [ ] Short reflection (5–8 sentences): what TDD changed about your design, and which test caught a real bug
