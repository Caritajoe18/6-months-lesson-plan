/**
 * app.ts — builds the Express application: middleware + routers + 404 + error.
 * THIS is where the ordering lives, and the ordering matters:
 *   1. express.json()   → so req.body is parsed for every route below
 *   2. logger           → logs everything
 *   3. notesRouter      → the actual CRUD endpoints
 *   4. notFound         → AFTER all routes: anything unmatched → 404
 *   5. errorHandler     → always LAST (Express detects it by its 4 args)
 */

import express from "express";                   // the Express framework
import { logger } from "./middleware/logger.js";     // app-level middleware: logging
import { notFound } from "./middleware/notFound.js"; // catch-all 404
import { errorHandler } from "./middleware/error.js"; // centralized error handler
import { notesRouter } from "./routes/notes.js";     // the CRUD router

/** Create (but don't listen yet) the fully-wired Express app. */
export function createApp(): express.Express {
  const app = express();                     // create the application object

  app.use(express.json());                   // 1. built-in JSON body parser (must come first)
  app.use(logger);  
  
  // 2. our logger for every request
  app.use(notesRouter);                      // 3. the CRUD routes (public + protected)
  app.use(notFound);                         // 4. 404 leaf after all routes
  app.use(errorHandler);                     // 5. error handler LAST (4 args!)

  return app;                                // hand it to server.ts to listen
}