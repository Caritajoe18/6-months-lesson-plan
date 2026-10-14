import { z } from "zod";

export const createUserSchema = z.object({
  email: z.email(),
  displayName: z.string().min(1).max(100),
  passwordHash: z.string().min(8).max(200),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

export const updateUserSchema = z
  .object({
    displayName: z.string().min(1).max(100).optional(),
    role: z.enum(["ADMIN", "USER"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "provide at least one field to update",
  });

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
