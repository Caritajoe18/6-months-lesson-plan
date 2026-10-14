import type { ErrorRequestHandler, RequestHandler } from "express";
import { isStructuredError } from "@prisma/orm-postgres/utils/structured-error";
import { sendError } from "../helpers/response";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  sendError(res, 404, "Route not found");
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    sendError(res, err.status, err.message);
    return;
  }

  if (
    err instanceof Error &&
    "sqlState" in err &&
    (err as { sqlState?: string }).sqlState === "23505"
  ) {
    sendError(res, 409, "Resource already exists");
    return;
  }

  if (isStructuredError(err) && err.code === "RUNTIME.NO_ROWS") {
    sendError(res, 404, "Resource not found");
    return;
  }

  console.error(err);
  sendError(res, 500, "Internal server error");
};
