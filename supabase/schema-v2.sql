-- ============================================================================
--  MIGRASI v2 — Data Siswa + peminjaman alat pada booking
--  Jalankan SETELAH schema.sql, di Supabase → SQL Editor → New query → Run.
--  Aman dijalankan ulang.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABEL SISWA
-- ---------------------------------------------------------------------------
create table if not exists students (
  id         uuid primary key default gen_random_uuid(),
  nama       text not null,
  kelas      text not null,
  nis        text,
  created_at timestamptz not null default now()
);
create index if not exists idx_students_kelas on students (kelas);
create index if not exists idx_students_nama  on students (nama);

-- Relasi booking ⇄ siswa (siapa saja yang ke lab)
create table if not exists booking_students (
  booking_id uuid references bookings(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  primary key (booking_id, student_id)
);
create index if not exists idx_bookstud_booking on booking_students (booking_id);

-- View daftar kelas unik (untuk filter, ringan)
create or replace view student_classes as
  select distinct kelas from students order by kelas;

-- ---------------------------------------------------------------------------
-- 2. FUNGSI create_booking versi baru (menerima daftar siswa)
--    Jumlah peserta = jumlah siswa terpilih (bila ada), jika tidak pakai p_peserta.
-- ---------------------------------------------------------------------------
drop function if exists create_booking(uuid,uuid,date,time,time,int,text,text,jsonb);

create or replace function create_booking(
  p_lab uuid, p_guru uuid, p_tanggal date, p_mulai time, p_selesai time,
  p_peserta int, p_kelas text, p_keperluan text,
  p_equipment jsonb default '[]'::jsonb,
  p_students  jsonb default '[]'::jsonb
) returns bookings
language plpgsql security definer set search_path = public as $$
declare
  v_kap       int;
  v_status    lab_status;
  v_terpakai  int;
  v_peserta   int;
  v_booking   bookings;
  v_item      jsonb;
begin
  select kapasitas, status into v_kap, v_status from laboratories where id = p_lab;
  if v_kap is null then raise exception 'Laboratorium tidak ditemukan'; end if;
  if v_status in ('maintenance','ditutup') then
    raise exception 'Laboratorium sedang % — tidak dapat dibooking', v_status;
  end if;
  if p_selesai <= p_mulai then raise exception 'Jam selesai harus setelah jam mulai'; end if;

  -- peserta = jumlah siswa terpilih bila ada, jika tidak pakai input manual
  v_peserta := coalesce(nullif(jsonb_array_length(coalesce(p_students,'[]'::jsonb)), 0), p_peserta);
  if v_peserta is null or v_peserta <= 0 then raise exception 'Jumlah peserta tidak valid'; end if;
  if v_peserta > v_kap then
    raise exception 'Jumlah peserta (%) melebihi kapasitas lab (%)', v_peserta, v_kap;
  end if;

  v_terpakai := peserta_terpakai(p_lab, p_tanggal, p_mulai, p_selesai, null);
  if v_terpakai + v_peserta > v_kap then
    raise exception 'Kapasitas terlampaui: sudah % dari % peserta pada rentang waktu itu (sisa % kursi)',
      v_terpakai, v_kap, greatest(v_kap - v_terpakai, 0);
  end if;

  insert into bookings(lab_id,guru_id,tanggal,jam_mulai,jam_selesai,jumlah_peserta,kelas,keperluan,status)
  values (p_lab,p_guru,p_tanggal,p_mulai,p_selesai,v_peserta,p_kelas,p_keperluan,'menunggu')
  returning * into v_booking;

  for v_item in select * from jsonb_array_elements(coalesce(p_equipment,'[]'::jsonb)) loop
    insert into booking_equipment(booking_id,equipment_id,jumlah)
    values (v_booking.id, (v_item->>'equipment_id')::uuid, coalesce((v_item->>'jumlah')::int,1))
    on conflict do nothing;
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_students,'[]'::jsonb)) loop
    insert into booking_students(booking_id, student_id)
    values (v_booking.id, (v_item#>>'{}')::uuid)
    on conflict do nothing;
  end loop;

  return v_booking;
end $$;

-- ---------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY untuk tabel baru
-- ---------------------------------------------------------------------------
alter table students         enable row level security;
alter table booking_students enable row level security;

do $$
declare t text;
begin
  foreach t in array array['students','booking_students'] loop
    execute format('drop policy if exists p_sel_%1$s on %1$s;', t);
    execute format('create policy p_sel_%1$s on %1$s for select using (true);', t);
    execute format('drop policy if exists p_ins_%1$s on %1$s;', t);
    execute format('create policy p_ins_%1$s on %1$s for insert to authenticated with check (true);', t);
    execute format('drop policy if exists p_upd_%1$s on %1$s;', t);
    execute format('create policy p_upd_%1$s on %1$s for update to authenticated using (true) with check (true);', t);
    execute format('drop policy if exists p_del_%1$s on %1$s;', t);
    execute format('create policy p_del_%1$s on %1$s for delete to authenticated using (true);', t);
  end loop;
end $$;

grant select on student_classes to anon, authenticated;
grant execute on function create_booking(uuid,uuid,date,time,time,int,text,text,jsonb,jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. CONTOH DATA SISWA (opsional — hapus bila mau langsung import sendiri)
-- ---------------------------------------------------------------------------
insert into students (nama, kelas, nis) values
  ('Andi Pratama',   'X IPA 1', '2024001'),
  ('Bella Safitri',  'X IPA 1', '2024002'),
  ('Citra Dewanti',  'X IPA 2', '2024003'),
  ('Dimas Nugroho',  'XI IPA 1', '2023001'),
  ('Eka Putri',      'XI IPA 1', '2023002'),
  ('Fajar Ramadhan', 'XII IPA 1', '2022001')
on conflict do nothing;

-- ============================================================================
--  SELESAI v2.
-- ============================================================================
