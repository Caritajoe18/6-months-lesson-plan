import { Router } from "express";
import {
  createPost,
  deletePost,
  getPost,
  listPosts,
  updatePost,
} from "../controllers/posts";
import { validate } from "../middleware/validate";
import {
  createPostSchema,
  listPostsQuerySchema,
  updatePostSchema,
} from "../validators/posts";

export const postsRouter = Router();

postsRouter.get("/", validate(listPostsQuerySchema, "query"), listPosts);
postsRouter.get("/:id", getPost);
postsRouter.post("/", validate(createPostSchema, "body"), createPost);
postsRouter.patch("/:id", validate(updatePostSchema, "body"), updatePost);
postsRouter.delete("/:id", deletePost);
