-- ============================================================================
--  MIGRASI v6 — Riwayat kondisi alat (rusak / hilang / diperbaiki)
--  Jalankan SETELAH schema-v5.sql. Aman dijalankan ulang.
-- ============================================================================

create table if not exists equipment_logs (
  id                      uuid primary key default gen_random_uuid(),
  equipment_id            uuid references equipment(id) on delete cascade,
  kondisi_lama            text,
  kondisi_baru            text not null,
  catatan                 text,
  peminjam_terakhir       text,        -- nama guru yang terakhir meminjam saat perubahan dicatat
  tanggal_pinjam_terakhir date,
  created_at              timestamptz not null default now()
);
create index if not exists idx_eqlog_equipment on equipment_logs (equipment_id);
create index if not exists idx_eqlog_created   on equipment_logs (created_at desc);

-- View riwayat pemakaian alat (disetujui + selesai) — untuk mencari peminjam terakhir
create or replace view equipment_usage_all as
select
  be.equipment_id,
  e.nama    as alat,
  be.jumlah as jumlah_pinjam,
  b.id      as booking_id,
  b.tanggal, b.jam_mulai, b.jam_selesai, b.status,
  g.nama    as guru,
  l.nama    as lab
from booking_equipment be
join bookings  b on b.id = be.booking_id
join equipment e on e.id = be.equipment_id
left join gurus g        on g.id = b.guru_id
left join laboratories l on l.id = b.lab_id
where b.status in ('disetujui','selesai');

grant select on equipment_usage_all to anon, authenticated;

alter table equipment_logs enable row level security;

drop policy if exists p_sel_equipment_logs on equipment_logs;
create policy p_sel_equipment_logs on equipment_logs for select using (true);
drop policy if exists p_ins_equipment_logs on equipment_logs;
create policy p_ins_equipment_logs on equipment_logs for insert to authenticated with check (true);
drop policy if exists p_upd_equipment_logs on equipment_logs;
create policy p_upd_equipment_logs on equipment_logs for update to authenticated using (true) with check (true);
drop policy if exists p_del_equipment_logs on equipment_logs;
create policy p_del_equipment_logs on equipment_logs for delete to authenticated using (true);

-- ============================================================================
--  SELESAI v6.
-- ============================================================================
