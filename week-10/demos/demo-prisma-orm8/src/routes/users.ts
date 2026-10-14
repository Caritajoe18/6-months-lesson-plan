import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser,
} from "../controllers/users";
import { validate } from "../middleware/validate";
import {
  createUserSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from "../validators/users";

export const usersRouter = Router();

usersRouter.get("/", validate(listUsersQuerySchema, "query"), listUsers);
usersRouter.get("/:id", getUser);
//usersRouter.post("/", createUser);
usersRouter.post("/", validate(createUserSchema, "body"), createUser);
usersRouter.patch("/:id", validate(updateUserSchema, "body"), updateUser);
usersRouter.delete("/:id", deleteUser);
