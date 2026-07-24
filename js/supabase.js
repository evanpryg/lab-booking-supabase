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
  equipmentUsage: (fromDate) =>
    supabase.from('equipment_usage').select('*').gte('tanggal', fromDate)
      .order('tanggal').order('jam_mulai'),
  // Riwayat kondisi alat
  equipmentLogs: (equipmentId) =>
    supabase.from('equipment_logs').select('*').eq('equipment_id', equipmentId)
      .order('created_at', { ascending: false }),
  createEquipmentLog: (row) => supabase.from('equipment_logs').insert(row),
  // Peminjam terakhir sebuah alat (dari booking disetujui/selesai)
  lastBorrower: (equipmentId) =>
    supabase.from('equipment_usage_all').select('guru,tanggal').eq('equipment_id', equipmentId)
      .order('tanggal', { ascending: false }).limit(1).maybeSingle(),

  createEquipment: (row) => supabase.from('equipment').insert(row).select().single(),
  updateEquipment: (id, row) => supabase.from('equipment').update(row).eq('id', id).select().single(),
  deleteEquipment: (id) => supabase.from('equipment').delete().eq('id', id),

  // Students
  studentClasses: () => supabase.from('student_classes').select('kelas'),
  searchStudents: ({ kelas = '', q = '', limit = 40 } = {}) => {
    let x = supabase.from('students').select('id,nama,kelas,nis').order('nama').limit(limit);
    if (kelas) x = x.eq('kelas', kelas);
    if (q) x = x.ilike('nama', `%${q}%`);
    return x;
  },
  studentsPage: ({ page = 0, size = 20, q = '', kelas = '' } = {}) => {
    let x = supabase.from('students').select('*', { count: 'exact' })
      .order('kelas').order('nama').range(page * size, page * size + size - 1);
    if (kelas) x = x.eq('kelas', kelas);
    if (q) x = x.or(`nama.ilike.%${q}%,nis.ilike.%${q}%`);
    return x;
  },
  createStudent: (row) => supabase.from('students').insert(row).select().single(),
  updateStudent: (id, row) => supabase.from('students').update(row).eq('id', id).select().single(),
  deleteStudent: (id) => supabase.from('students').delete().eq('id', id),
  bulkInsertStudents: (rows) => supabase.from('students').insert(rows),
  bulkInsertEquipment: (rows) => supabase.from('equipment').insert(rows),
  bookingStudents: (bookingId) =>
    supabase.from('booking_students').select('students(nama,kelas,nis)').eq('booking_id', bookingId),

  // Bookings
  bookings: (filter = {}) => {
    let q = supabase
      .from('bookings')
      .select('*, laboratories(nama,kode), gurus(nama), booking_equipment(jumlah, equipment(nama))')
      .order('tanggal', { ascending: false })
      .order('jam_mulai');
    if (filter.status) q = q.eq('status', filter.status);
    if (filter.guru_id) q = q.eq('guru_id', filter.guru_id);
    if (filter.month) {
      const [y, m] = filter.month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      q = q.gte('tanggal', `${filter.month}-01`).lte('tanggal', `${filter.month}-${String(lastDay).padStart(2, '0')}`);
    }
    return q;
  },
  deleteBooking: (id) => supabase.from('bookings').delete().eq('id', id),

  // Settings (key/value)
  getSetting: (key) => supabase.from('settings').select('value').eq('key', key).maybeSingle(),
  setSetting: (key, value) => supabase.from('settings').upsert({ key, value }, { onConflict: 'key' }),
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
      p_students: p.students || [],
      p_tipe: p.tipe || 'lab',
    }),
  cancelBooking: (bookingId, guruId) =>
    supabase.rpc('cancel_booking', { p_booking: bookingId, p_guru: guruId }),
  setBookingStatus: (id, status, alasan = null) =>
    supabase.from('bookings').update({ status, alasan_penolakan: alasan }).eq('id', id).select().single(),
};
