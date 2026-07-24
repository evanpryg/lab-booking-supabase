-- ============================================================================
--  MIGRASI v7 — Kondisi alat per-unit (bukan global)
--  Contoh: PC Desktop total 10 → baik 8, rusak berat 1, hilang 1
--  Jalankan SETELAH schema-v6.sql. Aman dijalankan ulang.
-- ============================================================================

-- 1. Kolom jumlah per kondisi
alter table equipment add column if not exists rusak_ringan int not null default 0;
alter table equipment add column if not exists rusak_berat  int not null default 0;
alter table equipment add column if not exists hilang       int not null default 0;

-- 2. Migrasi data lama: bila label kondisi lama bukan 'baik',
--    anggap seluruh unit berkondisi tersebut (bisa diperbaiki manual setelahnya).
update equipment set rusak_ringan = jumlah where kondisi = 'rusak_ringan' and rusak_ringan = 0;
update equipment set rusak_berat  = jumlah where kondisi = 'rusak_berat'  and rusak_berat  = 0;
update equipment set hilang       = jumlah where kondisi = 'hilang'       and hilang       = 0;

-- 3. Jaga konsistensi: jumlah bermasalah tidak boleh melebihi total
alter table equipment drop constraint if exists chk_equipment_kondisi_jumlah;
alter table equipment add constraint chk_equipment_kondisi_jumlah
  check (rusak_ringan >= 0 and rusak_berat >= 0 and hilang >= 0
         and (rusak_ringan + rusak_berat + hilang) <= jumlah);

-- Catatan: kolom lama `kondisi` dibiarkan ada demi kompatibilitas,
-- tetapi aplikasi kini memakai jumlah per kondisi di atas.
--   baik       = jumlah - rusak_ringan - rusak_berat - hilang
--   siap pakai = jumlah - rusak_berat - hilang   (rusak ringan masih bisa dipakai)

-- ============================================================================
--  SELESAI v7.
-- ============================================================================
