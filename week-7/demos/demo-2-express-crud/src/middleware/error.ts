/**
 * middleware/error.ts — the CENTRALIZED error handler.
 * Express recognises error middleware by its FOUR args: (err, req, res, next).
 * Controllers signal failures by `throw new HttpError(status, message)`.
 * Express 5 also forwards rejected async handlers here automatically.
 */

import type { ErrorRequestHandler } from "express"; // the 4-arg error middleware type
import { fail } from "../helpers/responses.js";     // envelope helper

/** An error that carries its own HTTP status (e.g. new HttpError(404, "note not found")). */
export class HttpError extends Error {
  constructor(
    readonly status: number, // the HTTP status to send
    message: string          // human-readable reason
  ) {
    super(message);          // keeps err.message available
  }
}

/** Responsible for turning ANY thrown value into a tidy JSON envelope. */
export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  console.error(err);                                        // log the FULL detail server-side

  const status = err instanceof HttpError ? err.status : 500; // our error → its code, else 500
  const message =
    status >= 500                                            // a server error?
      ? "Internal server error"                              // hide internals from the client
      : err instanceof Error                                 // known client error?
        ? err.message                                        // surface the message
        : "unknown error";                                   // fallback

  fail(res, message, status);                                // send the envelope
};