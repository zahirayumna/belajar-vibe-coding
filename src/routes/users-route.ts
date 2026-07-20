import { Elysia, t } from "elysia";
import { EmailAlreadyRegisteredError, registerUser } from "../services/users-service";

export const usersRoute = new Elysia().post(
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
);
