# Week 6: TypeScript — Beginner to Advanced

## Overview

Add static types to JavaScript for safer, more maintainable code. From primitives and interfaces through generics, utility types, and typed error handling — ending in a fully typed CLI project that must compile under `strict: true` with zero `any`.

---

## Day 1 (Theory): TypeScript Introduction
- Why TypeScript exists — static typing catches bugs before runtime
- Setup: `npm i -D typescript`, `tsc`, `tsconfig.json`
- Primitives: `string`, `number`, `boolean`, `symbol`, `bigint`
- Type inference — explicit at boundaries, inferred locally
- Arrays & tuples, `readonly`, enums
- Special types: `any` (avoid), `unknown`, `void`, `never`
- Strict mode and the key `tsconfig` flags

## Day 2 (Theory): Interfaces, Unions & Generics
- `interface` vs `type` — when to use each
- Optional / readonly properties, index signatures
- Unions, discriminated unions + `never` exhaustiveness
- Narrowing (`typeof`, `in`, `instanceof`, `kind`)
- Function types, callbacks, overloads
- **Generics**: reusable typed functions, `extends` constraints, generic interfaces

## Day 3 (Theory): Classes, Advanced Types & Tooling
- Typed classes, access modifiers (`public`/`protected`/`private`), parameter properties
- `interface` contracts, `abstract` classes
- `as`, `as const`, `satisfies`
- Utility types: `Partial`, `Pick`, `Omit`, `Record`, `Extract`, `ReturnType`
- Mapped types, template literals, branded types
- Typed async errors: `Result<T, E>` pattern
- Node + TS tooling: `tsc` build, `tsx`, source maps, `--inspect`, ESM vs CommonJS

---

## Assignments

1. **Typed Data Models & Utility Types** — model real entities, derive types with `Pick`/`Omit`/`Record`, write a type guard, count by union field
2. **Generic Type Utilities** — rebuild `Partial`, `Pick`, `Omit`, `Record` from scratch (plus `Head`/`DeepReadonly` stretch)
3. **Typed Error Handling** — implement a `Result<T, E>` union, wrap async calls, compose a multi-step workflow that short-circuits on error

All three must compile with `npm run typecheck` passing and **no `any`**.

---

## Project: Typed E-Commerce Inventory & Orders System

A fully typed store CLI managing products, stock, and orders:

- **Classes + generics:** a reusable `DataStore<T>` repository
- **Discriminated unions:** domain errors (`not_found`, `insufficient_stock`, ...)
- **Result pattern:** every service returns `Result<T, E>` — no thrown errors across boundaries
- **Business rules:** stock deduction, order totals, low-stock + top-sellers reports
- **Docs requirement:** `types.md` documenting 3+ real type errors hit and fixed

**Key grade check:** compiles under `strict: true`, zero `any`, full CLI session transcript.

---

## Skills Acquired

- Safe config-driven TS projects (`tsconfig.json`, strict mode)
- Modeling data with interfaces, unions, and generics
- Leveraging utility types and mapped types
- Typed error handling instead of `try/catch` soup
- Running & debugging `.ts` in Node (`tsx`, `tsc`, source maps, inspector)
- Reading and fixing real compiler errors