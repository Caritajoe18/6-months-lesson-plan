import type { Request } from "express";
import { HttpError } from "../middleware/error";

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(422, "id must be a positive integer");
  }
  return id;
}

export function parseIntQuery(value: unknown, fallback: number): number {
  const num = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(num) ? Math.trunc(num) : fallback;
}

export function parseBoolQuery(value: unknown): boolean | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

export function body<T>(req: Request): T {
  return req.body as T;
}
