/**
 * middleware/logger.ts — logs each request's method, path, status and duration.
 * Uses res.on("finish") so the log fires only AFTER the response was sent.
 */

import type { Middleware } from "../types.js";  // the middleware contract

export const logger: Middleware = (req, res, next) => {
  const start = Date.now();                     // timestamp when the request arrived
  res.on("finish", () => {                      // 'finish' fires when the response is fully sent
    const ms = Date.now() - start;              // how long the whole request took
    console.log(`${req.method} ${req.url} ${res.statusCode} ${ms}ms`); // e.g. GET /api/notes 200 3ms
  });
  next();                                       // pass control to the next middleware
};