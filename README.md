# Sistem Manajemen Laboratorium Sekolah

Aplikasi manajemen peminjaman laboratorium sekolah — **frontend statis** (HTML + TailwindCSS + JavaScript) dengan backend **Supabase** (Postgres + Auth + RLS). Di-hosting gratis di **GitHub Pages**.

## Fitur
- **Login Guru** tanpa password (pilih nama), **Login Admin** email + password.
- **Booking laboratorium** dengan validasi **kapasitas maks. 30 peserta** dan **cek overlap waktu** (dihitung di database).
- Status booking: menunggu, disetujui, ditolak, dibatalkan, selesai.
- **Status lab** (tersedia / dipakai / maintenance / ditutup) — "dipakai" dihitung otomatis dari waktu sekarang.
- Manajemen lab, alat/equipment, dan data guru (CRUD, khusus admin).
- **Kalender** jadwal pemakaian (FullCalendar), notifikasi (SweetAlert2), ikon (Lucide).

## Teknologi
- Frontend: HTML, TailwindCSS (Play CDN), JavaScript (ES Modules) — tanpa build step.
- Backend: Supabase (PostgreSQL, PostgREST, Auth, Row Level Security).
- Hosting: GitHub Pages.

## Cara Setup

### 1. Database (Supabase)
1. Buat project di [supabase.com](https://supabase.com) (gratis).
2. Buka **SQL Editor → New query**, tempel seluruh isi [`supabase/schema.sql`](supabase/schema.sql), lalu **Run**.
3. Buat user admin: **Authentication → Users → Add user** (isi email + password).
4. Matikan pendaftaran publik: **Authentication → Providers → Email** → nonaktifkan *"Allow new users to sign up"*.

### 2. Konfigurasi frontend
Edit [`js/config.js`](js/config.js), isi dengan nilai dari **Project Settings → API**:
```js
export const SUPABASE_URL = 'https://xxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...'; // anon public key
```

### 3. Jalankan lokal (opsional)
Karena memakai ES Modules, buka lewat server (bukan `file://`):
```bash
php -S localhost:5177     # atau: npx serve  /  python -m http.server
```

### 4. Deploy ke GitHub Pages
1. Push repo ini ke GitHub.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / root**.
3. Buka URL yang diberikan (`https://<user>.github.io/<repo>/`).

## Struktur
```
index.html            # shell + pemuatan CDN
js/
  config.js           # kredensial Supabase (WAJIB diisi)
  supabase.js         # klien + lapisan data
  session.js          # status sesi (admin/guru)
  ui.js               # helper UI, badge, layout
  app.js              # router + autentikasi + halaman login
  views-admin.js      # halaman admin
  views-guru.js       # halaman guru
  calendar.js         # kalender FullCalendar
supabase/schema.sql   # skema DB + fungsi validasi + RLS + seed
```
