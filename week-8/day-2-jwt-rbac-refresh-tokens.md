# Day 2 — JWT Sign/Verify, Protected Routes, Roles & Refresh Tokens

**Previous:** [Day 1 — Auth Concepts, Password Hashing & JWT Anatomy](day-1-auth-concepts-password-hashing.md)
**Next:** [Day 3 — Hardening: Helmet, CORS, Rate Limiting & OWASP](day-3-security-hardening-owasp.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Sign and verify JWTs with `jsonwebtoken` using a typed payload
- Protect routes with a typed `requireAuth` middleware
- Extend `Express.Request` with the authenticated user
- Enforce roles and permissions
- Implement refresh-token rotation safely

---

## 1. Setting Up

```bash
npm install bcryptjs jsonwebtoken
npm install -D typescript tsx @types/node @types/express @types/jsonwebtoken
```

### Token config (typed)

```ts
// config.ts
export const config = {
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
  accessTtl: "15m",
  refreshTtl: "7d"
} as const;
```

> Real deployments must set these via env. Never ship defaults to production.

---

## 2. Signing a Token (typed)

```ts
// tokens.ts
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "./config.js";

/** The claims WE put inside a token — typed, never `any`. */
export interface TokenPayload {
  sub: string;          // user identity, e.g. "42" or "user:42"
  email: string;
  role: "admin" | "user";
}

/** Sign a typed payload into a signed JWT string. */
export function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: config.accessTtl }; // ALWAYS an expiry
  return jwt.sign(payload, config.accessSecret, options);
}

export function signRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: config.refreshTtl };
  return jwt.sign(payload, config.refreshSecret, options);
}
```

### Claims recap

```text
sub   → who it is
role  → what they're allowed (Authorization)
iat   → added automatically by jsonwebtoken
exp   → added by expiresIn
```

---

## 3. Verifying a Token (typed)

```ts
import jwt, { type JwtPayload } from "jsonwebtoken";
import type { TokenPayload } from "./tokens.js";

/**
 * Verify + decode. Returns the payload typed, or throws.
 * jsonwebtoken checks the signature AND that exp is in the future.
 */
export function verifyAccessToken(token: string): TokenPayload & JwtPayload {
  const decoded = jwt.verify(token, config.accessSecret);   // throws TokenExpiredError / JsonWebTokenError
  return decoded as TokenPayload & JwtPayload;               // narrow the verified result
}
```

### Errors to handle

| Error | Meaning |
|-------|---------|
| `TokenExpiredError` | `exp` passed → 401 "session expired" |
| `JsonWebTokenError` | bad signature / malformed → 401 "invalid token" |

---

## 4. Protected Routes — the typed `requireAuth` middleware

### Step 1: Augment `Express.Request`

```ts
// types/express.d.ts (or express-augment.ts)
import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;         // parsed from token.sub
        email: string;
        role: "admin" | "user";
      };
    }
  }
}
```

### Step 2: The middleware

```ts
// middleware/auth.ts
import type { RequestHandler } from "express";
import { verifyAccessToken } from "../tokens.js";
import { fail } from "../helpers/responses.js";

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization ?? "";           // "Bearer <token>"
  const token = header.startsWith("Bearer ") ? header.slice(7) : ""; // strip prefix

  if (!token) {
    fail(res, "missing authorization token", 401);
    return;
  }

  try {
    const decoded = verifyAccessToken(token);               // throws on bad/expired
    req.user = {                                           // attach to req → routes read it
      id: Number(decoded.sub),
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch {
    fail(res, "invalid or expired token", 401);
  }
};
```

### Step 3: Protect a route

```ts
app.get("/api/tasks", requireAuth, (req, res) => {
  const userId = req.user?.id;             // typed! available after requireAuth
  if (userId === undefined) { fail(res, "unauthorized", 401); return; }
  ok(res, tasks.filter((t) => t.ownerId === userId));
});
```

> The `?.` + guard is the honest TypeScript way to handle "user may be absent". In a fancier setup you'd use a type guard like `req.user ?? fail(...)`. Keep the check visible.

---

## 5. Helper: a typed `requireAuth` that guarantees `req.user`

For teams that hate `req.user?.id`, a generator that *throws early* keeps routes clean:

```ts
export function requireUser(req: Request): NonNullable<Request["user"]> {
  if (!req.user) throw new HttpError(401, "unauthorized");
  return req.user;
}

// in a route:
const user = requireUser(req);       // throws → central error handler → 401 JSON
```

---

## 6. Roles & Permissions (Authorization)

### Role-based (RBAC) — coarse

```ts
// middleware/role.ts
import type { RequestHandler } from "express";

export function requireRole(...allowed: Array<"admin" | "user">): RequestHandler {
  return (req, res, next) => {
    const user = req.user;                            // set by requireAuth BEFORE this
    if (!user || !allowed.includes(user.role)) {
      fail(res, "forbidden", 403);                    // 403 ≠ 401 (authenticated but not allowed)
      return;
    }
    next();
  };
}
```

```ts
// usage — ORDER matters: auth first, then role
app.delete("/api/users/:id", requireAuth, requireRole("admin"), destroyUser);
app.delete("/api/tasks/:id", requireAuth, requireRole("admin", "user"), destroyTask);
```

### Permission-based (fine-grained)

```text
permission = "tasks:delete" | "tasks:update" | "users:manage"
role "admin"  → all permissions
role "user"   → tasks:read, tasks:create, tasks:update, tasks:delete
```

```ts
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ["tasks:*", "users:*"],
  user:  ["tasks:read", "tasks:create", "tasks:update", "tasks:delete"]
};

export function requirePermission(permission: Permission): RequestHandler {
  return (req, res, next) => {
    const role = req.user?.role;
    const allowed = role ? ROLE_PERMISSIONS[role] : [];
    if (!allowed.includes(permission) && !allowed.includes("tasks:*" as Permission)) {
      fail(res, "forbidden", 403);
      return;
    }
    next();
  };
}
```

### Ownership checks — the "not just any user" rule

```ts
const task = await taskStore.findById(Number(req.params.id));
if (!task) throw new HttpError(404, "task not found");
if (task.ownerId !== req.user?.id && req.user?.role !== "admin") {
  throw new HttpError(403, "forbidden");     // users can only touch their own tasks
}
```

---

## 7. Refresh Tokens — the Why & the How

### Why refresh at all

```text
short access token (15m)  →  leaks less when stolen (XSS/localStorage theft)
long refresh token (7d)   →  used ONLY to mint new access tokens
```

### Flow

```text
1. POST /auth/login                 → { accessToken, refreshToken }
2. every API call                   → Authorization: Bearer <accessToken>   (15m TTL)
3. accessToken expires → client:    → POST /auth/refresh { refreshToken }
4. server validates refreshToken &  → { new accessToken, new refreshToken } (rotation)
5. POST /auth/logout                → server blacklists / invalidates the refreshToken
```

### Rotation — never reuse the same refresh token twice

```ts
// auth.controller.ts (simplified)
export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) return fail(res, "refresh token required", 400);

  const stored = await refreshStore.find(refreshToken);      // in DB: token → userId → used?
  if (!stored || stored.revoked) return fail(res, "invalid refresh token", 401);

  await refreshStore.rotate(refreshToken);                   // mark OLD one revoked
  const user = await userStore.findById(stored.userId);
  if (!user) return fail(res, "user not found", 401);

  const payload: TokenPayload = { sub: String(user.id), email: user.email, role: user.role };
  ok(res, {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload)                  // NEW token issued
  });
}
```

```text
Detected reuse of a stolen refresh token? Revoke the whole token family
(all tokens belonging to that user) — this is the rotation security win.
```

### Store refresh tokens where the client won't lose them

```text
browser SPA  → httpOnly cookie (Path=/auth/refresh)
mobile app   → Secure storage (Keychain/Keystore)
```

---

## 8. Logout

```ts
export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) await refreshStore.revoke(refreshToken);  // mark revoked
  res.status(204).end();                                      // 204 No Content
}
```

> "Logout" only makes sense if you revoke something. With pure stateless access tokens, logout is *local* (client deletes token) plus revoking the refresh token server-side.

---

## 9. What Not to Do

```text
❌ Putting the JWT_SECRET in the payload or in the public client
❌ Trusting req.headers without verify() first
❌ role checks BEFORE requireAuth (req.user is undefined → 403 leaks)
❌ Reusing the same refresh token forever without rotation
❌ Using decode() for auth — verify() checks the signature, decode() doesn't!
❌ Hardcoding secrets; use env vars
```

---

## Exercises

1. Sign a token with 15m expiry, **decode** it (no verify) and read the claims.
2. Verify a good token → succeeds; tamper with one character → throws.
3. Expire check: sign with `expiresIn: "-1s"` and confirm `TokenExpiredError`.
4. Build `requireAuth` + `requireRole("admin")` and protect two routes.
5. Add an ownership check: `PATCH /api/tasks/:id` refuses other users' tasks.
6. Implement `refresh` with rotation; show the old token is rejected after refresh.

---

## Key Takeaways

- `jwt.sign(payload, secret, { expiresIn })` — always set `exp`
- `jwt.verify` checks signature + expiry; `jwt.decode` does NOT
- `requireAuth` augments `Request`; `requireRole`/ownership check run after it
- 401 = not authenticated; 403 = authenticated but not allowed
- Refresh tokens: short access + long refresh, always **rotate**
- Secrets come from env, never from code with ugly default go to prod

**Next:** [Day 3 — helmet, CORS, rate limiting, sanitization & OWASP](day-3-security-hardening-owasp.md)