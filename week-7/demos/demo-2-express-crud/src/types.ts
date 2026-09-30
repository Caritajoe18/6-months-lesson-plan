/**
 * types.ts — every type shared across the project lives here.
 */

/** A single note stored in data/db.json. */
export interface Note {
  id: number;        // unique id, auto-incremented by the store
  title: string;     // note title
  content: string;   // note body
  createdAt: string; // ISO timestamp from new Date().toISOString()
}