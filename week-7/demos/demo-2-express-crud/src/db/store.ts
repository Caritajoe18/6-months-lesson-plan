/**
 * db/store.ts — the in-memory repository (like a mini ORM layer).
 * Same design as demo-1: controllers talk ONLY to this object, which handles
 * id assignment and persistence. Controllers never touch fs or ids.
 */

import { loadDB, saveDB } from "./database.js";  // persistence primitives
import type { Note } from "../types.js";         // note shape
import type { ValidNote } from "../helpers/validation.js"; // validated create/update input

let notes: Note[] = [];       // live in-memory copy of the database
let nextId = 1;               // id counter, resumed from the highest id on boot

/** The single store object controllers import. */
export const store = {
  /** Boot: hydrate state from disk and resume the id counter. */
  init: async (): Promise<void> => {
    notes = await loadDB();                                    // load persisted notes
    nextId = notes.reduce((m, n) => Math.max(m, n.id), 0) + 1; // first free id after the max
  },

  /** Return all notes. */
  list: (): Note[] => notes,

  /** Find one note by numeric id, or undefined. */
  findById: (id: number): Note | undefined => notes.find((n) => n.id === id),

  /** Create a validated note, persist it, and return the new note. */
  create: async (input: ValidNote): Promise<Note> => {
    const note: Note = {                       // build the new note
      id: nextId++,                            // take current id, then bump for next time
      title: input.title,                      // validated title
      content: input.content,                  // validated content
      createdAt: new Date().toISOString()      // ISO timestamp
    };
    notes.push(note);                          // add to memory
    await saveDB(notes);                       // persist to disk
    return note;                               // hand it back to the controller
  },

  /** Replace title/content of a note; returns the note or undefined. */
  update: async (id: number, patch: ValidNote): Promise<Note | undefined> => {
    const note = notes.find((n) => n.id === id); // locate the note
    if (!note) return undefined;                 // not found → undefined, controller sends 404
    note.title = patch.title;                    // overwrite title in place
    note.content = patch.content;                // overwrite content in place
    await saveDB(notes);                         // persist the change
    return note;                                 // return the updated note
  },

  /** Remove a note; returns true if something was actually deleted. */
  remove: async (id: number): Promise<boolean> => {
    const before = notes.length;                             // size before removal
    notes = notes.filter((n) => n.id !== id);                // rebuild without the id
    if (notes.length === before) return false;               // nothing removed → false
    await saveDB(notes);                                     // persist the shrunken list
    return true;                                             // deleted → true
  }
};