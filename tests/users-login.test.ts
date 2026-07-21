import { describe, test, expect, beforeEach } from "bun:test";
import { app } from "../src/app";
import { resetDatabase } from "./helpers/db";
import { jsonBody, jsonRequest } from "./helpers/request";

async function registerUser(
  overrides: Partial<{ name: string; email: string; password: string }> = {}
) {
  return app.handle(
    jsonRequest("POST", "/api/users", {
      name: "Budi Santoso",
      email: "budi@example.com",
      password: "password123",
      ...overrides,
    })
  );
}

describe("POST /api/users/login", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("berhasil login dengan email & password yang benar", async () => {
    await registerUser();

    const res = await app.handle(
      jsonRequest("POST", "/api/users/login", {
        email: "budi@example.com",
        password: "password123",
      })
    );

    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(typeof body.data).toBe("string");
    expect(body.data.length).toBeGreaterThan(0);
  });

  test("gagal jika email belum terdaftar", async () => {
    const res = await app.handle(
      jsonRequest("POST", "/api/users/login", {
        email: "tidak-ada@example.com",
        password: "password123",
      })
    );

    expect(res.status).toBe(401);
    expect(await jsonBody(res)).toEqual({ error: "Email atau password salah" });
  });

  test("gagal jika password salah", async () => {
    await registerUser();

    const res = await app.handle(
      jsonRequest("POST", "/api/users/login", {
        email: "budi@example.com",
        password: "password-salah",
      })
    );

    expect(res.status).toBe(401);
    expect(await jsonBody(res)).toEqual({ error: "Email atau password salah" });
  });

  test("gagal jika email tidak dikirim", async () => {
    const res = await app.handle(
      jsonRequest("POST", "/api/users/login", {
        password: "password123",
      })
    );

    expect(res.status).toBe(400);
  });

  test("gagal jika password tidak dikirim", async () => {
    await registerUser();

    const res = await app.handle(
      jsonRequest("POST", "/api/users/login", {
        email: "budi@example.com",
      })
    );

    expect(res.status).toBe(400);
  });

  test("token hasil login valid untuk dipakai di get current user", async () => {
    await registerUser();
    const loginRes = await app.handle(
      jsonRequest("POST", "/api/users/login", {
        email: "budi@example.com",
        password: "password123",
      })
    );
    const { data: token } = await jsonBody(loginRes);

    const meRes = await app.handle(
      jsonRequest("GET", "/api/users/login", undefined, {
        Authorization: `Bearer ${token}`,
      })
    );

    expect(meRes.status).toBe(200);
    const body = await jsonBody(meRes);
    expect(body.data.email).toBe("budi@example.com");
  });

  test("login berulang kali menghasilkan token yang berbeda setiap kali", async () => {
    await registerUser();

    const res1 = await app.handle(
      jsonRequest("POST", "/api/users/login", {
        email: "budi@example.com",
        password: "password123",
      })
    );
    const res2 = await app.handle(
      jsonRequest("POST", "/api/users/login", {
        email: "budi@example.com",
        password: "password123",
      })
    );

    const { data: token1 } = await jsonBody(res1);
    const { data: token2 } = await jsonBody(res2);

    expect(token1).not.toBe(token2);
  });
});
