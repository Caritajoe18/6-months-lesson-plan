/**
 * config.ts — all environment-dependent values live here, in ONE place.
 * Change PORT via env, or the auth token, or where data lives — without
 * touching controller/route/middleware code.
 */

import path from "node:path";            // build filesystem paths safely
import { fileURLToPath } from "node:url"; // convert our file:// URL into a path

const HERE = path.dirname(fileURLToPath(import.meta.url)); // the src/ folder

export const config = {
  port: Number(process.env.PORT ?? 3000),            // PORT env var wins, else 3000
  authToken: process.env.AUTH_TOKEN ?? "secret",     // token middleware checks (Bearer <token>)
  dbFile: path.resolve(HERE, "..", "data", "db.json") // project-root/data/db.json
};