# Project: E-commerce Backend with Prisma ORM 8

## Objective

Build a **typed e-commerce REST API** on top of PostgreSQL using **Prisma ORM 8** for modeling, migrations, and queries. It ties together Week 8 (auth/RBAC), Week 9 (SQL/transactions) and Week 10 (ORM/migrations): products, categories, orders, and users.

> **ORM 8, not ORM 7.** No `@prisma/client`, no `new PrismaClient()`, no `prisma migrate dev`. You query through `db.orm.public.Model`, migrate with `migration plan` + `db migrate`, and open transactions with `db.transaction(async tx => ...)`.

---

## Domain Sketch

```text
User     1:N  Order          (a user places many orders)
Order    1:N  OrderItem      (an order has many line items)
Product  1:N  OrderItem      (a product appears in many order lines)
Category 1:N  Product        (a product belongs to a category)
Category 1:N  Category       (sub-categories via self-relation parentId)
Product  N:M  Tag            (explicit join model ProductTag)
```

Key rule: an **order is immutable in its lines** once placed — prices are captured in `OrderItem.unitPriceCents` at purchase time (never re-read from `Product` later).

---

## Required Models

```prisma
// use prisma-8

enum Role        { CUSTOMER ADMIN }
enum OrderStatus { PENDING PAID SHIPPED CANCELLED }
```
```prisma
model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  name         String
  passwordHash String   @map("password_hash")
  role         Role     @default(CUSTOMER)
  createdAt    DateTime @default(now())        @map("created_at")
  updatedAt    temporal.updatedAt()            @map("updated_at")
  orders       Order[]
  @@map("users")
}

model Category {
  id       Int        @id @default(autoincrement())
  name     String     @unique
  slug     String     @unique
  parentId Int?       @map("parent_id")
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id], onDelete: SetNull)
  children Category[] @relation("CategoryTree")
  products Product[]
  @@map("categories")
}

model Product {
  id          Int      @id @default(autoincrement())
  name        String
  slug        String   @unique
  description String?
  priceCents  Int      @map("price_cents")     // money as integer cents
  stock       Int      @default(0)
  categoryId  Int      @map("category_id")
  category    Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   temporal.updatedAt()     @map("updated_at")
  orderItems  OrderItem[]
  tags        Tag[]
  productTags ProductTag[]
  @@index([categoryId])
  @@index([name])
  @@map("products")
}

model Order {
  id         Int         @id @default(autoincrement())
  userId     Int         @map("user_id")
  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  status     OrderStatus @default(PENDING)
  totalCents Int         @map("total_cents")   // captured at placement
  createdAt  DateTime    @default(now()) @map("created_at")
  updatedAt  temporal.updatedAt()     @map("updated_at")
  items      OrderItem[]
  @@index([userId, status])
  @@map("orders")
}

model OrderItem {
  id             Int     @id @default(autoincrement())
  orderId        Int     @map("order_id")
  order          Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId      Int     @map("product_id")
  product        Product @relation(fields: [productId], references: [id], onDelete: Restrict)
  quantity       Int
  unitPriceCents Int     @map("unit_price_cents")  // price AT purchase time
  @@unique([orderId, productId])                   // one line per product per order
  @@index([productId])
  @@map("order_items")
}

model Tag {
  id           Int          @id @default(autoincrement())
  label        String       @unique
  products     Product[]
  productTags  ProductTag[]
  @@map("tags")
}

model ProductTag {
  productId Int
  tagId     Int
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@id([productId, tagId])
  @@map("product_tags")
}
```

### Why these choices

| Choice | Reason |
|--------|--------|
| `priceCents Int` | Never use `Float` for money — rounding errors. Integer cents. |
| `unitPriceCents` snapshot | Order history must not change when a product price changes |
| `onDelete: Restrict` on Product/Category | Don't delete a product that's in orders |
| `@@unique([orderId, productId])` | Prevent duplicate lines for the same product |
| self-relation on Category | Sub-categories without a separate table |
| explicit `ProductTag` N:M | ORM 8 removed implicit many-to-many |
| `temporal.updatedAt()` | ORM 8's auto-updating timestamp (not `@updatedAt`) |
| `@@index` on FKs + search columns | Fast lookups/filters |

> ORM 8 note: a plain `enum` compiles to a **text** column with `@@type("pg/text@1")`. If you want a real PostgreSQL `ENUM` type, declare `native_enum`. This project uses text-backed enums.

---

## Endpoints

### Public

```text
GET    /api/products                 list (filter by category, price, search, paginate)
GET    /api/products/:slug           single product
GET    /api/categories               list (optionally with product counts)
GET    /api/categories/:slug/products
```

### Auth

```text
POST   /auth/register                → 201 (bcrypt, role CUSTOMER)
POST   /auth/login                   → 200 { accessToken, user }
GET    /auth/me                      → 200 current user
```

