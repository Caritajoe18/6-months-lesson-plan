# Week 8 — Authentication & Security (TypeScript)

## Overview

Week 8 moves from "does the server work?" to **"who is allowed to do what, and can we stop the bad guys?"**. You will learn how passwords are stored safely, how tokens prove who you are, how to protect routes, and how to harden an HTTP API against common attacks.

> Everything is TypeScript and follows the same project layout you used in Week 7 (`config / types / middleware / controllers / routes / store`).

## Prerequisites

- Week 6 (TypeScript) & Week 7 (Node internals + Express)
- Comfort building an Express CRUD API
- `strict: true` tsconfig discipline (zero `any`)

## Files

| File | Topic | Type |
|------|-------|------|
| [Day 1](day-1-auth-concepts-password-hashing.md) | Auth concepts, password hashing with bcrypt, sessions vs tokens, JWT structure | Theory + code |
| [Day 2](day-2-jwt-rbac-refresh-tokens.md) | JWT sign/verify, protected routes, roles/permissions, refresh tokens | Theory + code |
| [Day 3](day-3-security-hardening-owasp.md) | helmet, CORS, rate limiting, input sanitization, OWASP Top 10 basics | Hands-on |
| [Assignments](assignments.md) | 3 graded assignments building on an existing API | Practice |
| [Project](project-authenticated-task-manager.md) | Authenticated Task Manager API (JWT, roles, full CRUD) | Capstone |

## Tools & Packages

```bash
npm install bcryptjs jsonwebtoken helmet cors express-rate-limit zod
npm install -D typescript tsx @types/node @types/express @types/jsonwebtoken @types/cors
```

> Use `bcryptjs` — pure JS, no native build step, identical API to `bcrypt` for teaching purposes.

## Learning Outcomes

By the end of the week you should be able to:

- Store passwords as salted bcrypt hashes — never plaintext
- Distinguish sessions from tokens and choose one for your API
- Explain and decode a JWT: `header.payload.signature`
- Sign and verify JWTs with `jsonwebtoken` (typed payload)
- Protect routes with typed middleware and augment `Express.Request`
- Enforce role-based access (admin vs user)
- Implement refresh-token rotation
- Apply helmet, strict CORS, and rate limiting
- Validate and sanitize input with `zod`
- Map the OWASP Top 10 to concrete defenses in your code

## Suggested Rhythm

```text
Mon  Day 1 — theory + hashing exercises
Tue  Day 2 — JWT + protected routes exercises
Wed  Day 3 — hardening hands-on
Thu–Fri      — assignments (3) and the Task Manager project
```

## Grading Summary

| Deliverable | Weight |
|-------------|--------|
| Assignments 1–3 | 40% |
| Task Manager project | 60% (see project rubric) |