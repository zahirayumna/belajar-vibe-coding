# Review: Get User yang Sedang Login (Issue #8)

Branch: `feature/get-current-user`

## File yang Diubah

Tidak ada file baru dan tidak ada migration baru, sesuai rencana di issue — hanya menambah logic ke file yang sudah ada:

| File | Perubahan |
|---|---|
| `src/services/users-service.ts` | Tambah `UnauthorizedError` dan fungsi `getCurrentUser(token)` |
| `src/routes/users-route.ts` | Tambah route `GET /api/users/login` |

## Penjelasan Logic

**`getCurrentUser(token)`** (`src/services/users-service.ts`):
1. Cari row di tabel `sessions` berdasarkan `token` (`db.select().from(sessions).where(eq(sessions.token, token))`).
2. Jika session tidak ditemukan → lempar `UnauthorizedError("Unauthorized")`.
3. Jika ditemukan, ambil user terkait dari tabel `users` berdasarkan `session.userId`.
4. Jika user tidak ditemukan (data tidak konsisten) → lempar `UnauthorizedError` yang sama.
5. Jika ditemukan → kembalikan `{ id, name, email, created_at }`, **tanpa** field `password`.

**Route `GET /api/users/login`** (`src/routes/users-route.ts`):
1. Baca header `Authorization` dari `headers.authorization`.
2. Jika header tidak ada atau tidak diawali `"Bearer "` → langsung `set.status = 401`, return `{ error: "Unauthorized" }` (tanpa memanggil service).
3. Jika format valid, ambil token setelah `"Bearer "`, panggil `getCurrentUser(token)`.
4. Sukses → return `{ data: user }` (status 200 default).
5. Error (`UnauthorizedError`) → `set.status = 401`, return `{ error: error.message }`.

Route didaftarkan di instance `usersRoute` yang sama (method `.get()`, path sama dengan `POST /api/users/login` tapi beda method — tidak konflik). `src/index.ts` tidak perlu diubah karena `usersRoute` sudah ter-`.use()` di sana.

## Hasil Pengujian Manual

Server dijalankan (`bun run dev`) dengan MySQL lokal aktif. User `zahira@localhost` (dari fitur registrasi) dipakai untuk login dan mendapatkan token.

**1. Login untuk mendapatkan token**
```
POST /api/users/login
Body: {"email":"zahira@localhost","password":"password"}
→ {"data":"d571798c-b0eb-44c3-bcc8-15d2fecba77b"}
```

**2. Sukses — dengan token valid**
```
GET /api/users/login
Header: Authorization: Bearer d571798c-b0eb-44c3-bcc8-15d2fecba77b
→ HTTP 200
{"data":{"id":1,"name":"zahira","email":"zahira@localhost","created_at":"2026-07-20T22:22:18.000Z"}}
```
✅ Tidak ada field `password` di response. `created_at` berupa string ISO 8601.

**3. Tanpa header `Authorization`**
```
GET /api/users/login
(tanpa header)
→ HTTP 401
{"error":"Unauthorized"}
```

**4. Token salah/asal**
```
GET /api/users/login
Header: Authorization: Bearer token-ngasal
→ HTTP 401
{"error":"Unauthorized"}
```
✅ Pesan & status identik dengan kasus tanpa header — tidak membocorkan detail kegagalan.

**5. Type-check**
```
bunx tsc --noEmit
→ tidak ada error
```

## Checklist Kesesuaian dengan Issue

- [x] Endpoint `GET /api/users/login` dibuat, tidak konflik dengan `POST /api/users/login` yang sudah ada
- [x] Membaca token dari header `Authorization: Bearer <token>`
- [x] Token dicari di tabel `sessions` (bukan `users`, sesuai koreksi di issue)
- [x] Response sukses berisi `id`, `name`, `email`, `created_at` — tanpa `password`
- [x] `created_at` dikirim sebagai string ISO 8601
- [x] Semua kondisi gagal (tanpa header, format salah, token tidak ditemukan) mengembalikan `{ "error": "Unauthorized" }` dengan status 401 yang identik
- [x] Tidak ada file baru, tidak ada perubahan schema/migration
- [x] `src/index.ts` tidak diubah (route otomatis aktif lewat `usersRoute`)
- [x] File `review.md` ini dibuat sesuai langkah 5 di issue
