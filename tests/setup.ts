import { afterAll } from "bun:test";
import { pool } from "../src/db";

afterAll(async () => {
  await pool.end();
});
