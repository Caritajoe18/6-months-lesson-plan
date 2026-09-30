# Day 1 — Authentication Concepts, Password Hashing & JWT Anatomy

**Next:** [Day 2 — JWT Sign/Verify, Protected Routes & Refresh Tokens](day-2-jwt-rbac-refresh-tokens.md)

## Learning Objectives

By the end of this lesson, you will be able to:

- Explain the difference between authentication, authorization, and identification
- Explain why passwords must be **hashed** (never encrypted, never plaintext)
- Hash and verify passwords with `bcryptjs` in TypeScript
- Compare sessions vs tokens and pick one for an API
- Read and decode a JWT and explain its three parts

---

## 1. The Three A's

```text
Identification   → "I am carita"                      (who you CLAIM to be)
Authentication   → "prove it" (password, token...)    (verify the claim)
Authorization    → "you may delete tasks, not users"  (what you are ALLOWED to do)
```

- **AuthN (authentication)** = proving identity. Usually login.
- **AuthZ (authorization)** = permission check on a route/action, usually *after* authN.

> You should never mix them: one middleware proves WHO you are, another decides WHAT you can do.

---

## 2. Why We Hash Passwords (Never Store Plaintext)

### The attacker's dreams

| If we store | Attack | Result |
|-------------|--------|--------|
| plaintext | DB leak | real password revealed instantly |
| with a weak hash (MD5/SHA1) | dictionary / rainbow table | fast precomputed lookup |
| with salt + bcrypt | — | each guess costs ~100ms, salts defeat rainbow tables |

### Encrypting is NOT enough

```text
encrypt(password, key)  → reversible, key can be stolen
hash(password)          → one-way, expensive, salted
```

Even if an attacker cracks a hash, a **salt** (random per-user value) means they can't reuse a computed table for other users.

---

## 3. bcrypt Basics

bcrypt is a **slow, salted, one-way hash** designed for passwords. "Slow" is a feature: attackers can only try a few million guesses per year, not per second.

```bash
npm install bcryptjs
npm install -D typescript tsx @types/node @types/express @types/jsonwebtoken
```

```ts
// security.ts
import bcrypt from "bcryptjs";        // pure-JS implementation of bcrypt

const SALT_ROUNDS = 10;               // cost factor: 10 → ~100ms. Raise as hardware gets faster.

/** Hash a plaintext password → never store the raw value. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS); // returns like "$2a$10$V...salt...hash"
}

/** Compare a login attempt against a stored hash. Returns boolean. */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);     // false if wrong, true if right
}
```

### Anatomy of a bcrypt hash

```text
$2a$10$  x8b2f...22-char-salt....31-char-hash
 ──── ─── ─────────────────────────────────
 │    │    └─ salt + hash (base64)
 │    └──── cost factor (2^10 iterations)
 └──────── algorithmic version
```

### Register flow (typed)

```ts
import type { Request, Response } from "express";
import { hashPassword, verifyPassword } from "../security.js";

interface PublicUser {
  id: number;
  email: string;
  name: string;
}

async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name } = req.body;            // NOTE: never log req.body wholesale
  const passwordHash: string = await hashPassword(password); // hash FIRST
  const user = await userStore.create({ email, name, passwordHash }); // store hash only

  const publicUser: PublicUser = {                       // strip passwordHash before sending
    id: user.id,
    email: user.email,
    name: user.name
  };
  res.status(201).json({ success: true, data: publicUser });
}
```

### The cardinal rule

```text
NEVER return the passwordHash in a JSON response.
Make a PublicUser shape (pick) and use it in every route.
```

---

## 4. Sessions vs Tokens — the Big Trade-off

### Stateful sessions

```text
Browser → POST /login  →  server stores session, hands out cookie SID
Browser → GET /tasks   →  cookie SID → server looks up session in memory/DB
```

| ✅ | ❌ |
|----|----|
| Easy to revoke (delete session) | Server must remember every session (stateful) |
| Simple mental model | Breaks on horizontal scaling unless shared store (Redis) |

### Stateless tokens (JWT)

