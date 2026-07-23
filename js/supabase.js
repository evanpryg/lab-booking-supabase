// ============================================================================
//  Klien Supabase + lapisan akses data (semua query terpusat di sini)
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const isConfigured =
  SUPABASE_URL.startsWith('http') && !SUPABASE_ANON_KEY.startsWith('GANTI');

// Saat belum dikonfigurasi, pakai URL placeholder yang valid agar createClient
// tidak melempar error (aplikasi akan menampilkan layar "Belum dikonfigurasi").
export const supabase = createClient(
  isConfigured ? SUPABASE_URL : 'https://placeholder.supabase.co',
  isConfigured ? SUPABASE_ANON_KEY : 'placeholder-anon-key',
);

// ---- AUTH (admin) ----------------------------------------------------------
export const auth = {
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  session: async () => (await supabase.auth.getSession()).data.session,
  onChange: (cb) => supabase.auth.onAuthStateChange((_e, s) => cb(s)),
};

// ---- DATA ------------------------------------------------------------------
export const db = {
  // Gurus
  gurus: () => supabase.from('gurus').select('*').order('nama'),
  guru: (id) => supabase.from('gurus').select('*').eq('id', id).single(),
  createGuru: (row) => supabase.from('gurus').insert(row).select().single(),
  updateGuru: (id, row) => supabase.from('gurus').update(row).eq('id', id).select().single(),
  deleteGuru: (id) => supabase.from('gurus').delete().eq('id', id),

  // Laboratories
  labs: () => supabase.from('laboratories').select('*').order('nama'),
  labsStatus: () => supabase.from('lab_status_view').select('*').order('nama'),
  createLab: (row) => supabase.from('laboratories').insert(row).select().single(),
  updateLab: (id, row) => supabase.from('laboratories').update(row).eq('id', id).select().single(),
  deleteLab: (id) => supabase.from('laboratories').delete().eq('id', id),

  // Equipment
  equipment: () => supabase.from('equipment').select('*, laboratories(nama)').order('nama'),
  equipmentByLab: (labId) => supabase.from('equipment').select('*').eq('lab_id', labId).order('nama'),
  createEquipment: (row) => supabase.from('equipment').insert(row).select().single(),
  updateEquipment: (id, row) => supabase.from('equipment').update(row).eq('id', id).select().single(),
  deleteEquipment: (id) => supabase.from('equipment').delete().eq('id', id),

  // Bookings
  bookings: (filter = {}) => {
    let q = supabase
      .from('bookings')
      .select('*, laboratories(nama,kode), gurus(nama)')
      .order('tanggal', { ascending: false })
      .order('jam_mulai');
    if (filter.status) q = q.eq('status', filter.status);
    if (filter.guru_id) q = q.eq('guru_id', filter.guru_id);
    return q;
  },
  bookingEquipment: (bookingId) =>
    supabase.from('booking_equipment').select('*, equipment(nama)').eq('booking_id', bookingId),
  approvedForCalendar: () =>
    supabase.from('bookings').select('*, laboratories(nama,kode), gurus(nama)')
      .in('status', ['disetujui', 'selesai']),

  // RPC
  createBooking: (p) =>
    supabase.rpc('create_booking', {
      p_lab: p.lab_id, p_guru: p.guru_id, p_tanggal: p.tanggal,
      p_mulai: p.jam_mulai, p_selesai: p.jam_selesai, p_peserta: p.jumlah_peserta,
      p_kelas: p.kelas || null, p_keperluan: p.keperluan || null,
      p_equipment: p.equipment || [],
    }),
  cancelBooking: (bookingId, guruId) =>
    supabase.rpc('cancel_booking', { p_booking: bookingId, p_guru: guruId }),
  setBookingStatus: (id, status, alasan = null) =>
    supabase.from('bookings').update({ status, alasan_penolakan: alasan }).eq('id', id).select().single(),
};
