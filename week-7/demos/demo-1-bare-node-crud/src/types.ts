/**
 * types.ts — every type shared across the project lives here.
 * No `any` anywhere: strict mode compiles clean only if we name our shapes.
 */

import type { IncomingMessage, ServerResponse } from "node:http"; // Node's request/response types

/** A single note stored in data/db.json. */
export interface Note {
  id: number;        // unique id, auto-incremented by the store
  title: string;     // note title
  content: string;   // note body
  createdAt: string; // ISO timestamp from new Date().toISOString()
}

/** What a middleware function looks like (the exact Express contract). */
export type Next = () => void; // call next() to hand control to the following middleware

export type Middleware = (
  req: IncomingMessage,  // incoming request (method, url, headers, body stream)
  res: ServerResponse,   // outgoing response (statusCode, setHeader, end)
  next: Next             // continue to the next middleware in the chain
) => void;

/** One row of the routing table: method + path pattern + the handler to run. */
export interface Route {
  method: string;  // "GET" | "POST" | "PUT" | "DELETE"
  pattern: string; // "/api/notes" or "/api/notes/:id"
  handler: (
    req: IncomingMessage,
    res: ServerResponse,
    id?: string // captured :id value when the pattern had one
  ) => Promise<void>;
}