# Sistem Manajemen Laboratorium Sekolah

Aplikasi manajemen peminjaman laboratorium sekolah — **frontend statis** (HTML + TailwindCSS + JavaScript) dengan backend **Supabase** (Postgres + Auth + RLS). Di-hosting gratis di **GitHub Pages**.

## Fitur
- **Login Guru** tanpa password (pilih nama), **Login Admin** email + password.
- **Booking laboratorium** dengan validasi **kapasitas maks. 30 peserta** dan **cek overlap waktu** (dihitung di database).
- Status booking: menunggu, disetujui, ditolak, dibatalkan, selesai.
- **Status lab** (tersedia / dipakai / maintenance / ditutup) — "dipakai" dihitung otomatis dari waktu sekarang.
- Manajemen lab, alat/equipment, dan data guru (CRUD, khusus admin).
- **Import Excel/CSV** untuk data guru, siswa, dan alat — lengkap dengan **unduh template**.
- **Ekspor laporan Excel**: laporan peminjaman lab & laporan peminjaman alat/bahan.
- **Kalender** jadwal pemakaian (FullCalendar), notifikasi (SweetAlert2), ikon (Lucide).

## Import & Ekspor Excel (admin)

### Import data
Tersedia di tiga halaman admin — **Data Guru**, **Data Siswa**, dan **Alat & Bahan**.
Alurnya sama di ketiganya: klik **Unduh Template** → isi lembar datanya → klik **Import Excel/CSV** → pilih berkas.

Setiap template berisi dua lembar: lembar data (baris judul + contoh isian) dan lembar **Petunjuk**
(arti tiap kolom, wajib/opsional, contoh nilai, serta catatan). Berkas `.xlsx` maupun `.csv` sama-sama diterima.

| Data  | Kolom wajib        | Kolom opsional                                            | Catatan |
|-------|--------------------|-----------------------------------------------------------|---------|
| Guru  | `nama`             | `kode_guru` (alias `nip`), `mapel`                         | Nama yang sudah terdaftar otomatis dilewati (anti-dobel) |
| Siswa | `nama`, `kelas`    | `nis`                                                      | Kelas dibuat otomatis dari isi kolom `kelas` |
| Alat  | `nama`, `lab_kode` | `satuan`, `jumlah`, `rusak_ringan`, `rusak_berat`, `hilang` | `lab_kode` harus cocok dengan kode/nama lab yang sudah ada |

Nama kolom tidak peka huruf besar/kecil maupun spasi ("Kode Guru" = `kode_guru`). Sebelum data masuk,
muncul ringkasan berapa baris yang siap diimport dan berapa yang dilewati. Contoh berkas juga tersedia di folder [`templates/`](templates/).

### Ekspor laporan
Buka **Manajemen Booking** → atur filter **status** dan **bulan** → klik **Ekspor Laporan**, lalu pilih:

- **Laporan Peminjaman Lab** — tanggal, hari, jam, durasi, lab, guru, kelas, jumlah peserta, keperluan, status.
- **Laporan Peminjaman Alat & Bahan** — satu baris per alat: jumlah, satuan, peminjam, keperluan, status.
- **Kedua laporan** dalam satu berkas.

Tiap laporan terdiri dari dua lembar:

- **Ringkasan** — kop sekolah, periode & tanggal cetak, angka kunci, rekap per status / laboratorium /
  guru / alat, dan kolom tanda tangan siap cetak.
- **Rincian** — satu baris per transaksi, siap difilter dan diurutkan.

Berkasnya sudah berformat rapi: kop berwarna melebar di atas tabel, judul kolom teal, baris belang,
garis tabel, lebar kolom yang sudah pas, filter otomatis di baris judul, kolom angka rata kanan, dan
kolom **Status** berwarna sesuai keadaan (hijau = selesai/disetujui, kuning = menunggu, merah = ditolak).
Kolom **Tanggal** ditulis sebagai sel tanggal Excel asli berformat `dd/mm/yyyy`, jadi bisa diurutkan
dan difilter sebagai tanggal — bukan sekadar teks.

Halaman **Alat & Bahan** juga punya **Ekspor Inventaris** untuk rekap stok dan kondisi alat saat ini,
dengan format yang sama.

## Teknologi
- Frontend: HTML, TailwindCSS (Play CDN), JavaScript (ES Modules) — tanpa build step.
- Excel: `xlsx-js-style` (fork SheetJS + gaya sel) — dipakai untuk membaca berkas import
  sekaligus menulis laporan berformat.
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
  excel.js            # palet & perakit lembar Excel: laporan berformat, template, pembaca import
  app.js              # router + autentikasi + halaman login
  views-admin.js      # halaman admin
  views-guru.js       # halaman guru
  calendar.js         # kalender FullCalendar
supabase/schema.sql   # skema DB + fungsi validasi + RLS + seed
templates/            # contoh berkas import (CSV) untuk guru, siswa, alat
```
