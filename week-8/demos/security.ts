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