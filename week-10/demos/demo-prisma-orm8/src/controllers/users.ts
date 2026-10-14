import type { NextFunction, Request, Response } from "express";
import { db } from "../prisma/db";
import { HttpError } from "../middleware/error";
import { sendOk } from "../helpers/response";
import { body, parseId, parseIntQuery } from "../helpers/params";
import type {
  CreateUserInput,
  UpdateUserInput,
} from "../validators/users";
import bcrypt from "bcryptjs";

export async function listUsers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(1, parseIntQuery(req.query.page, 1));
    const limit = Math.min(50, Math.max(1, parseIntQuery(req.query.limit, 10)));

    const items = await db.orm.public.User
      .select("id", "email", "displayName", "role", "createdAt")
      .orderBy((u) => u.createdAt.desc())
      .limit(limit)
      .offset((page - 1) * limit)
      .all();

    const { total } = await db.orm.public.User.aggregate((a) => ({ total: a.count() }));

    sendOk(res, { items, total, page, limit });
  } catch (error) {
    next(error);
  }
}

export async function getUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseId(String(req.params.id));
    const user = await db.orm.public.User
      .where({ id })
      .include("posts", (posts) => posts.orderBy((p) => p.createdAt.desc()).limit(10))
      .all()
      .firstOrThrow();
    sendOk(res, user);
  } catch (error) {
    next(error);
  }
}

export async function createUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = body<CreateUserInput>(req);
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(input.passwordHash, salt);
    // Store hash in your password DB
    
    const user = await db.orm.public.User.create({
      email: input.email,
      displayName: input.displayName,
      passwordHash: hash,
      role: input.role ?? "USER",
    });
    sendOk(res, user, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseId(String(req.params.id));
    const input = body<UpdateUserInput>(req);
    const updated = await db.orm.public.User.where({ id }).update({
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
    });
    if (!updated) throw new HttpError(404, "User not found");
    sendOk(res, updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseId(String(req.params.id));
    const deleted = await db.orm.public.User.where({ id }).delete();
    if (!deleted) throw new HttpError(404, "User not found");
    sendOk(res, deleted);
  } catch (error) {
    next(error);
  }
}