### Customer (requireAuth)

```text
POST   /api/orders                   create order from items (transaction!)
GET    /api/orders                   current user's orders (paginated)
GET    /api/orders/:id               own order or 403/404
POST   /api/orders/:id/cancel        only if PENDING (restock in transaction)
```

### Admin (requireAuth + requireRole("ADMIN"))

```text
POST   /api/products                 create product
PATCH  /api/products/:id             update product
DELETE /api/products/:id             soft-delete (active = false) preferred
POST   /api/categories               create category
PATCH  /api/orders/:id/status        change order status
```

---

## The Critical Transaction: Placing an Order

This is the heart of the project. Stock checks, decrements, price capture, and order insert must be **atomic**. ORM 8 has one transaction form: `db.transaction(async (tx) => ...)`, and you **must use `tx`** for every query inside. There is no `isolationLevel` option and **no `increment`/`decrement`** — read-modify-write instead.

```ts
// src/services/orderService.ts
import { db } from "../db/prisma.js";
import { HttpError } from "../middleware/error.js";

export interface OrderInputItem {
  productId: number;
  quantity: number;
}

export async function placeOrder(userId: number, items: OrderInputItem[]) {
  if (items.length === 0) throw new HttpError(422, "order must contain at least one item");

  return db.transaction(async (tx) => {
    // 1. load the products in one query
    const ids = items.map((i) => i.productId);
    const products = await tx.orm.public.Product
      .where((p) => p.id.in(ids).and(p.active.eq(true)))
      .all();
    const byId = new Map(products.map((p) => [p.id, p]));

    // 2. validate stock and compute the total from CURRENT prices
    let totalCents = 0;
    for (const item of items) {
      const product = byId.get(item.productId);
      if (!product) throw new HttpError(404, `product ${item.productId} not found`);
      if (product.stock < item.quantity) {
        throw new HttpError(409, `insufficient stock for ${product.name}`);
      }
      totalCents += product.priceCents * item.quantity;
    }

    // 3. create the order with nested items (same transaction)
    const order = await tx.orm.public.Order.create({
      userId,
      status: "PENDING",
      totalCents,
      items: (orderItems) =>
        orderItems.create(
          items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPriceCents: byId.get(item.productId)!.priceCents,
          })),
        ),
    });

    // 4. decrement stock (no `decrement` operator — write the new value)
    for (const item of items) {
      const current = byId.get(item.productId)!;
      await tx.orm.public.Product
        .where({ id: item.productId })
        .update({ stock: current.stock - item.quantity });
    }

    return tx.orm.public.Order.where({ id: order.id }).include("items").all().firstOrThrow();
  });
}
```

> Under load PostgreSQL may abort one of two concurrent transactions with `sqlState` `40001` (serialization). Prisma does **not** retry — wrap `placeOrder` in the retry helper from Day 3, or accept the conflict and return `409`. Document your choice.
>
> To force serializable isolation (there is no option), run it as the first statement inside the callback:
> ```ts
> await tx.execute(db.raw.sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`.affectedCount().build());
> ```

### Cancel order (restock) — also transactional

```ts
export async function cancelOrder(userId: number, orderId: number) {
  return db.transaction(async (tx) => {
    const order = await tx.orm.public.Order
      .where({ id: orderId })
      .include("items")
      .all()
      .firstOrThrow()
      .catch(() => { throw new HttpError(404, "order not found"); });

    if (order.userId !== userId) throw new HttpError(403, "forbidden");
    if (order.status !== "PENDING") throw new HttpError(409, "only pending orders can be cancelled");

    await tx.orm.public.Order.where({ id: orderId }).update({ status: "CANCELLED" });

    for (const item of order.items) {
      const product = await tx.orm.public.Product.where({ id: item.productId }).all().firstOrThrow();
      await tx.orm.public.Product
        .where({ id: item.productId })
        .update({ stock: product.stock + item.quantity });
    }

    return { id: orderId, status: "CANCELLED" as const };
  });
}
```

---

## Product Listing (filtering + pagination + counts)

```ts
// src/services/productService.ts
import { db } from "../db/prisma.js";

