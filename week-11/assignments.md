# Week 11 — Assignments: NoSQL & MongoDB

> Use Node.js with JavaScript or TypeScript. Keep database access in a repository/service layer, validate untrusted API input, and never commit connection strings or credentials. Include sample setup instructions and a `.env.example`.

---

## Assignment 1: CRUD App with the Native MongoDB Driver

**Objective:** Build a small REST API for a collection of notes or posts using the official `mongodb` Node.js driver (not Mongoose).

### Required behavior

Implement:

```text
POST   /api/posts          create a post
GET    /api/posts          list posts with bounded pagination
GET    /api/posts/:id      fetch one post
PATCH  /api/posts/:id      update allowed fields only
DELETE /api/posts/:id      delete one post
```

Each document must include an `_id`, title, body, created/updated timestamps, and a published flag. Add filtering by published status and sorting by creation time.

### Requirements

- Reuse one `MongoClient` and close it on graceful application shutdown.
- Validate request fields and ObjectId route parameters; return clear 4xx responses for invalid input and missing records.
- Use `$set` / update operators rather than replacing the complete document for a partial update.
- Bound page size and use a stable sort (include `_id` as a tie-breaker).
- Do not expose database exceptions or stack traces in API responses.
- Include a README section with setup, environment variables, and example requests.

### Grading

| Criteria | Points |
|----------|--------|
| Correct CRUD and persistence behavior | 35% |
| Connection lifecycle and repository separation | 20% |
| Input validation, ObjectId handling, and error responses | 25% |
| Pagination, sorting, and documentation | 20% |

---

## Assignment 2: Mongoose Schema Design with Relations and `populate()`

**Objective:** Model users, posts, and comments with Mongoose and implement useful populated reads.

### Required models

```text
User    1:N  Post       (author reference)
Post    1:N  Comment    (post reference)
User    1:N  Comment    (comment author reference)
```

### Requirements

- User: display name, unique normalized email, password hash (never plaintext), timestamps.
- Post: required trimmed title and body, `draft`/`published` status, author ObjectId reference, timestamps.
- Comment: required body, post and author ObjectId references, timestamps.
- Add required/length/enum validation and one custom validator of your choice.
- Implement a post-detail query that populates the author's display name and comments with each comment author's display name. Select only fields needed for the response.
- Demonstrate a `pre("validate")` or `pre("save")` document hook and explain exactly when it runs.
- Show that update validators must be enabled for the update operation you use.
- Handle duplicate email errors separately from schema validation errors.

### Deliverables

- Schemas/models and a small service or route demonstrating create and populated read
- Seed data with at least two users, two posts, and three comments
- A short design note explaining why comments are referenced rather than stored in an unbounded post array

### Grading

| Criteria | Points |
|----------|--------|
| Correct schemas, relations, and validation | 35% |
| Correct populate behavior and narrow projections | 25% |
| Middleware and update-validator explanation | 20% |
| Error handling and design note | 20% |

---

## Assignment 3: Aggregation Pipeline Report

**Objective:** Use a MongoDB aggregation pipeline to produce monthly order totals and a top-products report.

### Sample data shape

```js
{
  status: "paid",
  createdAt: new Date("2026-09-15T12:00:00Z"),
  items: [
    { productId: ObjectId("..."), quantity: 2, unitPriceCents: 1250 }
  ]
}
```

### Required reports

1. Paid orders grouped by UTC year/month, with order count and revenue in cents.
2. Top 10 products by units sold, including units sold and revenue in cents.
3. For the top-products report, join product names with `$lookup` and handle deleted/missing product records.

### Requirements

- Use `$match`, `$group`, and `$sort`; use `$unwind` and `$lookup` where appropriate.
- Preserve purchase-time prices in the report calculation.
- Include sample data across at least three months and multiple products.
- Verify at least two output rows manually with arithmetic in the README or a test.
- Submit the pipeline code and example output; do not hard-code report results.

### Grading

| Criteria | Points |
|----------|--------|
| Correct monthly grouping, timezone, counts, and totals | 35% |
| Correct top-product units and revenue calculations | 35% |
| Missing-product handling and reproducible sample data | 15% |
| Manual verification and explanation | 15% |

## Overall Assignment Weight

| Assignment | Weight |
|------------|--------|
| 1. Native-driver CRUD app | 35% |
| 2. Mongoose schema design | 30% |
| 3. Aggregation report | 35% |
