import { describe, test, expect } from "bun:test";
import { app } from "../src/app";
import { jsonBody, jsonRequest } from "./helpers/request";

describe("GET /", () => {
  test("mengembalikan response dasar", async () => {
    const res = await app.handle(jsonRequest("GET", "/"));

    expect(res.status).toBe(200);
    expect(await jsonBody(res)).toEqual({ status: "ok" });
  });
});

describe("GET /health", () => {
  test("mengembalikan status ok ketika database terkoneksi", async () => {
    const res = await app.handle(jsonRequest("GET", "/health"));

    expect(res.status).toBe(200);
    expect(await jsonBody(res)).toEqual({
      status: "ok",
      database: "connected",
    });
  });
});