```text
Browser → POST /login  →  server signs a JWT, hands it back
Browser → GET /tasks   →  Authorization: Bearer <JWT> → server just VERIFIES signature
```

| ✅ | ❌ |
|----|----|
| No server state — scales sideways for free | Revoking is hard (until expiry) |
| Signature proves it wasn't forged | If secret leaks, tokens can be forged |

### Which for our API?

```text
public-facing SPA / mobile API  →  JWT (stateless, we own both ends)
server-rendered web app         →  httpOnly session cookie
```

---

## 5. JWT — Anatomy

A JWT is `base64url(header) + "." + base64url(payload) + "." + signature`.

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
.
eyJzdWIiOiJ1c2VyOjQyIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNjkzNjcwMDAwLCJleHAiOjE2OTM2NzM2MDB9
.
s4tNEL9...signature...
```

### Header (alg + typ)

```json
{ "alg": "HS256", "typ": "JWT" }
```

### Payload (claims)

```json
{
  "sub": "user:42",
  "name": "Ada",
  "role": "admin",
  "iat": 1693670000,
  "exp": 1693673600,
  "nbf": 1693670000
}
```

| Claim | Meaning |
|-------|---------|
| `sub` | subject — who this token is about |
| `iat` | issued at (epoch seconds) |
| `exp` | expiry — **always set it** |
| `nbf` | not before (avoid clock-skew issues) |
| `jti` | unique id (useful for refresh rotation) |

### Signature

```text
signature = HMAC-SHA256(base64url(header) + "." + base64url(payload), JWT_SECRET)
```

The signature is what makes a JWT unforgeable *without the secret*. Anyone can decode header+payload — **JWTs are not encrypted**. Never put secrets in the payload.

### Decode it yourself

```bash
# Header+payload are just base64url:
echo "eyJzdWIiOiJ1c2VyOjQyIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNjkzNjcwMDAwLCJleHAiOjE2OTM2NzM2MDB9" \
  | base64 -d 2>/dev/null || echo "..."
```

Or use https://jwt.io to paste and inspect a token.

---

## 6. Delivering the Token — Header vs Cookie

### Authorization header (our default for an API)

```text
Authorization: Bearer <token>
```

- No CSRF risk, works from any client
- BUT: visible to JS + stored in localStorage → XSS can steal it

### httpOnly cookie

```text
Set-Cookie: token=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/
```

- Not readable by JS → XSS-proof (mostly)
- Requires CSRF protection (SameSite helps), and CORS must allow credentials

### Rules of thumb

```text
✓ header + Bearer for mobile/SPA APIs you control
✓ httpOnly cookie for browser apps, add SameSite=Lax and CSRF handling
✗ localStorage for anything sensitive unless you accept the XSS risk
```

---

## 7. What Not to Do

```text
❌ Storing plaintext passwords
❌ Hashing without a salt, or with a fast hash (MD5/SHA1)
❌ Throwing passwords into logs or error messages
❌ Returning passwordHash in JSON
❌ Putting secrets inside JWT payload (it's readable!)
❌ Using JWT without exp
```

---

## Exercises

1. Hash `"my-pass"` 3 times and confirm each hash is different (random salt).
2. `verifyPassword` returns `true` for the right password, `false` otherwise.
3. Measure how long 10 vs 12 vs 14 `SALT_ROUNDS` take (`console.time`).
4. Decode the sample JWT from section 5 by hand (split on `.`, base64-decode parts 1–2).
5. Write a typed `PublicUser` that strips `passwordHash` from a user object.

---

## Key Takeaways

- AuthN (who) vs AuthZ (what) — separate concerns
- Store salted bcrypt hashes, never plaintext; cost factor controls work factor
- Sessions are stateful & revocable; JWTs are stateless & easy to scale but hard to revoke
- JWT = `header.payload.signature`; readable but un-forgeable without the secret
- Deliver tokens via Bearer header (API) or httpOnly cookie (browser)
- Never leak `passwordHash`, never put secrets in a token payload

**Next:** [Day 2 — sign/verify, protected routes, RBAC & refresh tokens](day-2-jwt-rbac-refresh-tokens.md)