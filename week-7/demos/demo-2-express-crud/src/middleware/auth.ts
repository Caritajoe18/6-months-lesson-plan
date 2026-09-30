/**
 * middleware/auth.ts — protects WRITE requests (POST/PUT/DELETE).
 * Reads are public; writes require `Authorization: Bearer <token>`.
 * When auth fails it ends the response itself (401) — and does NOT call next().
 */

import type { RequestHandler } from "express"; // Express middleware type
import { config } from "../config.js";         // shared config (authToken)
import { fail } from "../helpers/responses.js"; // envelope helper

export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.method === "GET") return next();              // reads are public → continue straight away

  const token: string = (req.headers.authorization ?? "") // grab the Authorization header
    .replace(/^Bearer /, "");                            // strip the "Bearer " prefix
  if (token !== config.authToken) {                      // no/ wrong token?
    fail(res, "unauthorized", 401);                      // 401 envelope
    return;                                              // response ended — do NOT call next()
  }
  next();                                                // authenticated → continue to the route
};