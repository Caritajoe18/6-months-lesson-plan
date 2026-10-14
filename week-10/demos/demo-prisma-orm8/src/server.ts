import { app } from "./app";
import { db } from "./prisma/db";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

async function main() {
  const server = app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });

  const shutdown = async (signal: NodeJS.Signals) => {
    console.log(`received ${signal}, shutting down`);
    server.close(async () => {
      await db.close();
      console.log("closed connections");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});
