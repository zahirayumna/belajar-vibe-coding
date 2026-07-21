import { describe, test, expect, beforeEach } from "bun:test";
import { app } from "../src/app";
import { resetDatabase } from "./helpers/db";
import { jsonBody, jsonRequest } from "./helpers/request";

async function registerAndLogin(email = "budi@example.com") {
  await app.handle(
    jsonRequest("POST", "/api/users", {
      name: "Budi Santoso",
      email,
      password: "password123",
    })
  );
  const loginRes = await app.handle(
    jsonRequest("POST", "/api/users/login", {
      email,
      password: "password123",
    })
  );
  const { data: token } = await jsonBody(loginRes);
  return token as string;
}

describe("DELETE /api/users/logout", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("berhasil logout dengan token valid, session benar-benar terhapus", async () => {
    const token = await registerAndLogin();

    const logoutRes = await app.handle(
      jsonRequest("DELETE", "/api/users/logout", undefined, {
        Authorization: `Bearer ${token}`,
      })
    );
    expect(logoutRes.status).toBe(200);
    expect(await jsonBody(logoutRes)).toEqual({ data: "OK" });

    const meRes = await app.handle(
      jsonRequest("GET", "/api/users/login", undefined, {
        Authorization: `Bearer ${token}`,
      })
    );
    expect(meRes.status).toBe(401);
  });

  test("gagal tanpa header Authorization", async () => {
    const res = await app.handle(jsonRequest("DELETE", "/api/users/logout"));

    expect(res.status).toBe(401);
    expect(await jsonBody(res)).toEqual({ error: "Unauthorized" });
  });

  test("gagal jika header Authorization tidak diawali 'Bearer '", async () => {
    const token = await registerAndLogin();

    const res = await app.handle(
      jsonRequest("DELETE", "/api/users/logout", undefined, {
        Authorization: token,
      })
    );

    expect(res.status).toBe(401);
    expect(await jsonBody(res)).toEqual({ error: "Unauthorized" });
  });

  test("gagal dengan token yang tidak terdaftar", async () => {
    const res = await app.handle(
      jsonRequest("DELETE", "/api/users/logout", undefined, {
        Authorization: "Bearer token-asal-asalan",
      })
    );

    expect(res.status).toBe(401);
    expect(await jsonBody(res)).toEqual({ error: "Unauthorized" });
  });

  test("logout dua kali berturut-turut dengan token yang sama, percobaan kedua gagal", async () => {
    const token = await registerAndLogin();

    const first = await app.handle(
      jsonRequest("DELETE", "/api/users/logout", undefined, {
        Authorization: `Bearer ${token}`,
      })
    );
    expect(first.status).toBe(200);

    const second = await app.handle(
      jsonRequest("DELETE", "/api/users/logout", undefined, {
        Authorization: `Bearer ${token}`,
      })
    );
    expect(second.status).toBe(401);
  });

  test("logout tidak mempengaruhi session milik user lain", async () => {
    const tokenA = await registerAndLogin("a@example.com");
    const tokenB = await registerAndLogin("b@example.com");

    await app.handle(
      jsonRequest("DELETE", "/api/users/logout", undefined, {
        Authorization: `Bearer ${tokenA}`,
      })
    );

    const meB = await app.handle(
      jsonRequest("GET", "/api/users/login", undefined, {
        Authorization: `Bearer ${tokenB}`,
      })
    );

    expect(meB.status).toBe(200);
    const body = await jsonBody(meB);
    expect(body.data.email).toBe("b@example.com");
  });
});
