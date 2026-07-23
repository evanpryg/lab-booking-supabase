-- ============================================================================
--  Sistem Manajemen Laboratorium Sekolah — Skema Database (Supabase / Postgres)
--  Jalankan seluruh isi file ini di:  Supabase Dashboard → SQL Editor → New query
--  Aman dijalankan ulang (idempotent sebisa mungkin).
-- ============================================================================

-- Ekstensi untuk UUID
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. TIPE ENUM
-- ---------------------------------------------------------------------------
do $$ begin
  create type lab_status as enum ('tersedia','maintenance','ditutup');
exception when duplicate_object then null; end $$;

do $$ begin
  -- status 'dipakai' TIDAK disimpan; dihitung otomatis dari waktu + booking
  create type booking_status as enum ('menunggu','disetujui','ditolak','dibatalkan','selesai');
exception when duplicate_object then null; end $$;

do $$ begin
  create type equipment_condition as enum ('baik','rusak_ringan','rusak_berat');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. TABEL
-- ---------------------------------------------------------------------------
create table if not exists gurus (
  id         uuid primary key default gen_random_uuid(),
  nama       text not null,
  nip        text,
  mapel      text,
  created_at timestamptz not null default now()
);
create index if not exists idx_gurus_nama on gurus (nama);

create table if not exists laboratories (
  id         uuid primary key default gen_random_uuid(),
  nama       text not null,
  kode       text unique,
  kapasitas  int  not null default 30,
  lokasi     text,
  status     lab_status not null default 'tersedia',
  deskripsi  text,
  created_at timestamptz not null default now()
);

create table if not exists equipment (
  id         uuid primary key default gen_random_uuid(),
  lab_id     uuid references laboratories(id) on delete cascade,
  nama       text not null,
  kode       text,
  jumlah     int  not null default 1,
  kondisi    equipment_condition not null default 'baik',
  created_at timestamptz not null default now()
);
create index if not exists idx_equipment_lab on equipment (lab_id);

create table if not exists bookings (
  id              uuid primary key default gen_random_uuid(),
  lab_id          uuid not null references laboratories(id) on delete cascade,
  guru_id         uuid not null references gurus(id) on delete cascade,
  tanggal         date not null,
  jam_mulai       time not null,
  jam_selesai     time not null,
  jumlah_peserta  int  not null,
  kelas           text,
  keperluan       text,
  status          booking_status not null default 'menunggu',
  alasan_penolakan text,
  created_at      timestamptz not null default now(),
  constraint chk_jam  check (jam_selesai > jam_mulai),
  constraint chk_pst  check (jumlah_peserta > 0)
);
create index if not exists idx_bookings_lab_tgl on bookings (lab_id, tanggal);
create index if not exists idx_bookings_guru    on bookings (guru_id);
create index if not exists idx_bookings_status  on bookings (status);

create table if not exists booking_equipment (
  booking_id   uuid references bookings(id)  on delete cascade,
  equipment_id uuid references equipment(id) on delete cascade,
  jumlah       int not null default 1,
  primary key (booking_id, equipment_id)
);

create table if not exists settings (
  key   text primary key,
  value text
);
insert into settings(key,value) values ('kapasitas_max','30')
  on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 3. FUNGSI VALIDASI KAPASITAS / OVERLAP
--    Menghitung total peserta booking DISETUJUI yang waktunya tumpang tindih.
-- ---------------------------------------------------------------------------
create or replace function peserta_terpakai(
  p_lab uuid, p_tanggal date, p_mulai time, p_selesai time, p_exclude uuid default null
) returns int language sql stable as $$
  select coalesce(sum(jumlah_peserta),0)::int
  from bookings
  where lab_id = p_lab
    and tanggal = p_tanggal
    and status  = 'disetujui'
    and (p_exclude is null or id <> p_exclude)
    and jam_mulai  < p_selesai   -- overlap: A.mulai < B.selesai
    and jam_selesai > p_mulai;   --      dan A.selesai > B.mulai
$$;

