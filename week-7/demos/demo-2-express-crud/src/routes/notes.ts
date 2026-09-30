/**
 * routes/notes.ts — the ROUTER (Express's built-in mini-router).
 * Express maps method + path to handlers for us — no manual matching like demo-1.
 * Auth middleware is attached here (route-level), only on the WRITE endpoints.
 */

import { Router } from "express";                            // Express's router factory
import { requireAuth } from "../middleware/auth.js";         // route-level auth middleware
import { create, getOne, list, remove, update } from "../controllers/notes.js"; // handlers

export const notesRouter: Router = Router();                 // create the router

notesRouter.get("/api/notes", list);                         // READ all     (public)
notesRouter.get("/api/notes/:identity", getOne); 
                  
// READ one     (public)
notesRouter.post("/api/notes", create);         // CREATE       (protected)


notesRouter.put("/api/notes/:id", requireAuth, update);      // UPDATE       (protected)
notesRouter.delete("/api/notes/:id", requireAuth, remove);   // DELETE       (protected)