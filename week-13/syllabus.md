# Week 13 — Testing

## Overview

Weeks 7–12 built an Express API with authentication, a database, and Redis. This week turns those features into something you can change without fear. You will write **unit tests** with Vitest, **integration tests** with Supertest against a real test database, and use **TDD** to drive new code. You will also learn how to isolate external services (email, payments, third-party APIs) so tests are fast, repeatable, and safe to run in CI.

Testing is not a phase you add at the end. A test is a small, executable specification: it describes the behavior you expect and then proves the code still provides it after a change. Coverage is a **measurement of which lines ran**, not proof of correctness; it is useful as a floor, not a goal on its own.

## Prerequisites

- Week 7–8: Express, middleware, validation, JWT authentication, and RBAC
- Week 9–11: SQL/Prisma or MongoDB data access through a repository/service layer
- Week 12: Redis-backed caching, rate limiting, and sessions (useful for integration test ideas)
- Node.js LTS, npm, and a PostgreSQL (or MongoDB) instance you can create a disposable test database in

## Files

| File | Topic | Type |
|------|-------|------|
| [Day 1](day-1-testing-fundamentals-test-pyramid-vitest.md) | Testing fundamentals, test pyramid, unit tests with Vitest | Theory + code |
| [Day 2](day-2-integration-tests-supertest-test-db-mocking.md) | Integration tests with Supertest, test DB setup, mocking | Theory + code |
| [Day 3](day-3-tdd-coverage-thresholds-test-factories.md) | TDD workflow, coverage thresholds, test factories | Hands-on |
| [Assignments](assignments.md) | Unit tests, integration tests, mocked externals | Practice |

## Tools & Packages

```bash
npm install --save-dev vitest @vitest/coverage-v8 supertest @types/supertest
npm install --save-dev msw                 # optional: mock HTTP at the fetch layer
npm install --save-dev @faker-js/faker     # optional: fake data (use with a seed)
```

Unit tests need no database. Integration tests reuse the app's existing runtime packages, such as `express`, `jsonwebtoken`, `bcryptjs`, and the ORM/driver.

Recommended scripts:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:unit": "vitest run --config vitest.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --config vitest.config.ts"
  }
}
```

Use a separate test database and environment file. Never point tests at development or production data:

```dotenv
# .env.test — commit placeholders only, never real credentials
DATABASE_URL=postgresql://app:app@127.0.0.1:5432/week13_test
JWT_SECRET=test-only-secret-not-used-in-production
```

Commit `.env.example`; add `.env.test` to `.gitignore` if it contains machine-specific values.

## Learning Outcomes

By the end of the week, you should be able to:

- Explain the purpose and limits of unit, integration, and end-to-end tests
- Use the test pyramid (and the testing trophy) to decide where a new test belongs
- Write focused Vitest tests using Arrange–Act–Assert, table-driven cases, and meaningful assertions
- Test async code, errors, and time-dependent behavior deterministically
- Test an Express app through Supertest without opening a real network port
- Create, migrate, seed, and reset an isolated test database
- Keep integration tests independent, repeatable, and safe against the wrong database
- Replace external services with fakes, spies, stubs, or MSW and assert the outgoing contract
- Apply the red–green–refactor TDD loop in small steps
- Set coverage thresholds that fail CI without encouraging meaningless tests
- Build test factories that produce valid, overridable data
- Diagnose and remove flaky tests

## Suggested Rhythm

```text
Mon Day 1 — testing fundamentals, test pyramid, Vitest unit tests
Tue Day 2 — Supertest, test database lifecycle, mocking externals
Wed Day 3 — TDD, coverage thresholds, factories, flake removal
Thu–Fri   — assignments 1–3, coverage report, and documentation
```

## Ground Rules

- **Test behavior, not implementation.** Assert what a caller observes (return value, HTTP response, outgoing request), not private helpers or internal call order unless it is part of the contract.
- **One reason to fail per test.** A failing test should tell you what broke.
- **Determinism is non-negotiable.** No real clock, random IDs, live network, shared mutable state, or dependence on test order.
- **Isolation over realism at the unit level.** A unit test that needs the internet or a database is an integration test wearing a disguise.
- **Mock at the boundary, not everywhere.** Prefer injecting a dependency over mocking a module. Do not mock the code you are trying to verify.
- **Every test must be able to fail.** A test that passes when the implementation is deleted proves nothing.
- **The test database is disposable.** Guard against non-test database names, create schema from migrations, and clean up between tests.
- **Never send real email or charge a real card in a test.** Use a fake adapter or a request-level mock such as MSW, and assert the payload your code would send.
- **Coverage is a floor, not a target for its own sake.** Require coverage on business logic; exclude generated code, bootstrap files, and type-only modules.
- **Do not log secrets, tokens, password hashes, or full request bodies** in test output.
- **A flaky test is a broken test.** Fix or remove it; do not retry it until it passes.

## Assessment

| Deliverable | Weight |
|-------------|--------|
| Assignment 1 — Unit tests for services/utilities | 30% |
| Assignment 2 — Integration tests for auth and CRUD | 40% |
| Assignment 3 — Mock external calls | 30% |

## Sources

- [Vitest documentation](https://vitest.dev/guide/)
- [Vitest coverage](https://vitest.dev/guide/coverage)
- [Supertest](https://github.com/ladjs/supertest)
- [Mock Service Worker](https://mswjs.io/docs/)
- [Martin Fowler — The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Kent Beck — Test-Driven Development by Example](https://www.oreilly.com/library/view/test-driven-development/0321146530/)
- [Node.js test runner](https://nodejs.org/api/test.html) (comparison only)
