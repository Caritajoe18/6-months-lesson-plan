/**
 * helpers/http.ts — low-level HTTP utilities shared by controllers & middleware.
 */

import type { IncomingMessage, ServerResponse } from "node:http"; // Node's HTTP types

/** Stringify `data` and send it as a JSON response with the given status code. */
export function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const payload = JSON.stringify(data);                 // turn data into a JSON string
  res.writeHead(status, {                               // status line + response headers
    "Content-Type": "application/json",                 // tell the client this is JSON
    "Content-Length": Buffer.byteLength(payload)        // byte length (must be bytes, not chars)
  });
  res.end(payload);                                     // flush the body; response is complete
}

/** Send a 404 using our consistent `{ error: { message } }` envelope. */
export function sendNotFound(res: ServerResponse, message: string): void {
  sendJson(res, 404, { error: { message } });           // delegate to sendJson with status 404
}

/**
 * Read the ENTIRE request body as a string.
 * `req` is a Readable stream so `for await` pulls chunks until the stream ends.
 */
export async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];                          // collect raw bytes here
  for await (const chunk of req) {                      // iterate every chunk of the stream
    chunks.push(chunk as Buffer);                       // keep the chunk
  }
  return Buffer.concat(chunks).toString("utf8");        // glue chunks → one UTF-8 string
}

/** Extract the token out of `Authorization: Bearer <token>`, or "" when absent. */
export function bearerToken(req: IncomingMessage): string {
  const auth = req.headers.authorization ?? "";         // the raw header (Node keys are lower-case)
  return auth.replace(/^Bearer /, "");                  // strip the "Bearer " prefix
}