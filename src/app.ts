import { Elysia } from "elysia";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { usersRoute } from "./routes/users-route";

export const app = new Elysia()
  .use(usersRoute)
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
  });
