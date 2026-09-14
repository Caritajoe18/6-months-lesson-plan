# Project: Typed E-Commerce Inventory & Orders System

## Objective

Build a fully typed inventory + ordering system in TypeScript, runnable in the terminal. This project proves the value of TypeScript: the "bugs" are primarily *type bugs*, and the compiler catches them at build time.

> The product must compile with `strict: true` and **zero** `any`. That constraint is graded.

---

## The Product

A small store backend that manages products, stock, and orders:

```text
Typed Store CLI
├── products    → catalog (add, update, list, delete)
├── stock       → track quantity in/out
├── orders      → place orders with stock deduction
└── reports     → top sellers & low-stock warnings
```

---

## Project Structure

```
typed-store/
├── src/
│   ├── models.ts        # interfaces: Product, StockEntry, Order, ...
│   ├── state.ts         # in-memory DataStore<T> generic repository
│   ├── services/        # business logic
│   │   ├── productService.ts
│   │   ├── orderService.ts
│   │   └── reportService.ts
│   ├── result.ts        # Result<T, E> pattern (from Assignment 3)
│   ├── cli.ts           # arg parsing + command dispatch
│   └── index.ts         # entry point
├── tsconfig.json
├── package.json
└── README.md
```

---

## Data Models (start here)

```ts
// src/models.ts
export type Category = "electronics" | "books" | "apparel";

export interface Product {
  id: number;
  name: string;
  price: number;
  category: Category;
  inStock: number;
}

export interface OrderItem {
  productId: number;
  quantity: number;
}

export type OrderStatus = "pending" | "shipped" | "cancelled";

export interface Order {
  id: number;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: Date;
}
```

### Derived / utility types to expose from models.ts

```ts
export type CreateProductInput = Omit<Product, "id" | "inStock">;
export type UpdateProductInput = Partial<Omit<Product, "id">>;
export type OrderSummary = Pick<Order, "id" | "total" | "status">;
export type StockLevels = Record<Product["id"], number>;
export type LowStockItem = Pick<Product, "id" | "name"> & { lowStock: boolean };
```

---

## The Generic Store (use generics + classes)

```ts
// src/state.ts
export type Entity = { id: number };

export class DataStore<T extends Entity> {
  private readonly items = new Map<number, T>();
  private nextId = 1;

  create(input: Omit<T, "id">): Result<T, StorageError> {
    const id = this.nextId++;
    const entity = { ...input, id } as T;
    this.items.set(id, entity);
    return ok(entity);
  }

  findById(id: number): Result<T, StorageError> {
    const found = this.items.get(id);
    return found ? ok(found) : err({ kind: "not_found", message: `No entity #${id}` });
  }

  update(id: number, patch: Partial<Omit<T, "id">>): Result<T, StorageError> {
    const current = this.items.get(id);
    if (!current) return err({ kind: "not_found", message: `No entity #${id}` });
    const updated = { ...current, ...patch } as T;
    this.items.set(id, updated);
    return ok(updated);
  }

  delete(id: number): Result<T, StorageError> {
    const found = this.items.get(id);
    if (!found) return err({ kind: "not_found", message: `No entity #${id}` });
    this.items.delete(id);
    return ok(found);
  }

  list(): T[] {
    return [...this.items.values()];
  }
}
```

```ts
export type StorageError = {
  kind: "not_found";
  message: string;
};
```

> Note: `DataStore<Product>` and `DataStore<Order>` are two separate typed stores — the compiler keeps them apart.

---

## Domain Errors (discriminated union)

```ts
// src/errors.ts
export type ProductError =
  | { kind: "not_found"; message: string }
  | { kind: "validation"; message: string };

export type OrderError =
  | ProductError
  | { kind: "insufficient_stock"; productId: number; available: number }
  | { kind: "invalid_items"; message: string }
  | { kind: "zero_total"; message: string };
```

---

## Business Rules (where the typed logic lives)

### orderService.ts

```ts
export function createOrder(
  products: DataStore<Product>,
  orders: DataStore<Order>,
  items: OrderItem[]
): Result<Order, OrderError> {
  if (items.length === 0) {
    return err({ kind: "invalid_items", message: "Order needs at least one item" });
  }

  let total = 0;
  for (const item of items) {
    const productResult = products.findById(item.productId);
    if (!productResult.ok) return productResult;

    const product = productResult.data;
    if (item.quantity <= 0) {
      return err({ kind: "invalid_items", message: `${product.name}: quantity must be > 0` });
    }
    if (item.quantity > product.inStock) {
      return err({
        kind: "insufficient_stock",
        productId: product.id,
        available: product.inStock
      });
    }

    total += product.price * item.quantity;
  }

  if (total <= 0) {
    return err({ kind: "zero_total", message: "Order total could not be zero" });
  }

  // Deduct stock for every item
  for (const item of items) {
    const productResult = products.findById(item.productId);
    if (productResult.ok) {
      products.update(item.productId, { inStock: productResult.data.inStock - item.quantity });
    }
  }

  return orders.create({
    items,
    total,
    status: "pending",
    createdAt: new Date()
  });
}
```

### reportService.ts

```ts
export function lowStockReport(products: DataStore<Product>, threshold = 5): LowStockItem[] {
  return products
    .list()
    .filter((p) => p.inStock <= threshold)
    .map((p) => ({ id: p.id, name: p.name, lowStock: true }));
}

