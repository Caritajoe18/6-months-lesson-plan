/**
 * app.ts — builds the HTTP server: middleware chain + route dispatch.
 * Equivalent of Express's app.use(...) wiring, done by hand for bare Node.
 */

import http from "node:http";                            // the raw HTTP server
import { compose } from "./middleware/compose.js";       // the middleware engine
import { logger } from "./middleware/logger.js";         // middleware 1: logging
import { requireAuth } from "./middleware/auth.js";      // middleware 2: auth
import { noteRoutes } from "./routes/notes.js";          // the CRUD route table
import { sendNotFound } from "./helpers/http.js";        // catch-all 404 helper
import type { Route } from "./types.js";                 // route shape

/** Create (but don't listen yet) the fully-wired server. */
export function createServer(): http.Server {
  // Middleware chain, in order — exactly like app.use(logger); app.use(auth);
  const runMiddleware = compose([logger]);

  return http.createServer(async (req, res) => {
    // ---- 1. run the middleware chain ----
    await runMiddleware(req, res, () => {
      // done-callback: nothing left to do — routing happens below anyway
    });

    // If a middleware ended the response (e.g. auth → 401), stop here.
    if (res.writableEnded) return;

    // ---- 2. normalise the request ----
    const method = req.method ?? "GET";       // method is optional in the types → default
    const pathname = (req.url ?? "/").split("?")[0]; // strip any query string (?page=2)

    // ---- 3. dispatch: find the first route that matches method + path ----
    for (const route of noteRoutes) {
      // exact match: "/api/notes"
      if (method === route.method && pathname === route.pattern) {
        await route.handler(req, res);        // no :id → call handler without an id
        return;                               // request handled → stop looking
      }

      // parametric match: pattern ends in "/:id" → prefix + one id segment
      if (method === route.method && route.pattern.endsWith("/:id")) {
        const prefix = route.pattern.slice(0, -4);   // "/api/notes/:id" → "/api/notes"
        if (pathname.startsWith(prefix + "/")) {     // e.g. "/api/notes/12"
          const id = pathname.slice(prefix.length + 1); // the segment after the slash → "12"
          if (id && !id.includes("/")) {             // must be exactly one clean segment
            await route.handler(req, res, id);       // dispatch with the captured id
            return;
          }
        }
      }
    }

    // ---- 4. nothing matched → catch-all 404 (like Express's final app.use) ----
    sendNotFound(res, `cannot ${method} ${pathname}`);
  });
}