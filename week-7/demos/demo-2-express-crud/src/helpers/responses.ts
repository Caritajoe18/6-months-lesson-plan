/**
 * helpers/responses.ts — one consistent JSON ENVELOPE for every response:
 *   { success: true,  data: ... }   for successes
 *   { success: false, error: {...} } for failures
 * Compare with demo-1's sendJson — Express's res.json() removes the boilerplate.
 */

import type { Response } from "express"; // Express's response type

/** Send a success envelope with any payload and status (default 200). */
export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data }); // set status + send JSON envelope
}

/** Send a failure envelope with a message and status (default 400). */
export function fail(res: Response, message: string, status = 400): void {
  res.status(status).json({ success: false, error: { message } }); // set status + send error
}