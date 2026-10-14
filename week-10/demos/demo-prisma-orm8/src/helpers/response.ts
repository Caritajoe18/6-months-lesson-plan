import type { Response } from "express";

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: { message: string };
}

export function sendOk<T>(res: Response, data: T, status = 200): void {
  const body: ApiSuccess<T> = { success: true, data };
  res.status(status).json(body);
}

export function sendError(res: Response, status: number, message: string): void {
  const body: ApiError = { success: false, error: { message } };
  res.status(status).json(body);
}
