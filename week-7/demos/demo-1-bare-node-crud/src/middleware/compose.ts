/**
 * middleware/compose.ts — the tiny middleware ENGINE for bare Node.
 *
 * Express gives you app.use() for free; here we recreate the exact same
 * contract: middleware either ends the response, or calls `next()` to pass
 * control along the chain.
 */

import type { IncomingMessage, ServerResponse } from "node:http"; // Node HTTP types
import type { Middleware, Next } from "../types.js";              // our shared middleware contract

/**
 * Chain `middlewares` into ONE function that runs them in order.
 * Each middleware may respond (chain stops) or call next() (chain continues).
 */
export function compose(
  middlewares: Middleware[]                                  // the list of middleware to run
): (req: IncomingMessage, res: ServerResponse, done: Next) => Promise<void> {
  return (req, res, done) =>                                 // the combined runner
    new Promise<void>((resolve) => {                         // resolve when the chain finishes
      let i = 0;                                             // index of the next middleware to run
      const next: Next = () => {                             // next() given to each middleware
        const mw = middlewares[i++];                         // grab the current middleware
        if (!mw) {                                           // no more middleware left?
          done();                                            // run the "chain finished" callback
          return resolve();                                  // and resolve the promise
        }
        mw(req, res, next);                                  // run the middleware, passing next
      };
      next();                                                // start the chain
    });
}