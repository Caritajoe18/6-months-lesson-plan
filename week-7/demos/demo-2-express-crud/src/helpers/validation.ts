/**
 * helpers/validation.ts — turn an `unknown` request body (`req.body`) into a
 * typed shape, or reject it. Express types req.body as any/unknown because it
 * cannot know what the client sent — so WE must validate + narrow it here.
 */

/** The VALIDATED (typed) version of a note body that controllers can trust. */
export interface ValidNote {
  title: string;   // guaranteed non-empty string
  content: string; // guaranteed non-empty string
}

/**
 * Narrow `unknown` → `ValidNote` or null.
 * Return null when the body is not the shape we need.
 */
export function validateNoteBody(body: unknown): ValidNote | null {
  if (typeof body !== "object" || body === null) return null;             // not an object at all
  const b = body as Record<string, unknown>;                              // widen so we can inspect fields
  if (typeof b.title !== "string" || b.title.trim() === "") return null;  // title must be non-empty string
  if (typeof b.content !== "string" || b.content.trim() === "") return null; // content must too
  return { title: b.title, content: b.content };                          // both validated → safe
}