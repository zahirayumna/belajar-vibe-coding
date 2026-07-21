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
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      const field = error.valueError?.path?.replace(/^\//, "") || "input";
      const reason = error.valueError?.message ?? "tidak valid";
      return { error: `Field '${field}' ${reason}` };
    }
  })
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
        set.status = 500;
        return { error: "Terjadi kesalahan pada server" };
      }
    },
    {
      body: t.Object({
        name: t.String({ maxLength: 255 }),
        email: t.String({ maxLength: 255 }),
        password: t.String({ maxLength: 255 }),
      }),
      response: {
        200: t.Object({ data: t.Literal("OK") }),
        400: t.Object({ error: t.String() }),
        500: t.Object({ error: t.String() }),
      },
      detail: {
        tags: ["Users"],
        summary: "Registrasi user baru",
        description:
          "Mendaftarkan user baru. Password disimpan dalam bentuk hash bcrypt, bukan plain text.",
      },
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
      response: {
        200: t.Object({ data: t.String({ description: "Token session (UUID)" }) }),
        401: t.Object({ error: t.String() }),
      },
      detail: {
        tags: ["Users"],
        summary: "Login user",
        description:
          "Login dengan email & password, menghasilkan token session (dipakai sebagai 'Authorization: Bearer <token>' di endpoint lain).",
      },
    }
  )
  .get(
    "/api/users/login",
    async ({ headers, set }) => {
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
    },
    {
      headers: t.Object({
        authorization: t.Optional(
          t.String({
            description: "Format: Bearer <token>. Token didapat dari response login.",
          })
        ),
      }),
      response: {
        200: t.Object({
          data: t.Object({
            id: t.Number(),
            name: t.String(),
            email: t.String(),
            created_at: t.Date(),
          }),
        }),
        401: t.Object({ error: t.String() }),
      },
      detail: {
        tags: ["Users"],
        summary: "Ambil data user yang sedang login",
        description: "Butuh header Authorization berisi token session hasil login.",
      },
    }
  )
  .delete(
    "/api/users/logout",
    async ({ headers, set }) => {
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
    },
    {
      headers: t.Object({
        authorization: t.Optional(
          t.String({
            description: "Format: Bearer <token>. Token didapat dari response login.",
          })
        ),
      }),
      response: {
        200: t.Object({ data: t.Literal("OK") }),
        401: t.Object({ error: t.String() }),
      },
      detail: {
        tags: ["Users"],
        summary: "Logout user",
        description:
          "Menghapus session dengan token tersebut dari database. Butuh header Authorization berisi token session.",
      },
    }
  );
