/**
 * server.ts — ENTRY POINT (index file).
 * Boot order: hydrate the store from disk → build the app → listen.
 * This is the ONLY file you run: `npm run dev` / `npx tsx src/server.ts`.
 */

import { createApp } from "./app.js";   // the wired-up Express app factory
import { config } from "./config.js";   // port from config (env override)
import { store } from "./db/store.js";  // the data store

/** Boot the whole app: load persisted data first, then start listening. */
async function main(): Promise<void> {
  await store.init();                    // hydrate notes from data/db.json (may be empty)

  const app = createApp();               // build the Express app (middleware + routes attached)
  app.listen(config.port, () => {        // start accepting connections on the configured port
    console.log(`Express API → http://localhost:${config.port}`);
  });
}

void main();                             // run main; we don't need its return value

// ─────────────────────────────────────────────────────────────────────────────
// TRY IT (from this folder, in another terminal) — IDENTICAL commands to demo-1:
//   npm run dev
//
//   curl -i -X POST http://localhost:3000/api/notes \
//     -H "Content-Type: application/json" -H "Authorization: Bearer secret" \
//     -d '{"title":"Hi","content":"First note"}'
//   curl http://localhost:3000/api/notes
//   curl http://localhost:3000/api/notes/1
//   curl -i -X PUT http://localhost:3000/api/notes/1 \
//     -H "Content-Type: application/json" -H "Authorization: Bearer secret" \
//     -d '{"title":"Updated","content":"New body"}'
//   curl -i -X DELETE http://localhost:3000/api/notes/1 -H "Authorization: Bearer secret"
//   curl -i -X POST http://localhost:3000/api/notes          (no token → 401)
//   curl -i http://localhost:3000/nope                       (404 envelope)
//   cat data/db.json                                         (persisted!)
//   npm run typecheck                                        (strict TS, zero errors)
// ─────────────────────────────────────────────────────────────────────────────