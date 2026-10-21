# Day 2 — Mongoose Schemas, Validation, Hooks & Population

**Previous:** [Day 1 — Document Model, MongoDB & Native-Driver CRUD](day-1-document-model-native-driver-crud.md)
**Next:** [Day 3 — Indexes, Aggregation & SQL vs NoSQL](day-3-indexes-aggregation-sql-vs-nosql.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Explain the roles of a Mongoose schema, model, and document
- Define field types, required constraints, enums, defaults, and custom validators
- Model references between collections and populate selected related fields
- Distinguish document middleware from query middleware
- Avoid common validation and middleware surprises

---

## 1. Schema, Model & Document

- A **schema** describes the structure, casting, validation, indexes, and middleware for documents handled by Mongoose.
- A **model** is the interface used to create, query, update, and delete documents in a collection.
- A **document** is a model instance representing one record.

Mongoose provides application-level structure; it does not make every client or database write conform automatically. MongoDB can also be written to by the native driver or other services, so validate at the API boundary and consider collection-level validation for shared databases.

---

## 2. Define a Schema and Model

```js
import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: 3,
      maxlength: 160,
    },
    body: {
      type: String,
      required: true,
      minlength: 1,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export const Post = mongoose.model("Post", postSchema);
```

Mongoose pluralizes the model name for its default collection name. Configure a collection name explicitly if the application requires a particular naming convention. `timestamps: true` adds `createdAt` and `updatedAt`.

Validation runs on document `save()` and `create()`. For update operations, enable update validators explicitly:

```js
await Post.updateOne(
  { _id: postId, author: userId },
  { $set: { title: input.title } },
  { runValidators: true },
);
```

Always authorize the update as well as validate its payload; schema validation is not authorization.

---

## 3. References and Population

An ObjectId reference stores the related document's id, not a copy of that document:

```js
const userSchema = new mongoose.Schema({
  displayName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
});

export const User = mongoose.model("User", userSchema);
```

Populate a reference when the response needs selected fields from the related record:

```js
const post = await Post.findOne({ _id: postId, status: "published" })
  .select("title body author createdAt")
  .populate({ path: "author", select: "displayName" })
  .lean();
```

Population is a convenient additional query, not a relational foreign-key constraint. The referenced user may have been deleted; handle a missing populated value. Keep the projection narrow, and avoid populating a large or unbounded set in a list endpoint.

For a post's comments, a separate `Comment` model with `post` and `author` references is usually safer than an ever-growing embedded comments array. See the [blog project](project-blog-platform-mongodb.md) for a domain example.

---

## 4. Middleware / Hooks

Middleware runs before or after selected Mongoose operations. Document middleware is useful for document lifecycle behavior:

```js
postSchema.pre("validate", function () {
  if (this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});
```

Query middleware operates on a query, not a hydrated document:

```js
postSchema.pre("find", function () {
  this.where({ deletedAt: null });
});
```

Key distinctions:

- `save` hooks do not automatically run for `updateOne()` or `findOneAndUpdate()`.
- Query middleware's `this` is the query; document middleware's `this` is the document.
- Register middleware before compiling the model with `mongoose.model(...)`.
- Hooks are appropriate for local lifecycle rules, not hidden business workflows that callers must understand.
- Never use a password hook as the only protection against plaintext password storage; define one clear service boundary for hashing and never return password hashes.

Prefer explicit service functions for multi-step behavior, external side effects, or business rules that need clear error handling.

---

## 5. Validation and Error Handling

Mongoose casts values and validates schema rules, but errors need deliberate handling:

```js
try {
  const post = await Post.create({
    title: "MongoDB schemas",
    body: "A schema documents the expected application shape.",
    author: authorId,
  });
  return post;
} catch (error) {
  if (error instanceof mongoose.Error.ValidationError) {
    // Map known validation failures to a client-facing 400 response.
    throw error;
  }
  throw error;
}
```

In an Express application, translate known validation and duplicate-key errors at the service/controller boundary into appropriate client responses. Log unexpected failures and pass them to the standard error handler; do not return a success-shaped fallback.

A `unique: true` schema option creates an index; it is not a Mongoose validator. Duplicate values are reported by MongoDB as duplicate-key errors, so handle them separately from `ValidationError`.

---

## Check Your Understanding

1. Why doesn't `unique: true` guarantee a Mongoose validation error?
2. Does `pre("save")` run when the application calls `updateOne()`?
3. What does `populate()` do, and why should an API select only necessary fields?
4. When should application validation happen in addition to schema validation?
