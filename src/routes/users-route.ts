import { Elysia, t } from "elysia";
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  UnauthorizedError,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from "../services/users-service";

function extractBearerToken(headers: Record<string, string | undefined>): string {
  const authHeader = headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Unauthorized");
  }

  return authHeader.slice("Bearer ".length);
}

export const usersRoute = new Elysia()
  .post(
    "/api/users",
    async ({ body, set }) => {
      try {
        await registerUser(body);
        return { data: "OK" };
      } catch (error) {
        if (error instanceof EmailAlreadyRegisteredError) {
          set.status = 400;
          return { error: error.message };
        }
        throw error;
      }
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String(),
        password: t.String(),
      }),
    }
  )
  .post(
    "/api/users/login",
    async ({ body, set }) => {
      try {
        const token = await loginUser(body);
        return { data: token };
      } catch (error) {
        if (error instanceof InvalidCredentialsError) {
          set.status = 401;
          return { error: error.message };
        }
        throw error;
      }
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    }
  )
  .get("/api/users/login", async ({ headers, set }) => {
    try {
      const token = extractBearerToken(headers);
      const user = await getCurrentUser(token);
      return { data: user };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        set.status = 401;
        return { error: error.message };
      }
      throw error;
    }
  })
  .delete("/api/users/logout", async ({ headers, set }) => {
    try {
      const token = extractBearerToken(headers);
      await logoutUser(token);
      return { data: "OK" };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        set.status = 401;
        return { error: error.message };
      }
      throw error;
    }
  });
