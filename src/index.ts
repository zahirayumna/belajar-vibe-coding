import { Elysia } from "elysia";
import { sql } from "drizzle-orm";
import { db } from "./db";

const app = new Elysia()
  .get("/", () => ({ status: "ok" }))
  .get("/health", async () => {
    try {
      await db.execute(sql`SELECT 1`);
      return { status: "ok", database: "connected" };
    } catch (error) {
      return {
        status: "error",
        database: "disconnected",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  })
  .listen(process.env.PORT ?? 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
