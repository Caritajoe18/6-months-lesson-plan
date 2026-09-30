/**
 * middleware/auth.ts — protects WRITE requests (POST/PUT/DELETE).
 * Reads are public; writes require `Authorization: Bearer <token>`.
 * When auth fails it ends the response itself (401) — and does NOT call next().
 */

import { config } from "../config.js";     // the shared config (authToken, etc.)
import { bearerToken, sendJson } from "../helpers/http.js"; // token extraction + response helper
import type { Middleware } from "../types.js";              // middleware contract

export const requireAuth: Middleware = (req, res, next) => {
  if (req.method === "GET") return next();            // reads are public → continue straight away

  if (bearerToken(req) === config.authToken) {        // token matches the configured one?
    next();                                           // yes → continue to the route
    return;
  }

  // No/ wrong token: respond HERE, end the chain (do NOT call next()).
  sendJson(res, 401, { error: { message: "unauthorized" } }); // 401 + envelope
};