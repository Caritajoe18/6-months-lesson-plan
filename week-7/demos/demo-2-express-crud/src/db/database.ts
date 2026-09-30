/**
 * db/database.ts — file persistence. The ONLY module that touches the disk.
 * Identical to demo-1's database.ts (Express does not change persistence).
 */

import fs from "node:fs/promises";          // promise-based file system
import path from "node:path";               // file path helpers
import { config } from "../config.js";      // where DB_FILE lives (single source of truth)
import type { Note } from "../types.js";    // the note shape

/** Read every note from disk. Returns [] on first boot (no file yet). */
export async function loadDB(): Promise<Note[]> {
  try {
    const raw = await fs.readFile(config.dbFile, "utf8");      // read file as text
    return JSON.parse(raw) as Note[];                          // parse + cast to Note[]
  } catch {
    return [];                                                 // no file → start empty
  }
}

/** Persist the entire notes array to disk (pretty-printed JSON). */
export async function saveDB(notes: Note[]): Promise<void> {
  await fs.mkdir(path.dirname(config.dbFile), { recursive: true });   // ensure data/ exists
  await fs.writeFile(config.dbFile, JSON.stringify(notes, null, 2), "utf8"); // serialize + write
}