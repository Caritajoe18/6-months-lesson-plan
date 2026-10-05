// tokens.ts
import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "./config.js";

/** The claims WE put inside a token — typed, never `any`. */
export interface TokenPayload {          
  email: string;
  role: "admin" | "user";
}

/** Sign a typed payload into a signed JWT string. */
export function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: config.accessTtl }; // ALWAYS an expiry
  const token = jwt.sign(payload, config.accessSecret, options);
  console.log("signAccessToken() →", token); // for demo purposes only
  return token;
}


signAccessToken({email: "user2@example.com", role: "admin" });



export function signRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: config.refreshTtl };
  return jwt.sign(payload, config.refreshSecret, options);
}