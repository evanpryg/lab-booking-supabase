-- ============================================================================
--  MIGRASI v4 — "Pinjam Alat Saja" tanpa memilih lab
--  Jalankan SETELAH schema-v3.sql. Aman dijalankan ulang.
-- ============================================================================

-- Lab tidak wajib untuk peminjaman alat saja
alter table bookings alter column lab_id drop not null;

-- create_booking: lab hanya wajib untuk tipe 'lab'
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
  if p_selesai <= p_mulai then raise exception 'Jam selesai harus setelah jam mulai'; end if;
  if p_keperluan is null or btrim(p_keperluan) = '' then raise exception 'Keperluan wajib diisi'; end if;

  if p_tipe = 'alat' then
    -- Peminjaman alat saja: tanpa lab, tanpa peserta, tanpa cek kapasitas
    if coalesce(jsonb_array_length(coalesce(p_equipment,'[]'::jsonb)), 0) = 0 then
      raise exception 'Pilih minimal 1 alat untuk dipinjam';
    end if;
    v_peserta := null;
  else
    -- Pakai lab: lab & peserta wajib, cek kapasitas
    if p_lab is null then raise exception 'Laboratorium wajib dipilih'; end if;
    select kapasitas, status into v_kap, v_status from laboratories where id = p_lab;
    if v_kap is null then raise exception 'Laboratorium tidak ditemukan'; end if;
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

grant execute on function create_booking(uuid,uuid,date,time,time,int,text,text,jsonb,jsonb,text) to anon, authenticated;

-- ============================================================================
--  SELESAI v4.
-- ============================================================================
