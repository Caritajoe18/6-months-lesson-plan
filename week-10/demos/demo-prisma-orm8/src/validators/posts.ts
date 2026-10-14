import { z } from "zod";

export const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  authorId: z.coerce.number().int().positive(),
  published: z.boolean().default(false),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
});

export const updatePostSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    body: z.string().min(1).optional(),
    published: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "provide at least one field to update",
  });

export const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  authorId: z.coerce.number().int().positive().optional(),
  published: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  q: z.string().max(100).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
