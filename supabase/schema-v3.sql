-- ============================================================================
--  MIGRASI v3 — Dukung "Pinjam Alat Saja" (tanpa peserta / kapasitas)
--  Jalankan SETELAH schema.sql & schema-v2.sql. Aman dijalankan ulang.
-- ============================================================================

-- 1. Kolom tipe booking: 'lab' (pakai lab) atau 'alat' (pinjam alat saja)
alter table bookings add column if not exists tipe text not null default 'lab';

-- 2. Peserta boleh kosong untuk peminjaman alat saja
alter table bookings alter column jumlah_peserta drop not null;
-- (CHECK jumlah_peserta > 0 tetap ada; NULL diperbolehkan oleh CHECK)

-- 3. Peserta terpakai hanya menghitung booking tipe 'lab' (alat tidak makan kursi)
create or replace function peserta_terpakai(
  p_lab uuid, p_tanggal date, p_mulai time, p_selesai time, p_exclude uuid default null
) returns int language sql stable as $$
  select coalesce(sum(jumlah_peserta),0)::int
  from bookings
  where lab_id = p_lab
    and tanggal = p_tanggal
    and status  = 'disetujui'
    and tipe    = 'lab'
    and (p_exclude is null or id <> p_exclude)
    and jam_mulai  < p_selesai
    and jam_selesai > p_mulai;
$$;

-- 4. create_booking versi baru dengan parameter p_tipe
drop function if exists create_booking(uuid,uuid,date,time,time,int,text,text,jsonb,jsonb);

create or replace function create_booking(
  p_lab uuid, p_guru uuid, p_tanggal date, p_mulai time, p_selesai time,
  p_peserta int, p_kelas text, p_keperluan text,
  p_equipment jsonb default '[]'::jsonb,
  p_students  jsonb default '[]'::jsonb,
  p_tipe text default 'lab'
) returns bookings
language plpgsql security definer set search_path = public as $$
declare
  v_kap int; v_status lab_status; v_terpakai int; v_peserta int; v_booking bookings; v_item jsonb;
begin
  select kapasitas, status into v_kap, v_status from laboratories where id = p_lab;
  if v_kap is null then raise exception 'Laboratorium tidak ditemukan'; end if;
  if p_selesai <= p_mulai then raise exception 'Jam selesai harus setelah jam mulai'; end if;
  if p_keperluan is null or btrim(p_keperluan) = '' then raise exception 'Keperluan wajib diisi'; end if;

  if p_tipe = 'alat' then
    -- Peminjaman alat saja: wajib ada alat, tanpa peserta & tanpa cek kapasitas
    if coalesce(jsonb_array_length(coalesce(p_equipment,'[]'::jsonb)), 0) = 0 then
      raise exception 'Pilih minimal 1 alat untuk dipinjam';
    end if;
    v_peserta := null;
  else
    -- Pakai lab: validasi peserta & kapasitas
    if v_status in ('maintenance','ditutup') then
      raise exception 'Laboratorium sedang % — tidak dapat dibooking', v_status;
    end if;
    v_peserta := coalesce(nullif(jsonb_array_length(coalesce(p_students,'[]'::jsonb)), 0), p_peserta);
    if v_peserta is null or v_peserta <= 0 then raise exception 'Jumlah peserta tidak valid'; end if;
    if v_peserta > v_kap then
      raise exception 'Jumlah peserta (%) melebihi kapasitas lab (%)', v_peserta, v_kap;
    end if;
    v_terpakai := peserta_terpakai(p_lab, p_tanggal, p_mulai, p_selesai, null);
    if v_terpakai + v_peserta > v_kap then
      raise exception 'Kapasitas terlampaui: sudah % dari % peserta (sisa % kursi)',
        v_terpakai, v_kap, greatest(v_kap - v_terpakai, 0);
    end if;
  end if;

  insert into bookings(lab_id,guru_id,tanggal,jam_mulai,jam_selesai,jumlah_peserta,kelas,keperluan,status,tipe)
  values (p_lab,p_guru,p_tanggal,p_mulai,p_selesai,v_peserta,p_kelas,p_keperluan,'menunggu',p_tipe)
  returning * into v_booking;

  for v_item in select * from jsonb_array_elements(coalesce(p_equipment,'[]'::jsonb)) loop
    insert into booking_equipment(booking_id,equipment_id,jumlah)
    values (v_booking.id, (v_item->>'equipment_id')::uuid, coalesce((v_item->>'jumlah')::int,1))
    on conflict do nothing;
  end loop;

  if p_tipe <> 'alat' then
    for v_item in select * from jsonb_array_elements(coalesce(p_students,'[]'::jsonb)) loop
      insert into booking_students(booking_id, student_id)
      values (v_booking.id, (v_item#>>'{}')::uuid) on conflict do nothing;
    end loop;
  end if;

  return v_booking;
end $$;

-- 5. Trigger approve: cek kapasitas hanya untuk booking tipe 'lab'
create or replace function check_capacity_on_approve() returns trigger
language plpgsql as $$
declare v_kap int; v_terpakai int;
begin
  if new.status = 'disetujui' and old.status is distinct from 'disetujui' and new.tipe = 'lab' then
    select kapasitas into v_kap from laboratories where id = new.lab_id;
    v_terpakai := peserta_terpakai(new.lab_id, new.tanggal, new.jam_mulai, new.jam_selesai, new.id);
    if v_terpakai + new.jumlah_peserta > v_kap then
      raise exception 'Tidak dapat menyetujui — kapasitas penuh (sisa % kursi)', greatest(v_kap - v_terpakai,0);
    end if;
  end if;
  return new;
end $$;

-- 6. Status "dipakai" hanya dari booking tipe 'lab'
create or replace view lab_status_view as
select
  l.*,
  case
    when l.status in ('maintenance','ditutup') then l.status::text
    when exists (
      select 1 from bookings b
      where b.lab_id = l.id
        and b.status = 'disetujui'
        and b.tipe = 'lab'
        and b.tanggal = (now() at time zone 'Asia/Jakarta')::date
        and (now() at time zone 'Asia/Jakarta')::time between b.jam_mulai and b.jam_selesai
    ) then 'dipakai'
    else 'tersedia'
  end as status_efektif
from laboratories l;

grant select on lab_status_view to anon, authenticated;
grant execute on function create_booking(uuid,uuid,date,time,time,int,text,text,jsonb,jsonb,text) to anon, authenticated;

-- ============================================================================
--  SELESAI v3.
-- ============================================================================
