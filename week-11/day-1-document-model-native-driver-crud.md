# Day 1 — Document Model, MongoDB & Native-Driver CRUD

**Next:** [Day 2 — Mongoose Schemas, Validation, Hooks & Population](day-2-mongoose-schemas-validation-hooks-population.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Describe the document model and how a document differs from a relational row
- Decide whether related data should be embedded or referenced
- Connect to MongoDB with `MongoClient` and select a database and collection
- Implement create, read, update, and delete operations with the native driver
- Use `ObjectId`, filters, projections, and result counts correctly
- Keep connection lifecycle and persistence logic out of route handlers

---

## 1. Documents, Collections & BSON

MongoDB stores BSON documents in collections. A document is a set of fields that can include nested objects and arrays:

```json
{
  "_id": "ObjectId(...)",
  "title": "Choosing a database",
  "authorId": "ObjectId(...)",
  "tags": ["mongodb", "databases"],
  "published": true,
  "createdAt": "2026-10-21T12:00:00.000Z"
}
```

The `_id` field uniquely identifies the document. MongoDB adds an `ObjectId` when one is not supplied. BSON supports values such as dates and ObjectIds in addition to JSON's basic values.

| Relational term | MongoDB term |
|-----------------|--------------|
| Database | Database |
| Table | Collection |
| Row | Document |
| Column | Field |
| Primary key | `_id` |
| Join | Reference lookup, `$lookup`, or application-level query |

Collections may contain documents with different fields, but an application's data still needs a consistent shape. MongoDB schema validation and application-level validation can enforce that shape.

---

## 2. Embed or Reference?

Choose a model based on how the application reads and updates its data:

**Embed** when child data is small, bounded, usually read with its parent, and belongs to that parent:

```js
{
  title: "MongoDB notes",
  comments: [
    { body: "Helpful!", createdAt: ISODate("2026-10-21T12:00:00Z") }
  ]
}
```

**Reference** when related data is large, independently queried or updated, shared by many parents, or can grow without a safe bound:

```js
// posts
{ _id: ObjectId("..."), title: "MongoDB notes", authorId: ObjectId("...") }

// users
{ _id: ObjectId("..."), displayName: "Sam" }
```

Embedding can make common reads simple and lets a single-document update be atomic. References avoid duplication and unbounded documents, but require additional queries or an aggregation `$lookup`. MongoDB has a maximum BSON document size, so do not keep appending unbounded comments to a post.

---

## 3. Connect with the Native Driver

Install `mongodb` and `dotenv`, then create a reusable connection module:

```js
// src/db.js
import "dotenv/config";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is required");
}

export const client = new MongoClient(uri);

export async function connectToDatabase() {
  await client.connect();
  return client.db(process.env.MONGODB_DATABASE ?? "week11_blog");
}
```

Create the client once for the application process and reuse its connection pool; do not create and close a new client for every request. On application shutdown, call `await client.close()`. A script that owns its client should close it in a `finally` block.

Example startup:

```js
import { connectToDatabase } from "./db.js";

const db = await connectToDatabase();
const posts = db.collection("posts");
console.log(`Connected; posts collection: ${posts.collectionName}`);
```

---

## 4. CRUD with the Native Driver

The native driver returns promises. Pass data as objects and values, not as constructed query strings.

```js
import { ObjectId } from "mongodb";

const posts = db.collection("posts");

// Create
const created = await posts.insertOne({
  title: "Document modeling",
  body: "Model data around the reads and writes the application needs.",
  tags: ["mongodb"],
  published: false,
  createdAt: new Date(),
});

// Read one by its ObjectId
const post = await posts.findOne({ _id: created.insertedId });

// Read a page, projecting only the fields needed by the caller
const page = await posts
  .find({ published: true }, { projection: { title: 1, tags: 1, createdAt: 1 } })
  .sort({ createdAt: -1, _id: -1 })
  .limit(20)
  .toArray();

// Update one; $set changes selected fields without replacing the document
const updated = await posts.updateOne(
  { _id: new ObjectId(postId) },
  { $set: { title: "Document data modeling" }, $currentDate: { updatedAt: true } },
);
if (updated.matchedCount === 0) {
  throw new Error("Post not found");
}

// Delete one
const deleted = await posts.deleteOne({ _id: new ObjectId(postId) });
if (deleted.deletedCount === 0) {
  throw new Error("Post not found");
}
```

In a real API, validate that an incoming id is a valid ObjectId before constructing it; turn invalid input into a client error rather than an uncaught server error. Also distinguish `matchedCount` from `modifiedCount`: a matching update may leave the document unchanged.

### Update operators

- `$set`: assign selected fields
- `$unset`: remove selected fields
- `$inc`: increment a numeric value
- `$push` / `$addToSet`: append to an array (with / without duplicate prevention)
- `$pull`: remove matching array elements
- `$currentDate`: set a date field to the current time

Use `replaceOne()` only when intentionally replacing the complete document. It can remove fields that were not included in the replacement.

---

## 5. Repository Boundary

Routes should not own database connection logic. A small repository can provide the persistence boundary:

```js
// src/repositories/post-repository.js
export function createPostRepository(collection) {
  return {
    findPublished(limit = 20) {
      return collection
        .find({ published: true })
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit)
        .toArray();
    },

    async create(input) {
      const result = await collection.insertOne({
        ...input,
        createdAt: new Date(),
      });
      return { ...input, _id: result.insertedId, createdAt: new Date() };
    },
  };
}
```

Validate request bodies before calling the repository. The repository handles MongoDB persistence; it should not decide HTTP status codes or expose database errors directly to clients.

---

## Check Your Understanding

1. A post can have millions of comments. Would you embed them in the post? Why?
2. What can go wrong if you replace a document when you intended to update one field?
3. What does `matchedCount === 1` tell you, and how does it differ from `modifiedCount`?
4. Why should a server reuse a `MongoClient` rather than open one per request?
