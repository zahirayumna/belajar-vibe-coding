import { describe, test, expect, beforeEach } from "bun:test";
import { app } from "../src/app";
import { resetDatabase } from "./helpers/db";
import { jsonBody, jsonRequest } from "./helpers/request";

async function registerAndLogin() {
  await app.handle(
    jsonRequest("POST", "/api/users", {
      name: "Budi Santoso",
      email: "budi@example.com",
      password: "password123",
    })
  );
  const loginRes = await app.handle(
    jsonRequest("POST", "/api/users/login", {
      email: "budi@example.com",
      password: "password123",
    })
  );
  const { data: token } = await jsonBody(loginRes);
  return token as string;
}

describe("GET /api/users/login (get current user)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("berhasil mengambil data user dengan token valid", async () => {
    const token = await registerAndLogin();

    const res = await app.handle(
      jsonRequest("GET", "/api/users/login", undefined, {
        Authorization: `Bearer ${token}`,
      })
    );

    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.data).toMatchObject({
      name: "Budi Santoso",
      email: "budi@example.com",
    });
    expect(body.data.id).toBeDefined();
    expect(body.data.created_at).toBeDefined();
    expect(body.data.password).toBeUndefined();
  });

  test("gagal tanpa header Authorization", async () => {
    const res = await app.handle(jsonRequest("GET", "/api/users/login"));

    expect(res.status).toBe(401);
    expect(await jsonBody(res)).toEqual({ error: "Unauthorized" });
  });

  test("gagal jika header Authorization tidak diawali 'Bearer '", async () => {
    const token = await registerAndLogin();

    const res = await app.handle(
      jsonRequest("GET", "/api/users/login", undefined, {
        Authorization: token,
      })
    );

    expect(res.status).toBe(401);
    expect(await jsonBody(res)).toEqual({ error: "Unauthorized" });
  });

  test("gagal dengan token yang tidak terdaftar", async () => {
    const res = await app.handle(
      jsonRequest("GET", "/api/users/login", undefined, {
        Authorization: "Bearer token-asal-asalan",
      })
    );

    expect(res.status).toBe(401);
    expect(await jsonBody(res)).toEqual({ error: "Unauthorized" });
  });

  test("gagal dengan token dari session yang sudah logout", async () => {
    const token = await registerAndLogin();
    await app.handle(
      jsonRequest("DELETE", "/api/users/logout", undefined, {
        Authorization: `Bearer ${token}`,
      })
    );

    const res = await app.handle(
      jsonRequest("GET", "/api/users/login", undefined, {
        Authorization: `Bearer ${token}`,
      })
    );

    expect(res.status).toBe(401);
    expect(await jsonBody(res)).toEqual({ error: "Unauthorized" });
  });
});