export async function listProducts(params: {
  categorySlug?: string;
  q?: string;
  minCents?: number;
  maxCents?: number;
  page: number;
  limit: number;
}) {
  const items = await db.orm.public.Product
    .where((p) => {
      let f = p.active.eq(true);
      if (params.categorySlug) f = f.and(p.category.slug.eq(params.categorySlug!));
      if (params.q) f = f.and(p.name.ilike(`%${params.q}%`));
      if (params.minCents !== undefined) f = f.and(p.priceCents.gte(params.minCents));
      if (params.maxCents !== undefined) f = f.and(p.priceCents.lte(params.maxCents));
      return f;
    })
    .include("category", (c) => c.select("name", "slug"))
    .orderBy((p) => p.createdAt.desc())
    .limit(params.limit)
    .offset((params.page - 1) * params.limit)
    .all();

  const { total } = await db.orm.public.Product
    .where({ active: true })
    .aggregate((a) => ({ total: a.count() }));

  return { items, total, page: params.page, limit: params.limit };
}
```

> `.ilike("%...%")` replaces ORM 7's `contains` + `mode: "insensitive"`. `count()` lives on `aggregate()`, not a top-level `count()`.

---

## Project Structure

```
ecommerce-api/
├── prisma.config.ts
├── src/
│   ├── server.ts
│   ├── app.ts
│   ├── config.ts
│   ├── prisma/
│   │   ├── contract.prisma         # the schema ("// use prisma-8")
│   │   ├── contract.json           # generated — commit
│   │   ├── contract.d.ts           # generated — commit
│   │   ├── db.ts                   # the db client singleton
│   │   └── seed.ts                 # run with `npx tsx src/prisma/seed.ts`
│   ├── middleware/                 # auth, role, validate, error (from Week 8)
│   ├── helpers/                    # responses, jwt
│   ├── validators/                 # zod schemas
│   ├── repositories/               # orm data access
│   ├── services/                   # orderService (transactions), productService
│   ├── controllers/
│   └── routes/
├── migrations/                     # generated by `migration plan` — commit
├── .env / .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Seeding

```ts
// src/prisma/seed.ts (outline — make it idempotent with upsert)
// 1 admin + 2 customers (bcrypt hashes)
// 5 categories (one with a sub-category)
// 15 products across categories with stock + priceCents
// 5 tags, some linked to products via ProductTag
```

```bash
# ORM 8 has no `db seed` and no `migrate reset`.
# To start clean: drop + recreate the database, then:
npx prisma db init
npx tsx src/prisma/seed.ts
```

> Prisma Studio is **not** part of the ORM 8 CLI. To inspect visually, run the ORM 7 tool against the same database in a separate terminal: `npx prisma@7 studio`.

---

## Testing Script

```bash
npm run dev
npx prisma@7 studio &      # optional visual proof (separate ORM 7 tool)

# browse products (public) with filters + pagination
curl -s "http://localhost:3000/api/products?category=coffee&q=ethiopia&min=1000&max=5000&page=1&limit=10"

# register + login
curl -i -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@x.com","password":"supersecret1"}'
TOKEN="<from login>"

# place an order (transaction + stock decrement)
curl -i -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"items":[{"productId":1,"quantity":2},{"productId":3,"quantity":1}]}'

# verify stock dropped in psql
psql -U ecommerce_app -d ecommerce_dev -c "SELECT id,name,stock FROM products WHERE id IN (1,3);"

# oversell is impossible → 409
curl -i -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"items":[{"productId":1,"quantity":99999}]}'

# access control
curl -si -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"x","slug":"x","priceCents":100,"categoryId":1}'   # 403 (not admin)

# typecheck
npm run typecheck
```

---

## Deliverables

1. `src/prisma/contract.prisma` + generated `contract.json`/`contract.d.ts` + committed `migrations/**` + `src/prisma/seed.ts`
2. Full `src/` (repositories/services/controllers/routes/middleware)
3. `.env.example` + README with setup, migrate, seed, run commands
4. curl transcript covering: browse/filter/paginate, register/login, place order, cancel order, 401/403/404/409/422
5. Proof stock decrements atomically and overselling returns 409
6. `npx tsc --noEmit` output (zero errors, no `any`)

---

## Stretch Goals

```text
1. Product N:M Tag filters via .where(p => p.tags.some(t => t.label.in([...])))   (explicit join)
2. Reviews: Product 1:N Review with rating; average via aggregate(avg) or include refinement
3. Search with full-text (to_tsvector) via db.raw.sql + GIN index
4. Soft delete everywhere (deletedAt) + restore endpoint
5. Order status state machine with allowed transitions enforced in a service
6. Cursor pagination on orders (orderBy id) instead of offset
7. Retry wrapper around placeOrder for sqlState 40001/40P01
8. Cart persisted server-side (Cart, CartItem) before order placement
```

---

## Grading Rubric

| Criteria | Points |
|----------|--------|
| Schema: correct relations, constraints, money-as-cents, indexes, ORM 8 syntax | 20% |
| Order transaction: atomic stock check/decrement + price snapshot, uses `tx` | 20% |
| Filtering, pagination, aggregates on products/orders | 15% |
| Auth + RBAC (customer vs admin) enforced on routes | 15% |
| Migrations committed (`migration plan` + `db migrate`) + idempotent seed | 10% |
| Error handling (409 oversell, 404, 403, 422) + response contract | 10% |
| **Typed end-to-end: `strict`, zero `any`, `tsc --noEmit` clean** | 10% |