-- Membuat booking baru + validasi. SECURITY DEFINER agar guru (anon) bisa
-- membuat booking tanpa bisa menembus aturan RLS lain.
create or replace function create_booking(
  p_lab uuid, p_guru uuid, p_tanggal date, p_mulai time, p_selesai time,
  p_peserta int, p_kelas text, p_keperluan text, p_equipment jsonb default '[]'::jsonb
) returns bookings
language plpgsql security definer set search_path = public as $$
declare
  v_kap       int;
  v_status    lab_status;
  v_terpakai  int;
  v_booking   bookings;
  v_item      jsonb;
begin
  select kapasitas, status into v_kap, v_status from laboratories where id = p_lab;
  if v_kap is null then raise exception 'Laboratorium tidak ditemukan'; end if;
  if v_status in ('maintenance','ditutup') then
    raise exception 'Laboratorium sedang % — tidak dapat dibooking', v_status;
  end if;
  if p_selesai <= p_mulai then raise exception 'Jam selesai harus setelah jam mulai'; end if;
  if p_peserta <= 0 then raise exception 'Jumlah peserta tidak valid'; end if;
  if p_peserta > v_kap then
    raise exception 'Jumlah peserta (%) melebihi kapasitas lab (%)', p_peserta, v_kap;
  end if;

  v_terpakai := peserta_terpakai(p_lab, p_tanggal, p_mulai, p_selesai, null);
  if v_terpakai + p_peserta > v_kap then
    raise exception 'Kapasitas terlampaui: sudah % dari % peserta pada rentang waktu itu (sisa % kursi)',
      v_terpakai, v_kap, greatest(v_kap - v_terpakai, 0);
  end if;

  insert into bookings(lab_id,guru_id,tanggal,jam_mulai,jam_selesai,jumlah_peserta,kelas,keperluan,status)
  values (p_lab,p_guru,p_tanggal,p_mulai,p_selesai,p_peserta,p_kelas,p_keperluan,'menunggu')
  returning * into v_booking;

  for v_item in select * from jsonb_array_elements(coalesce(p_equipment,'[]'::jsonb)) loop
    insert into booking_equipment(booking_id,equipment_id,jumlah)
    values (v_booking.id, (v_item->>'equipment_id')::uuid, coalesce((v_item->>'jumlah')::int,1))
    on conflict do nothing;
  end loop;

  return v_booking;
end $$;

-- Guru membatalkan booking miliknya (hanya yang masih menunggu/disetujui).
create or replace function cancel_booking(p_booking uuid, p_guru uuid)
returns bookings language plpgsql security definer set search_path = public as $$
declare v_b bookings;
begin
  update bookings set status='dibatalkan'
  where id=p_booking and guru_id=p_guru and status in ('menunggu','disetujui')
  returning * into v_b;
  if v_b.id is null then raise exception 'Booking tidak dapat dibatalkan'; end if;
  return v_b;
end $$;

-- Cek ulang kapasitas saat admin menyetujui (mencegah dua pending saling melebihi).
create or replace function check_capacity_on_approve() returns trigger
language plpgsql as $$
declare v_kap int; v_terpakai int;
begin
  if new.status = 'disetujui' and old.status is distinct from 'disetujui' then
    select kapasitas into v_kap from laboratories where id = new.lab_id;
    v_terpakai := peserta_terpakai(new.lab_id, new.tanggal, new.jam_mulai, new.jam_selesai, new.id);
    if v_terpakai + new.jumlah_peserta > v_kap then
      raise exception 'Tidak dapat menyetujui — kapasitas penuh (sisa % kursi)', greatest(v_kap - v_terpakai,0);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_check_capacity on bookings;
create trigger trg_check_capacity before update on bookings
for each row execute function check_capacity_on_approve();

-- ---------------------------------------------------------------------------
-- 4. VIEW: status lab efektif (menghitung 'dipakai' otomatis, zona Asia/Jakarta)
-- ---------------------------------------------------------------------------
create or replace view lab_status_view as
select
  l.*,
  case
    when l.status in ('maintenance','ditutup') then l.status::text
    when exists (
      select 1 from bookings b
      where b.lab_id = l.id
        and b.status = 'disetujui'
        and b.tanggal = (now() at time zone 'Asia/Jakarta')::date
        and (now() at time zone 'Asia/Jakarta')::time between b.jam_mulai and b.jam_selesai
    ) then 'dipakai'
    else 'tersedia'
  end as status_efektif
