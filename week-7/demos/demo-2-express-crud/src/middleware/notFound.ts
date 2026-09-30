/**
 * middleware/notFound.ts — catch-all 404, registered AFTER all routes.
 * Any request that fell through every route lands here.
 */

import type { RequestHandler } from "express"; // Express middleware type
import { fail } from "../helpers/responses.js"; // envelope helper

export const notFound: RequestHandler = (req, res) => {
  fail(res, `cannot ${req.method} ${req.originalUrl}`, 404); // 404 envelope with method + path
};