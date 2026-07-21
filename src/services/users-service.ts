import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users, sessions } from "../db/schema";

// Custom error di bawah ini dilempar oleh service dan ditangkap di layer route
// (src/routes/users-route.ts) untuk dipetakan ke HTTP status yang sesuai.
// Service sengaja tidak tahu-menahu soal HTTP.

/** Email yang didaftarkan sudah dipakai user lain. Dipetakan ke HTTP 400. */
export class EmailAlreadyRegisteredError extends Error {}

/** Email tidak terdaftar atau password salah saat login. Dipetakan ke HTTP 401. */
export class InvalidCredentialsError extends Error {}

/** Token session tidak ada / tidak valid. Dipetakan ke HTTP 401. */
export class UnauthorizedError extends Error {}

/**
 * Mendaftarkan user baru.
 *
 * Memastikan email belum dipakai, lalu menyimpan user dengan password
 * yang sudah di-hash bcrypt (cost 10) — password plain text tidak pernah
 * masuk ke database.
 *
 * @throws {EmailAlreadyRegisteredError} jika email sudah terdaftar.
 */
export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email));

  if (existing.length > 0) {
    throw new EmailAlreadyRegisteredError("Email sudah terdaftar");
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);

  await db.insert(users).values({
    name: input.name,
    email: input.email,
    password: hashedPassword,
  });
}

/**
 * Login user dan membuat session baru.
 *
 * Mencocokkan email & password (dibandingkan dengan hash bcrypt di database),
 * lalu membuat row session baru berisi token UUID acak. Setiap pemanggilan
 * menghasilkan token baru, jadi satu user bisa punya beberapa session aktif
 * sekaligus (misalnya login dari beberapa device).
 *
 * Email tidak terdaftar dan password salah sengaja menghasilkan error yang
 * sama supaya tidak membocorkan email mana yang terdaftar.
 *
 * @returns Token session yang dipakai sebagai `Authorization: Bearer <token>`.
 * @throws {InvalidCredentialsError} jika email tidak terdaftar atau password salah.
 */
export async function loginUser(input: { email: string; password: string }) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email));

  if (!user) {
    throw new InvalidCredentialsError("Email atau password salah");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password);

  if (!passwordMatches) {
    throw new InvalidCredentialsError("Email atau password salah");
  }

  const token = crypto.randomUUID();

  await db.insert(sessions).values({
    token,
    userId: user.id,
  });

  return token;
}

/**
 * Mengambil data user pemilik sebuah token session.
 *
 * Mencari session berdasarkan token, lalu mengambil user yang terhubung
 * dengannya. Field `password` sengaja tidak ikut dikembalikan.
 *
 * @returns Data user: `id`, `name`, `email`, dan `created_at`.
 * @throws {UnauthorizedError} jika token tidak ditemukan, atau user pemilik
 * session sudah tidak ada.
 */
export async function getCurrentUser(token: string) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token));

  if (!session) {
    throw new UnauthorizedError("Unauthorized");
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId));

  if (!user) {
    throw new UnauthorizedError("Unauthorized");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.createdAt,
  };
}

/**
 * Logout user dengan menghapus session-nya.
 *
 * Menghapus row session yang tokennya cocok — bukan soft delete, sehingga
 * token langsung tidak bisa dipakai lagi. Hanya session milik token yang
 * dikirim yang terhapus; session lain (termasuk milik user yang sama dari
 * device lain) tidak terpengaruh.
 *
 * @throws {UnauthorizedError} jika tidak ada session yang terhapus, artinya
 * token tidak valid atau sudah pernah di-logout.
 */
export async function logoutUser(token: string) {
  const result = await db.delete(sessions).where(eq(sessions.token, token));

  if (result[0].affectedRows === 0) {
    throw new UnauthorizedError("Unauthorized");
  }
}
