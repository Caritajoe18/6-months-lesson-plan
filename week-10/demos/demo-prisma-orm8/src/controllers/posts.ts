import type { NextFunction, Request, Response } from "express";
import { db } from "../prisma/db";
import { HttpError } from "../middleware/error";
import { sendOk } from "../helpers/response";
import { body, parseBoolQuery, parseId, parseIntQuery } from "../helpers/params";
import type {
  CreatePostInput,
  UpdatePostInput,
} from "../validators/posts";

function baseQuery(authorId?: number, published?: boolean) {
  let query = db.orm.public.Post;
  if (authorId !== undefined) query = query.where({ authorId });
  if (published !== undefined) query = query.where({ published });
  return query;
}

export async function listPosts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(1, parseIntQuery(req.query.page, 1));
    const limit = Math.min(50, Math.max(1, parseIntQuery(req.query.limit, 10)));
    const authorIdRaw = Array.isArray(req.query.authorId)
      ? req.query.authorId[0]
      : req.query.authorId;
    const authorId = authorIdRaw !== undefined ? parseId(String(authorIdRaw)) : undefined;
    const published = parseBoolQuery(req.query.published);
    const searchRaw = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
    const search = typeof searchRaw === "string" ? searchRaw : undefined;

    const filtered = search
      ? baseQuery(authorId, published).where((p) => p.title.ilike(`%${search}%`))
      : baseQuery(authorId, published);

    const items = await filtered
      .include("author", (author) => author.select("id", "displayName"))
      .include("tags")
      .orderBy((p) => p.createdAt.desc())
      .limit(limit)
      .offset((page - 1) * limit)
      .all();

    sendOk(res, { items, page, limit });
  } catch (error) {
    next(error);
  }
}

export async function getPost(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseId(String(req.params.id));
    const post = await db.orm.public.Post
      .where({ id })
      .include("author", (author) => author.select("id", "displayName"))
      .include("tags")
      .all()
      .firstOrThrow();
    sendOk(res, post);
  } catch (error) {
    next(error);
  }
}

export async function createPost(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = body<CreatePostInput>(req);

    const post = await db.transaction(async (tx) => {
      const created = await tx.orm.public.Post.create({
        title: input.title,
        body: input.body,
        published: input.published ?? false,
        author: (author) => author.connect({ id: input.authorId }),
      });

      for (const label of input.tags ?? []) {
        const tag = await tx.orm.public.Tag.upsert({
          create: { label },
          update: {},
          conflictOn: { label },
        });
        await tx.orm.public.Post
          .where({ id: created.id })
          .update({ tags: (tags) => tags.connect([{ id: tag.id }]) });
      }

      return tx.orm.public.Post
        .where({ id: created.id })
        .include("author", (author) => author.select("id", "displayName"))
        .include("tags")
        .all()
        .firstOrThrow();
    });

    sendOk(res, post, 201);
  } catch (error) {
    next(error);
  }
}

export async function updatePost(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseId(String(req.params.id));
    const input = body<UpdatePostInput>(req);
    const updated = await db.orm.public.Post.where({ id }).update({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.published !== undefined ? { published: input.published } : {}),
    });
    if (!updated) throw new HttpError(404, "Post not found");
    sendOk(res, updated);
  } catch (error) {
    next(error);
  }
}

export async function deletePost(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = parseId(String(req.params.id));
    const deleted = await db.orm.public.Post.where({ id }).delete();
    if (!deleted) throw new HttpError(404, "Post not found");
    sendOk(res, deleted);
  } catch (error) {
    next(error);
  }
}
