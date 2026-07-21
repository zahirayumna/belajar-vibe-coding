import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { usersRoute } from "./routes/users-route";

export const app = new Elysia()
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: {
          title: "Belajar Vibe Coding API",
          version: "1.0.0",
          description:
            "REST API untuk registrasi, login, get current user, dan logout berbasis session token.",
        },
        tags: [
          {
            name: "Users",
            description: "Endpoint terkait user & autentikasi",
          },
        ],
      },
    })
  )
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
