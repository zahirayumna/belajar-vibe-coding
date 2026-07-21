import { describe, test, expect, beforeEach } from "bun:test";
import { app } from "../src/app";
import { resetDatabase } from "./helpers/db";
import { jsonBody, jsonRequest } from "./helpers/request";

describe("POST /api/users (registrasi)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  test("berhasil registrasi dengan data valid", async () => {
    const res = await app.handle(
      jsonRequest("POST", "/api/users", {
        name: "Budi Santoso",
        email: "budi@example.com",
        password: "password123",
      })
    );

    expect(res.status).toBe(200);
    expect(await jsonBody(res)).toEqual({ data: "OK" });
  });

  test("gagal jika email sudah terdaftar", async () => {
    await app.handle(
      jsonRequest("POST", "/api/users", {
        name: "Budi Santoso",
        email: "budi@example.com",
        password: "password123",
      })
    );

    const res = await app.handle(
      jsonRequest("POST", "/api/users", {
        name: "Budi Lain",
        email: "budi@example.com",
        password: "password456",
      })
    );

    expect(res.status).toBe(400);
    expect(await jsonBody(res)).toEqual({ error: "Email sudah terdaftar" });
  });

  test("gagal jika field name tidak dikirim", async () => {
    const res = await app.handle(
      jsonRequest("POST", "/api/users", {
        email: "test@example.com",
        password: "password123",
      })
    );

    expect(res.status).toBe(400);
  });

  test("gagal jika field email tidak dikirim", async () => {
    const res = await app.handle(
      jsonRequest("POST", "/api/users", {
        name: "Budi Santoso",
        password: "password123",
      })
    );

    expect(res.status).toBe(400);
  });

  test("gagal jika field password tidak dikirim", async () => {
    const res = await app.handle(
      jsonRequest("POST", "/api/users", {
        name: "Budi Santoso",
        email: "test@example.com",
      })
    );

    expect(res.status).toBe(400);
  });

  test("gagal jika name lebih dari 255 karakter", async () => {
    const res = await app.handle(
      jsonRequest("POST", "/api/users", {
        name: "A".repeat(256),
        email: "test@example.com",
        password: "password123",
      })
    );

    expect(res.status).toBe(400);
  });

  test("gagal jika email lebih dari 255 karakter", async () => {
    const longEmail = `${"a".repeat(250)}@example.com`;
    const res = await app.handle(
      jsonRequest("POST", "/api/users", {
        name: "Budi Santoso",
        email: longEmail,
        password: "password123",
      })
    );

    expect(res.status).toBe(400);
  });

  test("gagal jika password lebih dari 255 karakter", async () => {
    const res = await app.handle(
      jsonRequest("POST", "/api/users", {
        name: "Budi Santoso",
        email: "test@example.com",
        password: "A".repeat(256),
      })
    );

    expect(res.status).toBe(400);
  });

  test("name berupa string kosong tetap diterima (tidak ada validasi minLength)", async () => {
    const res = await app.handle(
      jsonRequest("POST", "/api/users", {
        name: "",
        email: "test@example.com",
        password: "password123",
      })
    );

    expect(res.status).toBe(200);
  });

  test("email dengan format bukan email tetap diterima (tidak ada validasi format)", async () => {
    const res = await app.handle(
      jsonRequest("POST", "/api/users", {
        name: "Budi Santoso",
        email: "bukan-format-email",
        password: "password123",
      })
    );

    expect(res.status).toBe(200);
  });

  test("response sukses tidak membocorkan password", async () => {
    const res = await app.handle(
      jsonRequest("POST", "/api/users", {
        name: "Budi Santoso",
        email: "budi@example.com",
        password: "password123",
      })
    );

    const body = await jsonBody(res);
    expect(JSON.stringify(body)).not.toContain("password123");
  });
});