export function topSellers(orders: DataStore<Order>, products: DataStore<Product>): string[] {
  const counts: Record<number, number> = {};
  for (const order of orders.list()) {
    if (order.status === "cancelled") continue;
    for (const item of order.items) {
      counts[item.productId] = (counts[item.productId] ?? 0) + item.quantity;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([productId]) => {
      const product = products.findById(Number(productId));
      return product.ok ? product.data.name : `Product #${productId}`;
    });
}
```

---

## CLI (parse with process.argv, no `any` casts)

```ts
const [, , command, ...args] = process.argv;

switch (command) {
  case "add-product": {
    const [name, priceStr, category, stockStr] = args;
    const price = Number(priceStr);
    const inStock = Number(stockStr);
    if (!name || !isFinite(price) || !isFinite(inStock)) {
      console.error("Usage: script add-product <name> <price> <category> <stock>");
      process.exit(1);
    }
    const result = products.create({ name, price, category: category as Category, inStock });
    // handle Result
    break;
  }
  // ... place-order, list, report, low-stock
  default:
    console.error("Unknown command");
    process.exit(1);
}
```

---

## The Twist: compiler-graded "type bugs"

The models are deliberately designed so that subtle type errors appear if you get sloppy. Your submission should include the following **demonstrated type defects** **fixed**:

| Defect | What tripped it | Fix |
|--------|------------------|-----|
| `cart` accepts `string[]` prices | union mismatch | type `price: number` and narrow inputs |
| `order.total` computed from mixed unit | lost `number` type | `total += product.price * item.quantity` |
| returning `null` from create | `null` vs `undefined` under strict | use `undefined` or `Result` |
| accessing `.name` on possibly-undefined | `strictNullChecks` | guard with `if (result.ok)` |
| `createOrder()` silently mutating stock twice | logic, caught by type repr | single deduct loop |

For grading, keep a `docs/types.md` that lists 3 defects you hit and fixed, each with the exact TypeScript error message.

---

## Run & Verify

```bash
npm install
npm run typecheck   # must be clean
npm run build
npm start add-product "Laptop" 999 electronics 10
npm start place-order 1 2        # productId 1, qty 2 → stock 10 → 8
npm start report
npm start low-stock 5
```

### Sample Session

```text
$ npm start add-product "Laptop" 999 electronics 10
✓ Created product #1 Laptop ($999.00, 10 in stock)

$ npm start place-order 1 2
✓ Order #1 placed: total $1,998.00 (status: pending)
  stock for Laptop 10 → 8

$ npm start place-order 1 99
✗ insufficient_stock (available 8)

$ npm start report low-stock
Laptop is low on stock (8)
```

---

## Bonus

```text
1. Persist state: load/save JSON with node:fs + a typed readFile helper
2. Add a `--json` flag that prints machine-readable output (JSON.stringify)
3. Template literal types for command names (`typeof Commands`)
4. A `satisfies` example for the CLI command map
5. Export a static type from JSON-loaded data using a guard function
```

---

## Deliverables

1. Full source under `src/`
2. `tsconfig.json` with `strict: true` (also `noImplicitAny`, `strictNullChecks`, `noUnusedLocals` optional but recommended)
3. `docs/types.md` — 3+ real type errors you hit and fixed (with before/after)
4. Transcript of a full CLI session exercising: add → list → order → low-stock → error path
5. Zero errors on `npm run typecheck` and `npm run build`

---

## Grading Rubric

| Criteria | Points |
|----------|--------|
| Compiles with `strict: true`, zero `any` | 30% |
| Domain models + derived utility types correct | 20% |
| `Result<T,E>` pattern used for all errors | 20% |
| Generic `DataStore<T>` correct & reused | 15% |
| CLI works + clean output | 10% |
| `types.md` defect log quality | 5% |

---

## Tips

1. Write `models.ts` first — everything else types against it.
2. Let the Result pattern drive every service function; catch errors by returning them.
3. `npx tsc --noEmit` after every file; fix the FIRST error, re-run.
4. When `strict` complains about `null`/`undefined`, think "narrow" not "cast".
5. Your best learning tool is the exact error message — save them all in `types.md`.