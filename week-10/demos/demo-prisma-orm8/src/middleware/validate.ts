import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { HttpError } from "./error";

type Source = "body" | "query" | "params";

export function validate<T>(schema: ZodType<T>, source: Source = "body"): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".") || source}: ${issue.message}`)
        .join("; ");
      next(new HttpError(422, message));
      return;
    }
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };
}
