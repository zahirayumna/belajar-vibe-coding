import { db } from "../../src/db";
import { sessions, users } from "../../src/db/schema";

export async function resetDatabase() {
  await db.delete(sessions);
  await db.delete(users);
}
