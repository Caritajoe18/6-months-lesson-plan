# Week 8 — Assignments: Authentication & Security

> All submissions must compile clean: `npx tsc --noEmit` with `strict: true`, **zero `any`**.
> Work on **your Week-7 API** (or the Task Manager from Week 8) — the three assignments build on each other.

```bash
npm install bcryptjs jsonwebtoken zod helmet cors express-rate-limit
npm install -D typescript tsx @types/node @types/express @types/jsonwebtoken @types/cors
```

---

## Assignment 1: Register & Login with bcrypt

**Objective:** Add real password auth to an existing API. Never store plaintext.

### Implement

- `USER` model with `passwordHash` (never returned in responses)
- `POST /auth/register` — validates with zod, hashes with bcrypt, returns a `PublicUser` (no hash)
- `POST /auth/login` — verifies the password, returns typed `{ token, user }`
- `GET /auth/me` — protected, echoes the authenticated user

### Types

```ts
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128)   // length min, not complexity tricks
});
export type RegisterInput = z.infer<typeof registerSchema>;

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
}
```

### Rules

- Never return `passwordHash`
- Duplicate email → `409 Conflict`
- Wrong password → generic `401` **"invalid credentials"** (don't reveal which half was wrong)
- Login limiter: 5 attempts/min → `429`

### Deliverables

- `routes/auth.ts`, `controller/auth.ts`, `security.ts` (hash/verify helpers)
- curl transcript below + clean `tsc --noEmit`

```bash
curl -i -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@x.com","password":"supersecret1"}'
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@x.com","password":"supersecret1"}'
curl -i http://localhost:3000/auth/me -H "Authorization: Bearer <TOKEN>"
curl -si -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" -d '{"email":"ada@x.com","password":"wrongpp"}'
curl -si -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@x.com","password":"supersecret1"}'    # 409
```

---

## Assignment 2: JWT Protected Routes + Role-Based Access

**Objective:** Prove identity with JWTs, then enforce Authorization.

### Implement

- `requireAuth` middleware → verifies `Bearer <token>`, attaches `req.user`
- `requireRole(...roles)` factory → checks `req.user.role`, returns 403
- **Ownership rule**: a `user` can only read/update/delete their own tasks; `admin` can do anything
- Route map:

```text
GET    /api/tasks                     public? NO — requireAuth
POST   /api/tasks                     requireAuth
GET    /api/tasks/:id                 requireAuth + ownership
PUT    /api/tasks/:id                 requireAuth + ownership
DELETE /api/tasks/:id                 requireAuth + ownership
GET    /api/users                     requireAuth + requireRole("admin")
DELETE /api/users/:id                 requireAuth + requireRole("admin")
```

### Test matrix

```bash
# 1. no token on GET /api/tasks          → 401
# 2. garbage token                       → 401
# 3. expired token (sign exp -1s)        → 401
# 4. valid user token GET own tasks      → 200
# 5. user GET another's task/:id         → 404 (or 403 — pick one, be consistent)
# 6. user GET /api/users                 → 403
# 7. admin GET /api/users                → 200
```

### Deliverables

- `middleware/auth.ts` + `middleware/role.ts`, typed `Request` augmentation
- the 7-case matrix result with curl output
- `tsc --noEmit` clean

---

## Assignment 3: Harden the API

**Objective:** Apply the Day-3 toolbox to the whole app and prove it with headers/statuses.

### Implement

- `helmet()` first
- strict CORS: whitelist `http://localhost:5173`, `credentials: true` if using cookies
- `express-rate-limit`: global 100/15min + stricter 5/min on `/auth/login`
- zod validation on **every** body-accepting route (422 on contract violations)
- centralized error handler hides details on 5xx
- `npm audit` output attached; document fixes

### Verify (include output)

```bash
curl -sI http://localhost:3000/health | grep -iE "content-security|x-frame|x-content-type"
curl -si http://localhost:3000/health -H "Origin: http://evil.com"          # blocked
curl -si http://localhost:3000/health -H "Origin: http://localhost:5173"    # allowed
# hammer login 6× → 6th is 429
curl -si -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"wrong"}'        # ×6 → 429
# a route that throws → JSON {success:false,error:{message}} with NO stack trace
```

### Deliverables

- `app.ts` wiring in the order from Day 3
- header/status output from the curl lines above
- `npm audit` summary + `tsc --noEmit` clean

---

## Grading Criteria (assignments)

| Criteria | Points |
|----------|--------|
| Password handling (bcrypt, no leaks, 409/401 semantics) | 20% |
| JWT sign/verify correctness + expiry handling | 20% |
| requireAuth / requireRole / ownership correctness (401 vs 403 vs 404) | 25% |
| Hardening (helmet, CORS, rate limit, zod, safe errors) | 20% |
| `tsc --noEmit` clean, **no `any`**, readable structure | 15% |

## Tips

1. `jwt.verify` for auth, never `jwt.decode`
2. Order matters: `requireAuth` **then** `requireRole`
3. Ship a `PublicUser` — one function, used everywhere
4. 401 = not authenticated; 403 = authenticated but not allowed; 404 = "doesn't exist for you"
5. Rate-limit before the whitelist CORS? No — helmet → CORS → json → rate-limit → routes