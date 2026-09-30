/**
 * middleware/logger.ts — logs each request's method, path, status and duration.
 * Express middleware signature: (req, res, next) — same as demo-1, but the
 * engine (app.use) is built into Express.
 */

import type { RequestHandler } from "express"; // the 3-arg middleware type from @types/express

export const logger: RequestHandler = (req, res, next) => {
  const start = Date.now();                     // timestamp when the request arrived
  res.on("finish", () => {                      // 'finish' fires when the response is fully sent
    const ms = Date.now() - start;              // how long the whole request took
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`); // GET /api/notes 200 3ms
  });
  next();                                       // pass control to the next middleware/route
};