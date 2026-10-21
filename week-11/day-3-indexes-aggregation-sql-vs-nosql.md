# Day 3 (Hands-on) — Indexes, Aggregation & SQL vs NoSQL

**Previous:** [Day 2 — Mongoose Schemas, Validation, Hooks & Population](day-2-mongoose-schemas-validation-hooks-population.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Create single-field, compound, unique, and text indexes for known access patterns
- Explain index prefixes, selectivity, and the write/storage cost of indexes
- Inspect a query plan with `explain("executionStats")`
- Read and compose an aggregation pipeline
- Group order totals by month and rank products by sales
- Recommend SQL or NoSQL for a workload and justify tradeoffs

---

## 1. Indexes

Without an appropriate index, MongoDB may scan every document in a collection. Indexes speed up matching and sorting, at a cost: they consume storage and every write may need to update them.

```js
const posts = db.collection("posts");

// One field: support lookup by author and newest posts first.
await posts.createIndex({ authorId: 1, createdAt: -1 });

// Enforce unique email addresses.
await db.collection("users").createIndex({ email: 1 }, { unique: true });
```

For a compound index, field order matters. `{ authorId: 1, createdAt: -1 }` can support filters on `authorId` and the matching sort by `createdAt`; it generally cannot efficiently support a query using only `createdAt` without the leading `authorId`. Design indexes from observed query filters and sort order.

Inspect the winning plan and execution statistics:

```js
const plan = await posts
  .find({ authorId })
  .sort({ createdAt: -1 })
  .limit(20)
  .explain("executionStats");

console.log({
  stage: plan.queryPlanner.winningPlan,
  examined: plan.executionStats.totalDocsExamined,
  returned: plan.executionStats.nReturned,
});
```

Look for collection scans (`COLLSCAN`) on important high-volume queries and compare documents examined with documents returned. A scan is not automatically a bug for a small collection or a query returning most documents.

Other index types include text, geospatial, TTL, and wildcard indexes. Use each only for a specific requirement; a text index is not a general replacement for a dedicated search service.

---

## 2. Aggregation Pipeline Basics

An aggregation pipeline passes documents through an ordered sequence of stages. Each stage transforms or filters the documents for the next stage:

```text
collection → $match → $group → $sort → $limit → results
```

Common stages:

| Stage | Purpose |
|-------|---------|
| `$match` | Filter documents; place early to reduce pipeline input |
| `$project` | Select, rename, or calculate fields |
| `$unwind` | Emit one document per array element |
| `$group` | Group by a key and calculate sums/counts/etc. |
| `$sort` | Sort pipeline output |
| `$limit` | Limit output |
| `$lookup` | Join documents from another collection |
| `$set` | Add or compute fields |

---

## 3. Orders per Month

Assume each order has `createdAt` (a BSON date), `status`, and `totalCents`. This pipeline groups paid orders by calendar month in UTC:

```js
const ordersPerMonth = await db.collection("orders").aggregate([
  { $match: { status: "paid" } },
  {
    $group: {
      _id: {
        year: { $year: { date: "$createdAt", timezone: "UTC" } },
        month: { $month: { date: "$createdAt", timezone: "UTC" } },
      },
      orderCount: { $sum: 1 },
      revenueCents: { $sum: "$totalCents" },
    },
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } },
]).toArray();
```

An explicit timezone avoids grouping a late-night order into a different month depending on server configuration. Confirm that date fields are stored as BSON dates, not formatted strings.

---

## 4. Top-Selling Products

If order lines are embedded as `items: [{ productId, quantity, unitPriceCents }]`, unwind the array and group by product:

```js
const topProducts = await db.collection("orders").aggregate([
  { $match: { status: "paid" } },
  { $unwind: "$items" },
  {
    $group: {
      _id: "$items.productId",
      unitsSold: { $sum: "$items.quantity" },
      revenueCents: {
        $sum: { $multiply: ["$items.quantity", "$items.unitPriceCents"] },
      },
    },
  },
  { $sort: { unitsSold: -1, _id: 1 } },
  { $limit: 10 },
  {
    $lookup: {
      from: "products",
      localField: "_id",
      foreignField: "_id",
      as: "product",
    },
  },
  { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 0,
      productId: "$_id",
      name: "$product.name",
      unitsSold: 1,
      revenueCents: 1,
    },
  },
]).toArray();
```

Keep the captured `unitPriceCents` on each order line. Historical revenue should not change when a product's current price is updated. In production, match the time window and statuses needed by the report before unwinding.

---

## 5. SQL vs NoSQL Decision-Making

Do not choose a database by fashion or by claiming one is universally faster. Compare the actual workload:

| Question | Relational SQL often fits when... | MongoDB often fits when... |
|----------|-----------------------------------|-----------------------------|
| Shape | Data is strongly structured and relational | Documents naturally group around aggregate roots |
| Relationships | Many joins and cross-entity constraints are central | Most reads load a bounded document or a few references |
| Consistency | Multi-row constraints and transactions are core | Single-document atomicity covers common updates |
| Query patterns | Ad hoc joins and reporting across entities are common | Known access patterns benefit from embedded or document-shaped data |
| Evolution | A normalized, explicit schema is valuable | Different records need controlled variation or nested structures |
| Operations | Team already has strong SQL skills and infrastructure | Team needs MongoDB features and can operate it reliably |

Both systems support transactions and indexes. MongoDB still needs data modeling, consistency decisions, and schema evolution; SQL databases can also store JSON. Choose based on constraints, query patterns, scale requirements, team experience, and operational cost.

---

## Hands-on Checklist

1. Add a compound index that supports a real filter-and-sort query.
2. Capture `explain("executionStats")` before and after index creation; record the plan and documents examined.
3. Run the monthly order aggregation against sample data spanning at least two months.
4. Run the top-products aggregation and check the calculated revenue against hand-computed values.
5. Write a short recommendation for one workload: SQL or MongoDB, with two reasons and one tradeoff.

## Check Your Understanding

1. Why can a compound index be ineffective when its first field is not part of the query?
2. Why should `$match` usually appear early in a pipeline?
3. Why does an order line store the purchase-time unit price?
4. What workload detail would make you prefer normalized SQL tables over embedded documents?
