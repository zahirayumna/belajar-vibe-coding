# belajar-vibe-coding

REST API sederhana untuk **manajemen user & autentikasi berbasis session token**, dibangun dengan Bun + Elysia + Drizzle ORM + MySQL.

Aplikasi ini menyediakan alur autentikasi lengkap: registrasi user, login (menghasilkan token session), mengambil data user yang sedang login, dan logout (menghapus session). Password disimpan dalam bentuk hash bcrypt, dan session disimpan di database sebagai token UUID.

---

## Daftar Isi

- [Technology Stack](#technology-stack)
- [Library yang Digunakan](#library-yang-digunakan)
- [Arsitektur & Struktur Folder](#arsitektur--struktur-folder)
- [API yang Tersedia](#api-yang-tersedia)
- [Schema Database](#schema-database)
- [Cara Setup Project](#cara-setup-project)
- [Cara Menjalankan Aplikasi](#cara-menjalankan-aplikasi)
- [Cara Menjalankan Test](#cara-menjalankan-test)

---

## Technology Stack

| Komponen | Teknologi |
| --- | --- |
| Runtime | [Bun](https://bun.com) (v1.3.x) |
| Bahasa | TypeScript |
| Web Framework | [Elysia](https://elysiajs.com) |
| ORM / Query Builder | [Drizzle ORM](https://orm.drizzle.team) (dialect `mysql`) |
| Database | MySQL 8 |
| Test Runner | `bun test` (bawaan Bun, tanpa Jest/Vitest) |

## Library yang Digunakan

**Dependencies**

| Library | Kegunaan |
| --- | --- |
| `elysia` | Framework HTTP: routing, validasi body (TypeBox), error handling |
| `drizzle-orm` | Query builder & ORM type-safe untuk MySQL |
| `mysql2` | Driver MySQL (dipakai Drizzle lewat connection pool) |
| `bcryptjs` | Hashing & verifikasi password |

**Dev Dependencies**

| Library | Kegunaan |
| --- | --- |
| `drizzle-kit` | Generate & apply migration, serta Drizzle Studio |
| `@types/bun` | Type definitions Bun (termasuk API `bun:test`) |
| `@types/bcryptjs` | Type definitions bcryptjs |

> Token session dibuat dengan `crypto.randomUUID()` (Web Crypto API bawaan runtime), jadi tidak perlu library JWT/uuid tambahan.

---

## Arsitektur & Struktur Folder

Aplikasi memakai pemisahan **route (HTTP layer)** dan **service (business logic + akses database)**.

```
belajar-vibe-coding/
├── src/
│   ├── index.ts               # Entry point: hanya memanggil app.listen()
│   ├── app.ts                 # Perakitan instance Elysia (route + / + /health), TANPA .listen()
│   ├── routes/
│   │   └── users-route.ts     # HTTP layer untuk /api/users/*
│   ├── services/
│   │   └── users-service.ts   # Business logic + akses database + custom error classes
│   └── db/
│       ├── index.ts           # Connection pool MySQL + instance Drizzle (export `db` & `pool`)
│       └── schema.ts          # Definisi tabel (users, sessions)
├── drizzle/                   # File migration hasil generate drizzle-kit
│   ├── 0000_wonderful_ogun.sql
│   └── 0001_slimy_fantastic_four.sql
├── tests/                     # Unit test (bun test)
│   ├── helpers/
│   │   ├── db.ts              # resetDatabase() untuk membersihkan data tiap skenario
│   │   └── request.ts         # jsonRequest() & jsonBody() helper
│   ├── setup.ts               # Preload: menutup connection pool setelah semua test selesai
│   ├── users-register.test.ts
│   ├── users-login.test.ts
│   ├── users-get-current-user.test.ts
│   ├── users-logout.test.ts
│   └── health.test.ts
├── bunfig.toml                # Konfigurasi bun test (preload tests/setup.ts)
├── drizzle.config.ts          # Konfigurasi drizzle-kit
├── .env                       # Konfigurasi environment (TIDAK di-commit)
├── .env.example               # Contoh konfigurasi environment
└── .env.test                  # Konfigurasi environment khusus test (database terpisah)
```

### Pembagian Tanggung Jawab per Layer

| Layer | File | Tanggung jawab |
| --- | --- | --- |
| **Entry point** | `src/index.ts` | Hanya menyalakan server (`app.listen()`). Sengaja dipisah supaya `app` bisa diimport di test tanpa membuka port. |
| **App** | `src/app.ts` | Merakit instance Elysia: `.use(usersRoute)` + endpoint `/` dan `/health`. |
| **Route** | `src/routes/users-route.ts` | Definisi endpoint, schema validasi body, membaca header `Authorization`, dan memetakan error dari service ke HTTP status. Tidak berisi logic bisnis. |
| **Service** | `src/services/users-service.ts` | Logic bisnis & seluruh query database. Melempar custom error (`EmailAlreadyRegisteredError`, `InvalidCredentialsError`, `UnauthorizedError`) yang ditangkap di route. Tidak tahu-menahu soal HTTP. |
| **Database** | `src/db/index.ts`, `src/db/schema.ts` | Koneksi database dan definisi schema tabel. |

### Konvensi Penamaan

- **Nama file**: `kebab-case` (contoh: `users-route.ts`, `users-service.ts`).
- **Route**: berakhiran `-route.ts`, meng-export instance Elysia bernama `<entitas>Route` (contoh: `usersRoute`).
- **Service**: berakhiran `-service.ts`, meng-export fungsi async per use case (`registerUser`, `loginUser`, `getCurrentUser`, `logoutUser`).
- **Custom error**: class `PascalCase` berakhiran `Error`, didefinisikan & di-export dari file service.
- **Test**: berakhiran `.test.ts`, satu file per endpoint, diletakkan di `tests/`.
- **Kolom database**: `snake_case` (contoh: `user_id`, `created_at`), dipetakan ke `camelCase` di TypeScript (`userId`, `createdAt`).

---

## API yang Tersedia

Base URL default: `http://localhost:3000`

Ringkasan:

| Method | Endpoint | Deskripsi | Butuh Auth |
| --- | --- | --- | --- |
| `GET` | `/` | Status dasar aplikasi | ❌ |
| `GET` | `/health` | Health check + status koneksi database | ❌ |
| `POST` | `/api/users` | Registrasi user baru | ❌ |
| `POST` | `/api/users/login` | Login, menghasilkan token session | ❌ |
| `GET` | `/api/users/login` | Ambil data user yang sedang login | ✅ |
| `DELETE` | `/api/users/logout` | Logout, menghapus session | ✅ |

Endpoint yang butuh auth memakai header:

```
Authorization: Bearer <token>
```

di mana `<token>` didapat dari response login.

### `GET /` — Status

```bash
curl http://localhost:3000/
```

**200 OK**
```json
{ "status": "ok" }
```

### `GET /health` — Health Check

Mengecek koneksi ke database dengan query `SELECT 1`.

```bash
curl http://localhost:3000/health
```

**200 OK**
```json
{ "status": "ok", "database": "connected" }
```

Jika database bermasalah, response tetap `200` dengan body:
```json
{ "status": "error", "database": "disconnected", "message": "<pesan error>" }
```

### `POST /api/users` — Registrasi User

**Request body**

| Field | Tipe | Aturan |
| --- | --- | --- |
| `name` | string | wajib, maksimal 255 karakter |
| `email` | string | wajib, maksimal 255 karakter, harus unik |
| `password` | string | wajib, maksimal 255 karakter |

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Budi Santoso","email":"budi@example.com","password":"password123"}'
```

**200 OK**
```json
{ "data": "OK" }
```

**400 Bad Request** — email sudah dipakai
```json
{ "error": "Email sudah terdaftar" }
```

**400 Bad Request** — body tidak valid (field hilang / melebihi 255 karakter)
```json
{ "error": "Field 'name' Expected string length less or equal to 255" }
```

**500 Internal Server Error** — error tak terduga (detail internal tidak dibocorkan ke client)
```json
{ "error": "Terjadi kesalahan pada server" }
```

> Catatan: password di-hash dengan bcrypt (cost 10) sebelum disimpan. Saat ini belum ada validasi format email maupun panjang minimum password.

### `POST /api/users/login` — Login

**Request body**: `email`, `password` (keduanya wajib).

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"budi@example.com","password":"password123"}'
```

**200 OK** — `data` berisi token session (UUID)
```json
{ "data": "8f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f" }
```

**401 Unauthorized** — email tidak terdaftar **atau** password salah (pesan sengaja disamakan)
```json
{ "error": "Email atau password salah" }
```

> Setiap login berhasil membuat row session baru, sehingga satu user bisa punya beberapa session aktif sekaligus.

### `GET /api/users/login` — Get Current User

```bash
curl http://localhost:3000/api/users/login \
  -H "Authorization: Bearer <token>"
```

**200 OK**
```json
{
  "data": {
    "id": 1,
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "created_at": "2026-07-21T15:20:36.000Z"
  }
}
```

**401 Unauthorized** — header tidak ada, format bukan `Bearer <token>`, atau token tidak ditemukan
```json
{ "error": "Unauthorized" }
```

> Field `password` tidak pernah ikut dikembalikan.

### `DELETE /api/users/logout` — Logout

```bash
curl -X DELETE http://localhost:3000/api/users/logout \
  -H "Authorization: Bearer <token>"
```

**200 OK** — session dengan token tersebut dihapus dari database
```json
{ "data": "OK" }
```

**401 Unauthorized** — header tidak ada, format salah, atau token sudah tidak valid (misalnya sudah logout sebelumnya)
```json
{ "error": "Unauthorized" }
```

> Logout hanya menghapus session milik token yang dikirim; session lain (termasuk milik user yang sama dari device lain) tidak terpengaruh.

---

## Schema Database

Didefinisikan di `src/db/schema.ts`, migration-nya ada di folder `drizzle/`.

### Tabel `users`

| Kolom | Tipe | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | `bigint unsigned` | PK, auto increment | |
| `name` | `varchar(255)` | NOT NULL | Nama user |
| `email` | `varchar(255)` | NOT NULL, UNIQUE | Dipakai untuk login |
| `password` | `varchar(255)` | NOT NULL | Hash bcrypt, bukan plain text |
| `created_at` | `timestamp` | NOT NULL, DEFAULT `now()` | |

### Tabel `sessions`

| Kolom | Tipe | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | `bigint unsigned` | PK, auto increment | |
| `token` | `varchar(255)` | NOT NULL | Token UUID hasil login |
| `user_id` | `bigint unsigned` | NOT NULL, FK → `users.id` | Pemilik session |
| `created_at` | `timestamp` | NOT NULL, DEFAULT `now()` | |

### Relasi

```
users (1) ──────< (N) sessions
        users.id = sessions.user_id
```

Satu user bisa memiliki banyak session aktif (satu row per login).

---

## Cara Setup Project

### Prasyarat

1. **Bun** v1.3 atau lebih baru — [panduan instalasi](https://bun.com/docs/installation).
2. **MySQL 8** yang sedang berjalan (misalnya lewat Laragon, XAMPP, atau MySQL standalone).

### Langkah Setup

**1. Install dependencies**

```bash
bun install
```

**2. Siapkan file environment**

Salin `.env.example` menjadi `.env`, lalu sesuaikan isinya dengan konfigurasi MySQL kamu:

```bash
cp .env.example .env
```

| Variable | Default | Keterangan |
| --- | --- | --- |
| `DATABASE_HOST` | `localhost` | Host MySQL |
| `DATABASE_PORT` | `3306` | Port MySQL |
| `DATABASE_USER` | `root` | User MySQL |
| `DATABASE_PASSWORD` | *(kosong)* | Password MySQL |
| `DATABASE_NAME` | `belajar_vibe_coding` | Nama database |
| `PORT` | `3000` | Port HTTP server |

**3. Buat database**

```sql
CREATE DATABASE belajar_vibe_coding;
```

**4. Jalankan migration**

```bash
bun run db:migrate
```

Perintah ini membuat tabel `users` dan `sessions` sesuai file di folder `drizzle/`.

### Perintah Database Lainnya

| Perintah | Kegunaan |
| --- | --- |
| `bun run db:generate` | Generate file migration baru dari perubahan di `src/db/schema.ts` |
| `bun run db:migrate` | Menerapkan migration ke database |
| `bun run db:studio` | Membuka Drizzle Studio (UI untuk melihat isi database) |

---

## Cara Menjalankan Aplikasi

### Mode Development (hot reload)

```bash
bun run dev
```

Server berjalan di `http://localhost:3000` (atau sesuai `PORT` di `.env`) dan otomatis restart saat ada perubahan file.

Verifikasi server berjalan:

```bash
curl http://localhost:3000/health
# {"status":"ok","database":"connected"}
```

### Mode Production

```bash
bun run build   # hasil bundle ke folder dist/
bun run start   # menjalankan dist/index.js
```

---

## Cara Menjalankan Test

Test ditulis dengan **`bun test`** (test runner bawaan Bun) dan disimpan di folder `tests/`, satu file per endpoint.

### Setup Database Test (sekali saja)

Test **menghapus seluruh data** di tabel `users` dan `sessions` sebelum tiap skenario agar hasilnya konsisten. Karena itu test dijalankan terhadap **database terpisah** (`belajar_vibe_coding_test`) supaya data development tidak ikut terhapus.

Konfigurasinya sudah tersedia di file `.env.test` — Bun otomatis memuat file ini saat `bun test` dijalankan (karena `NODE_ENV=test`), jadi tidak perlu setup env manual.

**1. Buat database test**

```sql
CREATE DATABASE belajar_vibe_coding_test;
```

**2. Jalankan migration ke database test**

```bash
# Bash / Git Bash
DATABASE_NAME=belajar_vibe_coding_test bun run db:migrate
```

```powershell
# PowerShell
$env:DATABASE_NAME="belajar_vibe_coding_test"; bun run db:migrate
```

### Menjalankan Test

```bash
bun test                              # jalankan semua test
bun test tests/users-login.test.ts    # jalankan satu file test
bun test --watch                      # mode watch
```

Contoh output:

```
 31 pass
 0 fail
Ran 31 tests across 5 files.
```

### Cakupan Test

| File | Cakupan |
| --- | --- |
| `tests/users-register.test.ts` | Registrasi: sukses, email duplikat, field hilang, field > 255 karakter, kebocoran password |
| `tests/users-login.test.ts` | Login: sukses, email tidak terdaftar, password salah, field hilang, token unik per login |
| `tests/users-get-current-user.test.ts` | Get current user: token valid, tanpa header, format header salah, token asal, token setelah logout |
| `tests/users-logout.test.ts` | Logout: sukses & session benar-benar terhapus, tanpa header, token invalid, logout dua kali, isolasi antar user |
| `tests/health.test.ts` | Endpoint `/` dan `/health` |

### Catatan Teknis Test

- Test memanggil aplikasi langsung lewat `app.handle(new Request(...))` dari `src/app.ts`, **tanpa** menyalakan server HTTP sungguhan — sehingga cepat dan tidak bentrok dengan `bun run dev` yang sedang berjalan.
- `tests/helpers/db.ts` menyediakan `resetDatabase()` yang dipanggil di `beforeEach` tiap file test (menghapus `sessions` lebih dulu, baru `users`, karena ada foreign key).
- `tests/setup.ts` di-preload lewat `bunfig.toml` untuk menutup connection pool MySQL setelah semua test selesai, supaya proses test keluar dengan bersih.
