import express from "express";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { usersRouter } from "./routes/users";
import { postsRouter } from "./routes/posts";

export const app = express();

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ status: "prisma demo is active" });
});

app.use("/users", usersRouter);
app.use("/posts", postsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
