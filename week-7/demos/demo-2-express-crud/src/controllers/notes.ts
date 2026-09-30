/**
 * controllers/notes.ts — the CRUD HANDLERS.
 * Compare with demo-1's controllers: same logic, but Express gives us
 *   - req.body already parsed (express.json())
 *   - req.params.id already extracted
 *   - res.json() / throw HttpError(...) instead of sendJson(..., 404)
 * Controllers delegate storage to `store` and never touch routing.
 */

import type { RequestHandler } from "express";  // the (req, res, next) handler type
import { store } from "../db/store.js";         // the data repository
import { validateNoteBody } from "../helpers/validation.js"; // body validation guard
import { fail, ok } from "../helpers/responses.js";          // envelope helpers
import { HttpError } from "../middleware/error.js";          // error with a status
import type { Note } from "../types.js";                     // note shape

/** READ ALL — GET /api/notes → 200 with the full array. */
export const list: RequestHandler = (_req, res) => {
  ok(res, store.list());          // success envelope + the notes
};

/** READ ONE — GET /api/notes/:id → 200 note | 404. */
export const getOne: RequestHandler = (req, res) => {

  console.log("req:", req)
  const note = store.findById(Number(req.params.identity)); // params reach us ALREADY parsed by Express
  if (!note) throw new HttpError(404, "note not found"); // miss → thrown, handled centrally
  ok(res, note);                  // hit → 200 + the note
};

/** CREATE — POST /api/notes → 201 note | 422 bad data. (Bad JSON → 400 via error handler.) */
export const create: RequestHandler = async (req, res) => {
  const valid = validateNoteBody(req.body); // req.body was parsed by express.json() middleware
  if (!valid) {                             // structural validation failed?
    fail(res, "title and content are required strings", 422); // 422 = valid JSON, bad data
    return;
  }
  const note: Note = await store.create(valid); // persist via the store
  ok(res, note, 201);                       // 201 Created + the new note
};

/** FULL UPDATE — PUT /api/notes/:id → 200 note | 404 | 422. */
export const update: RequestHandler = async (req, res) => {
  const valid = validateNoteBody(req.body); // full update → both fields required
  if (!valid) {                             // validation failed?
    fail(res, "title and content are required strings", 422);
    return;
  }
  const updated: Note | undefined = await store.update(Number(req.params.id), valid);
  if (!updated) throw new HttpError(404, "note not found"); // not found → central handler
  ok(res, updated);                         // 200 + updated note
};

/** DELETE — DELETE /api/notes/:id → 204 (no body) | 404. */
export const remove: RequestHandler = async (req, res) => {
  const deleted = await store.remove(Number(req.params.id)); // delete via store (persists too)
  if (!deleted) throw new HttpError(404, "note not found");  // nothing deleted → central handler
  res.sendStatus(204);                       // 204 = No Content (no body allowed)
};