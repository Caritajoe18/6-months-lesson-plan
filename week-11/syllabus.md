# Week 11 — NoSQL & MongoDB

## Overview

Week 9 introduced relational data and SQL; Week 10 added an ORM over PostgreSQL. This week compares those approaches with MongoDB's document model and builds a Node.js data layer with both the **native MongoDB driver** and **Mongoose**. You will finish by designing and querying a MongoDB-backed blog API.

MongoDB is not "schema-free": documents in a collection can vary, but applications still need deliberate validation, indexes, and data ownership rules. Choose embedding or references to match access patterns and consistency requirements.

## Prerequisites

- Week 7–8: Node.js, async/await, Express, REST APIs, validation, and error handling
- Week 9: relational tables, primary/foreign keys, joins, indexes, and aggregation
- Week 10: schema modeling and data-access layers
- Node.js, npm, and a MongoDB deployment (local MongoDB or MongoDB Atlas)

## Files

| File | Topic | Type |
|------|-------|------|
| [Day 1](day-1-document-model-native-driver-crud.md) | Document model, MongoDB, native driver, CRUD | Theory + code |
| [Day 2](day-2-mongoose-schemas-validation-hooks-population.md) | Schemas, validation, middleware/hooks, population | Theory + code |
| [Day 3](day-3-indexes-aggregation-sql-vs-nosql.md) | Indexes, aggregation pipeline, SQL vs NoSQL decisions | Hands-on |
| [Assignments](assignments.md) | 3 practice assignments | Practice |
| [Project](project-blog-platform-mongodb.md) | Blog platform backend with users, posts, and comments | Capstone |

## Tools & Packages

Use a supported Node.js LTS release. The native driver and Mongoose are separate libraries; install the one used by each exercise:

```bash
npm install mongodb mongoose dotenv
npm install --save-dev typescript tsx @types/node
```

Keep the connection string in `.env` and out of source control:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DATABASE=week11_blog
```

For Atlas, use the connection string supplied by your own cluster and restrict network access and database-user permissions to the minimum needed.

## Learning Outcomes

By the end of the week, you should be able to:

- Explain documents, collections, BSON, `_id`, and flexible document structure
- Choose when to embed related data and when to reference another collection
- Connect and close a `MongoClient` cleanly, and implement native-driver CRUD
- Define Mongoose schemas and models with required fields, enums, defaults, and validators
- Explain document and query middleware, and use `populate()` for referenced records
- Create indexes based on query patterns and inspect query plans
- Build an aggregation pipeline to group monthly orders and rank top-selling products
- Compare SQL and NoSQL using relationships, query patterns, consistency, and operational needs
- Keep database access in a repository/service layer and validate API input independently of database validation

## Suggested Rhythm

```text
Mon Day 1 — document model, embedding/referencing, native-driver CRUD
Tue Day 2 — Mongoose schemas, validation, hooks, population
Wed Day 3 — indexes, aggregation pipeline, SQL vs NoSQL decisions
Thu–Fri   — assignments 1–3 + Blog Platform project
```

## Grading

| Deliverable | Weight |
|-------------|--------|
| Assignments (3) | 40% |
| Project: Blog platform backend | 60% |

## Ground Rules

- Treat MongoDB's flexible documents as a modeling choice, not a reason to skip validation.
- Never build a query by concatenating untrusted input. Validate and allowlist fields, operators, sort keys, and pagination limits.
- Use `ObjectId` values for document identity; do not assume they are ordinary strings in driver code.
- Index actual query patterns. Indexes use storage and slow writes, so do not index every field by default.
- Store secrets in `.env`; commit a `.env.example` with placeholder values, never real credentials.
- Do not return password hashes or private fields from API responses.
- Use transactions only when a multi-document operation truly needs atomicity and the deployment supports them; prefer data models that keep atomic updates within one document where appropriate.
- Pin compatible package versions for submitted projects and read the official documentation for the installed major version.

## Sources

- [MongoDB manual](https://www.mongodb.com/docs/manual/)
- [MongoDB Node.js driver](https://www.mongodb.com/docs/drivers/node/current/)
- [Mongoose guide](https://mongoosejs.com/docs/guide.html)
- [Mongoose validation](https://mongoosejs.com/docs/validation.html)
- [Mongoose middleware](https://mongoosejs.com/docs/middleware.html)
- [Mongoose populate](https://mongoosejs.com/docs/populate.html)
- [MongoDB aggregation pipeline](https://www.mongodb.com/docs/manual/core/aggregation-pipeline/)
- [MongoDB indexes](https://www.mongodb.com/docs/manual/indexes/)
