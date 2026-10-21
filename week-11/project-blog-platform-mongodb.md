# Project — Blog Platform Backend with MongoDB

## Objective

Build a MongoDB-backed REST API for a blog platform with users, posts, and comments. Apply Week 8 API/authentication practices alongside this week's MongoDB document modeling, Mongoose schemas, references, population, validation, and indexes.

Use Mongoose for the project unless your instructor approves a native-driver implementation. Assignment 1 already practices the native driver directly.

## Domain Model

```text
User    1:N  Post       (author reference)
Post    1:N  Comment    (post reference)
User    1:N  Comment    (comment-author reference)
```

Recommended collections:

- `users`: display name, normalized unique email, password hash, role, timestamps
- `posts`: title, slug, body, status, author ObjectId, timestamps, optional `publishedAt`
- `comments`: body, post ObjectId, author ObjectId, timestamps

Comments are separate documents so they can be paginated and do not grow a post document without bound. Populate only the author fields needed by a response; do not populate password hashes or return them in API output.

## API Scope

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/posts                         list published posts
GET    /api/posts/:id                     post detail with author and paged comments
POST   /api/posts                         create a draft (authenticated)
PATCH  /api/posts/:id                     edit an owned post (authenticated)
DELETE /api/posts/:id                     delete an owned post (authenticated)
POST   /api/posts/:id/comments             add a comment (authenticated)
DELETE /api/comments/:id                  delete own comment or moderator-authorized
```

Add pagination and an allowlisted sort option for post and comment lists. Only an author or authorized admin may edit/delete a post. Only an authenticated user may comment. Use the existing course authentication pattern; hash passwords, verify credentials safely, and never return hashes.

## Data and Index Design

- Unique index on normalized user email.
- Unique index on post slug.
- Compound index on `{ status: 1, createdAt: -1 }` for published-post listings.
- Compound index on `{ post: 1, createdAt: -1 }` for comment pagination.
- Add other indexes only when a specific query justifies them.
- Keep Mongoose schema validation and HTTP request validation in place; they protect different boundaries.

## Required Features

1. Registration and login integrated with the course's authentication approach.
2. Draft creation, publishing, editing, and deletion with ownership checks.
3. Published post listing with bounded pagination and stable ordering.
4. Post details with a selected author projection and paginated comments.
5. Comment creation and deletion with authorization.
6. Consistent error responses for invalid ids, validation errors, duplicate keys, missing resources, and unauthorized actions.
7. Seed script and sample `.env.example`.
8. README documenting setup, routes, model decisions, indexes, and test/demo steps.

## Technical Requirements

- Separate routes/controllers, services, and persistence/models.
- Use one shared Mongoose connection and handle startup/shutdown failures.
- Validate id formats, request payloads, page limits, and allowed sort fields.
- Do not trust client-provided owner ids or status transitions without authorization.
- Populate only required fields and paginate comments rather than loading an unlimited list.
- Add tests for authorization and the main persistence flows. Use an isolated test database; never run tests against production data.
- Keep secrets and real database URIs out of version control.

## Milestones

```text
1. Define schemas, indexes, validation, and seed data
2. Implement auth and ownership rules
3. Implement post and comment endpoints
4. Add pagination, populate projections, and consistent error mapping
5. Test the end-to-end workflows and document model decisions
```

## Acceptance Checklist

- [ ] A new user can register and log in without exposing a password hash.
- [ ] An author can create a draft, publish it, and edit their own post.
- [ ] A different user cannot edit or delete that post.
- [ ] Public readers see published posts only.
- [ ] Post detail returns the selected author fields and paginated comments.
- [ ] Invalid ids and invalid payloads return client errors, not server stack traces.
- [ ] Duplicate email and slug errors are handled explicitly.
- [ ] Relevant indexes exist and are documented with the queries they support.
- [ ] `.env.example`, seed instructions, and API examples are included.

## Grading

| Criteria | Weight |
|----------|--------|
| Schema design, references, validation, and indexes | 25% |
| API behavior, authentication, and authorization | 30% |
| Population, projections, and bounded pagination | 15% |
| Error handling and tests | 20% |
| Documentation and setup reproducibility | 10% |
