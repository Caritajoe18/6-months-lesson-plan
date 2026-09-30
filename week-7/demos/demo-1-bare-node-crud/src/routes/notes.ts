/**
 * routes/notes.ts — the ROUTE TABLE (the declarative part).
 * Pure data: which (method, pattern) pair runs which controller.
 * The actual matching/matching-engine lives in app.ts.
 */

import type { Route } from "../types.js";            // a route row
import { create, getOne, list, remove, update } from "../controllers/notes.js"; // handlers

/** All note endpoints in one tidy table. */
export const noteRoutes: Route[] = [
  { method: "GET",    pattern: "/api/notes",     handler: list },    // READ all
  { method: "GET",    pattern: "/api/notes/:id", handler: getOne },  // READ one
  { method: "POST",   pattern: "/api/notes",     handler: create },  // CREATE
  { method: "PUT",    pattern: "/api/notes/:id", handler: update },  // UPDATE
  { method: "DELETE", pattern: "/api/notes/:id", handler: remove }   // DELETE
];