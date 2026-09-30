/**
 * controllers/notes.ts — the CRUD HANDLERS.
 * Each handler is a Route["handler"]: it knows HTTP (status codes, responses)
 * but delegates storage to `store` and never touches templates/routing.
 */

import { readBody, sendJson, sendNotFound } from "../helpers/http.js"; // low-level HTTP helpers
import { validateNoteBody } from "../helpers/validation.js";          // body validation guard
import { store } from "../db/store.js";                               // the data repository
import type { Route } from "../types.js";                             // handler signature

/** READ ALL — GET /api/notes → 200 with the full array (possibly []). */
export const list: Route["handler"] = async (_req, res) => {
  sendJson(res, 200, store.list());        // 200 OK + the notes
};

/** READ ONE — GET /api/notes/:id → 200 note | 404. */
export const getOne: Route["handler"] = async (_req, res, id) => {
  const note = store.findById(Number(id)); // find by numeric id (params are always strings!)
  if (!note) return sendNotFound(res, "note not found"); // miss → 404 envelope
  sendJson(res, 200, note);                // hit → 200 + the note
};

/** CREATE — POST /api/notes → 201 note | 400 bad JSON | 422 bad data. */
export const create: Route["handler"] = async (req, res) => {
  const raw = await readBody(req);         // read the streamed body into a string
  let body: unknown;                       // parsed JSON (unknown until validated)
  try {
    body = JSON.parse(raw);                // may throw on malformed JSON
  } catch {
    return sendJson(res, 400, { error: { message: "invalid JSON body" } }); // 400 = malformed
  }

  const valid = validateNoteBody(body);    // structural validation → typed or null
  if (!valid) {
    return sendJson(res, 422, { error: { message: "title and content are required strings" } }); // 422 = bad data
  }

  const note = await store.create(valid);  // persist via the store
  sendJson(res, 201, note);                // 201 Created + the new note
};

/** FULL UPDATE — PUT /api/notes/:id → 200 note | 404 | 400 | 422. */
export const update: Route["handler"] = async (req, res, id) => {
  const note = store.findById(Number(id)); // locate first (so 404 wins over 400)
  if (!note) return sendNotFound(res, "note not found");

  const raw = await readBody(req);         // read body
  let body: unknown;                       // parsed JSON
  try {
    body = JSON.parse(raw);                // may throw
  } catch {
    return sendJson(res, 400, { error: { message: "invalid JSON body" } });
  }

  const valid = validateNoteBody(body);    // full update → both fields required
  if (!valid) {
    return sendJson(res, 422, { error: { message: "title and content are required strings" } });
  }

  const updated = await store.update(note.id, valid); // persist the change
  sendJson(res, 200, updated);             // 200 + updated note
};

/** DELETE — DELETE /api/notes/:id → 204 (no body) | 404. */
export const remove: Route["handler"] = async (_req, res, id) => {
  const deleted = await store.remove(Number(id)); // delete via store (persists too)
  if (!deleted) return sendNotFound(res, "note not found"); // nothing deleted → 404
  res.writeHead(204);                      // 204 = No Content
  res.end();                               // end the empty response
};