from laboratories l;

-- ---------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
--    Baca: publik.  Ubah data master & status booking: hanya admin (login).
--    Buat booking: lewat RPC create_booking (aman).  Batal: lewat cancel_booking.
-- ---------------------------------------------------------------------------
alter table gurus             enable row level security;
alter table laboratories      enable row level security;
alter table equipment         enable row level security;
alter table bookings          enable row level security;
alter table booking_equipment enable row level security;
alter table settings          enable row level security;

-- Helper: buat policy hanya jika belum ada
do $$
declare t text;
begin
  -- SELECT publik untuk semua tabel
  foreach t in array array['gurus','laboratories','equipment','bookings','booking_equipment','settings'] loop
    execute format('drop policy if exists p_sel_%1$s on %1$s;', t);
    execute format('create policy p_sel_%1$s on %1$s for select using (true);', t);
    -- Admin (authenticated) boleh INSERT/UPDATE/DELETE
    execute format('drop policy if exists p_ins_%1$s on %1$s;', t);
    execute format('create policy p_ins_%1$s on %1$s for insert to authenticated with check (true);', t);
    execute format('drop policy if exists p_upd_%1$s on %1$s;', t);
    execute format('create policy p_upd_%1$s on %1$s for update to authenticated using (true) with check (true);', t);
    execute format('drop policy if exists p_del_%1$s on %1$s;', t);
    execute format('create policy p_del_%1$s on %1$s for delete to authenticated using (true);', t);
  end loop;
end $$;

-- Izinkan anon & authenticated memanggil RPC booking
grant execute on function create_booking(uuid,uuid,date,time,time,int,text,text,jsonb) to anon, authenticated;
grant execute on function cancel_booking(uuid,uuid) to anon, authenticated;
grant execute on function peserta_terpakai(uuid,date,time,time,uuid) to anon, authenticated;
grant select on lab_status_view to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. DATA AWAL (SEED)
-- ---------------------------------------------------------------------------
insert into laboratories (nama, kode, kapasitas, lokasi, status, deskripsi) values
  ('Lab Komputer 1', 'LK1',  30, 'Gedung A Lt. 2', 'tersedia', 'Lab komputer utama, 30 PC'),
  ('Lab Komputer 2', 'LK2',  30, 'Gedung A Lt. 2', 'tersedia', 'Lab komputer cadangan'),
  ('Lab IPA',        'LIPA', 30, 'Gedung B Lt. 1', 'tersedia', 'Lab Fisika/Kimia/Biologi'),
  ('Lab Bahasa',     'LBHS', 30, 'Gedung A Lt. 3', 'tersedia', 'Lab bahasa dengan headset')
on conflict (kode) do nothing;

insert into gurus (nama, nip, mapel) values
  ('Budi Santoso, S.Pd.',      '198501012010011001', 'Matematika'),
  ('Siti Aminah, S.Kom.',      '198702022011012002', 'Informatika'),
  ('Ahmad Fauzi, M.Pd.',       '198003032008011003', 'Fisika'),
  ('Dewi Lestari, S.Pd.',      '199004042015012004', 'Bahasa Inggris'),
  ('Rudi Hartono, S.Pd.',      '198806052012011005', 'Kimia'),
  ('Nur Halimah, S.Pd.',       '199107072016012006', 'Biologi')
on conflict do nothing;

-- Contoh equipment (dikaitkan ke Lab Komputer 1)
insert into equipment (lab_id, nama, kode, jumlah, kondisi)
select id, 'PC Desktop', 'PC-LK1', 30, 'baik' from laboratories where kode='LK1'
on conflict do nothing;
insert into equipment (lab_id, nama, kode, jumlah, kondisi)
select id, 'Proyektor', 'PRJ-LK1', 1, 'baik' from laboratories where kode='LK1'
on conflict do nothing;

-- ============================================================================
--  SELESAI. Selanjutnya buat user admin di:
--  Authentication → Users → Add user  (email + password), lalu MATIKAN
--  "Allow new users to sign up" di Authentication → Providers → Email.
-- ============================================================================
