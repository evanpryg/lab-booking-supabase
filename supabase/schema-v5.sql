-- ============================================================================
--  MIGRASI v5 — Rekap peminjaman alat + kondisi "hilang"
--  Jalankan SETELAH schema-v4.sql. Aman dijalankan ulang.
-- ============================================================================

-- 1. Tambah kondisi 'hilang' pada enum kondisi alat
alter type equipment_condition add value if not exists 'hilang';

-- 2. View rekap: alat yang dipinjam lewat booking yang DISETUJUI
create or replace view equipment_usage as
select
  be.equipment_id,
  e.nama            as alat,
  e.kondisi         as kondisi,
  e.jumlah          as stok,
  be.jumlah         as jumlah_pinjam,
  b.id              as booking_id,
  b.tanggal,
  b.jam_mulai,
  b.jam_selesai,
  b.tipe,
  g.nama            as guru,
  l.nama            as lab
from booking_equipment be
join bookings  b on b.id = be.booking_id
join equipment e on e.id = be.equipment_id
left join gurus g        on g.id = b.guru_id
left join laboratories l on l.id = b.lab_id
where b.status = 'disetujui';

grant select on equipment_usage to anon, authenticated;

-- ============================================================================
--  SELESAI v5.
-- ============================================================================
