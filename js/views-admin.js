// ============================================================================
//  View untuk peran ADMIN
// ============================================================================
import { db } from './supabase.js';
import * as U from './ui.js';
import { renderCalendar } from './calendar.js';
import { showStudents } from './views-guru.js';
import { exportToExcel, sheetLaporan, sheetRingkasan, downloadTemplate, pickAndParse, normKeys, chunkInsert } from './excel.js';

const Swal = window.Swal;
const reload = (fn) => fn(document.getElementById('view'));

// Gaya tombol yang dipakai berulang pada toolbar tiap halaman data
const BTN_GHOST = 'text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3.5 py-2 rounded-xl flex items-center gap-1.5';
const BTN_GREEN = 'text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 px-3.5 py-2 rounded-xl flex items-center gap-1.5';
const BTN_MAIN = 'text-sm bg-brand-600 hover:bg-brand-700 shadow-glow active:scale-95 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5';

const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const periodeLabel = (month) => {
  if (!month) return 'Semua periode';
  const [y, m] = month.split('-');
  return `${BULAN_PANJANG[Number(m) - 1]} ${y}`;
};
const cetakLabel = () => new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
const durasiMenit = (a, b) => {
  if (!a || !b) return '';
  const [h1, m1] = a.split(':').map(Number), [h2, m2] = b.split(':').map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
};

// ---- Dashboard -------------------------------------------------------------
export async function dashboard(el) {
  const [{ data: bk }, { data: labs }] = await Promise.all([db.bookings(), db.labsStatus()]);
  const rows = bk || [];
  const count = (s) => rows.filter((r) => r.status === s).length;
  const today = U.todayISO();
  const todayCount = rows.filter((r) => r.tanggal === today && ['disetujui', 'selesai', 'menunggu'].includes(r.status)).length;
  const dipakai = (labs || []).filter((l) => l.status_efektif === 'dipakai').length;
  const pending = rows.filter((r) => r.status === 'menunggu').slice(0, 6);

  el.innerHTML = `
    ${U.heroBanner({
      name: 'Administrator',
      subtitle: `${count('menunggu')} booking menunggu persetujuan Anda.`,
      actionHtml: `<a href="#/admin/bookings" class="bg-white hover:bg-brand-50 text-brand-700 font-semibold text-[13.5px] px-5 py-3 rounded-xl flex items-center gap-2 shadow-float active:scale-95 transition-all shrink-0"><i data-lucide="calendar-check" class="w-4 h-4"></i>Kelola Booking</a>`,
    })}
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      ${U.statTile('calendar-check', 'Total Booking', rows.length, 'blue')}
      ${U.statTile('clock', 'Menunggu Persetujuan', count('menunggu'), 'amber')}
      ${U.statTile('calendar-days', 'Booking Hari Ini', todayCount, 'emerald')}
      ${U.statTile('flask-conical', 'Lab Sedang Dipakai', dipakai, 'red')}
    </div>`;
  // (lanjut render bagian bawah di bawah)
  el.innerHTML += `
    <div class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <h2 class="font-semibold text-slate-900 font-display text-[17px] mb-3">Menunggu Persetujuan</h2>
        <div id="pending"></div>
      </div>
      <div>
        <h2 class="font-semibold text-slate-900 font-display text-[17px] mb-3">Status Laboratorium</h2>
        <div class="space-y-2">
          ${(labs || []).map((l) => `
            <div class="bg-white rounded-xl border border-slate-200 shadow-card p-3.5 flex items-center justify-between">
              <div><p class="text-sm font-medium text-slate-700">${U.escapeHtml(l.nama)}</p>
              <p class="text-[11px] text-slate-400">${U.escapeHtml(l.lokasi || '')}</p></div>
              ${U.labBadge(l.status_efektif)}
            </div>`).join('')}
        </div>
      </div>
    </div>`;
  paintAdminBookings(document.getElementById('pending'), pending, dashboard);
  U.icons();
}

// ---- Manajemen Booking -----------------------------------------------------
const FILTERS = [['', 'Semua'], ['menunggu', 'Menunggu'], ['disetujui', 'Disetujui'], ['selesai', 'Selesai'], ['ditolak', 'Ditolak'], ['dibatalkan', 'Dibatalkan']];

export async function bookings(el, status = '', month) {
  if (month === undefined) month = U.todayISO().slice(0, 7); // default: bulan berjalan
  const filter = {};
  if (status) filter.status = status;
  if (month) filter.month = month;
  const { data, error } = await db.bookings(filter);
  if (error) throw error;
  el.innerHTML = `
    <div class="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-5">
      <div class="flex gap-2 flex-wrap min-w-0">
        ${FILTERS.map(([v, l]) => `<button data-f="${v}" class="filter px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all
          ${v === status ? 'bg-brand-600 text-white shadow-glow' : 'bg-white border border-slate-200 text-slate-500 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200'}">${l}</button>`).join('')}
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <input type="month" id="month" value="${month}" class="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/12">
        <button id="allmonth" class="px-3.5 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap border transition-all ${month ? 'bg-white border-slate-200 text-slate-500 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200' : 'bg-brand-600 border-brand-600 text-white shadow-glow'}">Semua bulan</button>
        <button id="export-booking" class="px-3.5 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all flex items-center gap-1.5"><i data-lucide="file-spreadsheet" class="w-4 h-4"></i>Ekspor Laporan</button>
      </div>
    </div>
    <div id="list"></div>`;
  el.querySelectorAll('.filter').forEach((b) => b.addEventListener('click', () => bookings(el, b.dataset.f, month)));
  el.querySelector('#month').addEventListener('change', (e) => bookings(el, status, e.target.value));
  el.querySelector('#allmonth').addEventListener('click', () => bookings(el, status, month ? '' : U.todayISO().slice(0, 7)));
  el.querySelector('#export-booking').addEventListener('click', () => exportLaporan(status, month));
  paintAdminBookings(document.getElementById('list'), data || [], () => bookings(el, status, month));
  U.icons();
}

// ---- Ekspor Laporan Excel --------------------------------------------------
//  Dua laporan yang dimaksud sekolah: peminjaman LAB dan peminjaman ALAT/BAHAN.
//  Tiap laporan punya lembar "Ringkasan" (kop + rekap) dan lembar rinciannya.
// ----------------------------------------------------------------------------
const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const hariLabel = (d) => {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return NAMA_HARI[new Date(y, m - 1, day).getDay()];
};
const kapital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
// Tanggal dikirim sebagai objek Date agar jadi sel tanggal Excel asli.
const tglExcel = (d) => {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
};
const alatRingkas = (b) =>
  (b.booking_equipment || [])
    .map((be) => `${be.equipment?.nama || 'Alat'} ×${be.jumlah} ${be.equipment?.satuan || 'pcs'}`)
    .join('; ') || '-';

/** Baris keterangan di bawah judul laporan. */
const metaLaporan = (status, month) =>
  `Periode: ${periodeLabel(month)}   •   Status: ${status ? kapital(status) : 'Semua status'}   •   Dicetak: ${cetakLabel()}`;

/** Kelompokkan array menjadi Map(kunci → array baris). */
function groupBy(rows, keyFn) {
  const m = new Map();
  rows.forEach((r) => {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  });
  return m;
}

// Kolom ditulis eksplisit — [judul, lebar, perataan] — agar baris judul tetap
// muncul walau datanya kosong, dan lebar kolomnya sudah pas tanpa perlu diatur
// ulang oleh admin. Perataan: left | center | right | wrap.
const COLS_LAB = [
  ['No', 5, 'center'], ['Tanggal', 12, 'date'], ['Hari', 9, 'center'],
  ['Jam Mulai', 9.5, 'center'], ['Jam Selesai', 10.5, 'center'], ['Durasi (menit)', 9, 'right'],
  ['Laboratorium', 20, 'left'], ['Kode Lab', 9, 'center'], ['Guru', 26, 'left'],
  ['Kelas', 12, 'center'], ['Jumlah Peserta', 9, 'right'], ['Keperluan', 30, 'wrap'],
  ['Alat yang Dipakai', 32, 'wrap'], ['Status', 12, 'center'], ['Alasan Penolakan', 26, 'wrap'],
];
const COLS_ALAT = [
  ['No', 5, 'center'], ['Tanggal', 12, 'date'], ['Hari', 9, 'center'],
  ['Jam Mulai', 9.5, 'center'], ['Jam Selesai', 10.5, 'center'], ['Guru', 26, 'left'],
  ['Jenis Peminjaman', 19, 'left'], ['Laboratorium', 18, 'left'], ['Nama Alat/Bahan', 28, 'left'],
  ['Jumlah Pinjam', 9, 'right'], ['Satuan', 9, 'center'], ['Kelas', 12, 'center'],
  ['Keperluan', 28, 'wrap'], ['Status', 12, 'center'], ['Alasan Penolakan', 24, 'wrap'],
];
const COLS_INVENTARIS = [
  ['No', 5, 'center'], ['Nama Alat/Bahan', 30, 'left'], ['Kode', 12, 'center'],
  ['Laboratorium', 20, 'left'], ['Satuan', 10, 'center'], ['Jumlah Total', 11, 'right'],
  ['Kondisi Baik', 11, 'right'], ['Siap Pakai', 11, 'right'], ['Rusak Ringan', 11, 'right'],
  ['Rusak Berat', 11, 'right'], ['Hilang', 10, 'right'],
];

function sheetsLaporanLab(rows, status, month) {
  const src = rows.filter((b) => b.tipe !== 'alat');
  const data = src.map((b, i) => ({
    'No': i + 1,
    'Tanggal': tglExcel(b.tanggal),
    'Hari': hariLabel(b.tanggal),
    'Jam Mulai': U.fmtTime(b.jam_mulai),
    'Jam Selesai': U.fmtTime(b.jam_selesai),
    'Durasi (menit)': durasiMenit(b.jam_mulai, b.jam_selesai),
    'Laboratorium': b.laboratories?.nama || '-',
    'Kode Lab': b.laboratories?.kode || '-',
    'Guru': b.gurus?.nama || '-',
    'Kelas': b.kelas || '-',
    'Jumlah Peserta': b.jumlah_peserta || 0,
    'Keperluan': b.keperluan || '-',
    'Alat yang Dipakai': alatRingkas(b),
    'Status': kapital(b.status),
    'Alasan Penolakan': b.alasan_penolakan || '',
  }));

  const jam = (list) => Math.round((list.reduce((s, b) => s + (durasiMenit(b.jam_mulai, b.jam_selesai) || 0), 0) / 60) * 10) / 10;
  const perLab = groupBy(src, (b) => b.laboratories?.nama || '-');

  const ringkasan = sheetRingkasan({
    name: 'Ringkasan Lab',
    judul: 'LAPORAN PEMINJAMAN LABORATORIUM',
    meta: metaLaporan(status, month),
    angka: [
      ['Total booking laboratorium', src.length],
      ['Total peserta terlayani', src.reduce((s, b) => s + (b.jumlah_peserta || 0), 0)],
      ['Total durasi pemakaian (jam)', jam(src)],
      ['Rata-rata peserta per booking', src.length ? Math.round((src.reduce((s, b) => s + (b.jumlah_peserta || 0), 0) / src.length) * 10) / 10 : 0],
    ],
    blok: [
      {
        judul: 'REKAP PER STATUS',
        headers: ['Status', 'Jumlah Booking'],
        rows: [...groupBy(src, (b) => b.status).entries()].map(([k, v]) => [kapital(k), v.length]),
      },
      {
        judul: 'REKAP PER LABORATORIUM',
        headers: ['Laboratorium', 'Jumlah Booking', 'Total Peserta', 'Total Jam'],
        rows: [...perLab.entries()]
          .map(([k, v]) => [k, v.length, v.reduce((s, b) => s + (b.jumlah_peserta || 0), 0), jam(v)])
          .sort((a, b) => b[1] - a[1]),
      },
      {
        judul: 'REKAP PER GURU',
        headers: ['Guru', 'Jumlah Booking', 'Total Peserta'],
        rows: [...groupBy(src, (b) => b.gurus?.nama || '-').entries()]
          .map(([k, v]) => [k, v.length, v.reduce((s, b) => s + (b.jumlah_peserta || 0), 0)])
          .sort((a, b) => b[1] - a[1]),
      },
    ],
  });

  return [
    ringkasan,
    sheetLaporan({ name: 'Peminjaman Lab', judul: 'RINCIAN PEMINJAMAN LABORATORIUM', meta: metaLaporan(status, month), cols: COLS_LAB, data }),
  ];
}

function sheetsLaporanAlat(rows, status, month) {
  const src = [];
  rows.forEach((b) => {
    (b.booking_equipment || []).forEach((be) => src.push({ b, be }));
  });
  const data = src.map(({ b, be }, i) => ({
    'No': i + 1,
    'Tanggal': tglExcel(b.tanggal),
    'Hari': hariLabel(b.tanggal),
    'Jam Mulai': U.fmtTime(b.jam_mulai),
    'Jam Selesai': U.fmtTime(b.jam_selesai),
    'Guru': b.gurus?.nama || '-',
    'Jenis Peminjaman': b.tipe === 'alat' ? 'Pinjam alat saja' : 'Menyertai booking lab',
    'Laboratorium': b.laboratories?.nama || '-',
    'Nama Alat/Bahan': be.equipment?.nama || '-',
    'Jumlah Pinjam': be.jumlah || 0,
    'Satuan': be.equipment?.satuan || 'pcs',
    'Kelas': b.kelas || '-',
    'Keperluan': b.keperluan || '-',
    'Status': kapital(b.status),
    'Alasan Penolakan': b.alasan_penolakan || '',
  }));

  const perAlat = groupBy(src, (x) => x.be.equipment?.nama || '-');
  const perGuru = groupBy(src, (x) => x.b.guru_id || '-');
  const unit = (list) => list.reduce((s, x) => s + (x.be.jumlah || 0), 0);

  const ringkasan = sheetRingkasan({
    name: 'Ringkasan Alat',
    judul: 'LAPORAN PEMINJAMAN ALAT & BAHAN',
    meta: metaLaporan(status, month),
    angka: [
      ['Total transaksi peminjaman alat', src.length],
      ['Jenis alat/bahan yang dipinjam', perAlat.size],
      ['Total unit dipinjam', unit(src)],
      ['Jumlah guru peminjam', perGuru.size],
    ],
    blok: [
      {
        judul: 'REKAP PER ALAT / BAHAN',
        headers: ['Nama Alat/Bahan', 'Satuan', 'Total Unit Dipinjam', 'Frekuensi Dipinjam'],
        rows: [...perAlat.entries()]
          .map(([k, v]) => [k, v[0].be.equipment?.satuan || 'pcs', unit(v), v.length])
          .sort((a, b) => b[2] - a[2]),
      },
      {
        judul: 'REKAP PER GURU',
        headers: ['Guru', 'Frekuensi Peminjaman', 'Total Unit'],
        rows: [...perGuru.values()]
          .map((v) => [v[0].b.gurus?.nama || '-', v.length, unit(v)])
          .sort((a, b) => b[1] - a[1]),
      },
      {
        judul: 'REKAP PER STATUS',
        headers: ['Status', 'Jumlah Transaksi', 'Total Unit'],
        rows: [...groupBy(src, (x) => x.b.status).entries()].map(([k, v]) => [kapital(k), v.length, unit(v)]),
      },
    ],
  });

  return [
    ringkasan,
    sheetLaporan({ name: 'Peminjaman Alat', judul: 'RINCIAN PEMINJAMAN ALAT & BAHAN', meta: metaLaporan(status, month), cols: COLS_ALAT, data }),
  ];
}

async function exportLaporan(status, month) {
  const opt = (t, d) => `<span style="display:block;text-align:left"><b>${t}</b><br><span style="font-size:12px;color:#857E75">${d}</span></span>`;
  const { value: jenis, isConfirmed } = await Swal.fire({
    title: 'Ekspor Laporan Excel',
    html: `<p style="font-size:13px;color:#6B645C;margin:-6px 0 4px">Periode <b>${U.escapeHtml(periodeLabel(month))}</b> · status <b>${U.escapeHtml(status || 'semua')}</b><br><span style="font-size:12px;color:#A9A199">Ubah filter bulan/status di halaman ini bila ingin periode lain.</span></p>`,
    input: 'radio',
    inputOptions: {
      lab: opt('Laporan Peminjaman Lab', 'Tanggal, jam, lab, guru, kelas, peserta, status + rekap.'),
      alat: opt('Laporan Peminjaman Alat & Bahan', 'Rincian tiap alat: jumlah, satuan, peminjam + rekap.'),
      both: opt('Kedua laporan (1 berkas)', 'Empat lembar sekaligus: ringkasan & rincian keduanya.'),
    },
    inputValue: 'both',
    showCancelButton: true,
    confirmButtonText: 'Unduh',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#0F766E',
  });
  if (!isConfirmed || !jenis) return;

  Swal.fire({ title: 'Menyiapkan laporan…', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  const filter = {};
  if (status) filter.status = status;
  if (month) filter.month = month;
  const { data, error } = await db.bookings(filter);
  if (error) { Swal.close(); return U.alertError(error.message); }

  // Urutkan menaik agar laporan terbaca kronologis
  const rows = (data || []).slice().sort((a, b) =>
    a.tanggal === b.tanggal ? String(a.jam_mulai).localeCompare(String(b.jam_mulai)) : a.tanggal.localeCompare(b.tanggal));

  const adaLab = rows.some((b) => b.tipe !== 'alat');
  const adaAlat = rows.some((b) => (b.booking_equipment || []).length);
  const adaIsi = { lab: adaLab, alat: adaAlat, both: adaLab || adaAlat }[jenis];
  if (!adaIsi) { Swal.close(); return U.toast('info', 'Tidak ada data pada periode & status tersebut.'); }

  const sheets = [];
  if (jenis === 'lab' || jenis === 'both') sheets.push(...sheetsLaporanLab(rows, status, month));
  if (jenis === 'alat' || jenis === 'both') sheets.push(...sheetsLaporanAlat(rows, status, month));

  const nama = { lab: 'Laporan_Peminjaman_Lab', alat: 'Laporan_Peminjaman_Alat', both: 'Laporan_Peminjaman_Lab_dan_Alat' }[jenis];
  exportToExcel(sheets, `${nama}_${month || 'semua-periode'}.xlsx`);
  Swal.close();
  U.toast('success', 'Laporan berhasil diunduh!');
}

function paintAdminBookings(container, rows, refresh) {
  if (!rows.length) { container.innerHTML = U.emptyState('Tidak ada data booking'); return; }
  container.innerHTML = `<div class="space-y-3">${rows.map((b) => `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-card p-4">
      <div class="flex items-start gap-4">
        <div class="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center shrink-0"><i data-lucide="flask-conical" class="w-5 h-5"></i></div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="font-semibold text-slate-900 font-display text-[15.5px]">${U.bookingTitle(b)}</p>${U.bookingBadge(b.status)}${U.tipeTag(b)}
          </div>
          <p class="text-sm text-slate-500 mt-0.5">
            <i data-lucide="user" class="w-3.5 h-3.5 inline -mt-0.5"></i> ${U.escapeHtml(b.gurus?.nama || '-')} ·
            ${U.fmtDate(b.tanggal)} · ${U.fmtTime(b.jam_mulai)}–${U.fmtTime(b.jam_selesai)} · ${U.pesertaLabel(b)}${b.kelas ? ' · ' + U.escapeHtml(b.kelas) : ''}
          </p>
          ${b.keperluan ? `<p class="text-sm text-slate-400 mt-0.5">${U.escapeHtml(b.keperluan)}</p>` : ''}
          ${U.equipLine(b.booking_equipment)}
          ${b.status === 'ditolak' && b.alasan_penolakan ? `<p class="text-sm text-coral-600 mt-1">Alasan: ${U.escapeHtml(b.alasan_penolakan)}</p>` : ''}
          <div class="flex gap-2 mt-3 flex-wrap">
            ${b.tipe !== 'alat' ? `<button data-siswa="${b.id}" class="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1"><i data-lucide="users" class="w-3.5 h-3.5"></i>Lihat siswa</button>` : ''}
            ${b.status === 'menunggu' ? `
              <button data-act="disetujui" data-id="${b.id}" class="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i>Setujui</button>
              <button data-act="tolak" data-id="${b.id}" class="text-xs font-medium px-3 py-1.5 rounded-lg bg-coral-50 text-coral-700 hover:bg-coral-100 flex items-center gap-1"><i data-lucide="x" class="w-3.5 h-3.5"></i>Tolak</button>` : ''}
            ${b.status === 'disetujui' ? `
              <button data-act="selesai" data-id="${b.id}" class="text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 flex items-center gap-1"><i data-lucide="flag" class="w-3.5 h-3.5"></i>Tandai Selesai</button>` : ''}
            ${['dibatalkan', 'ditolak'].includes(b.status) ? `
              <button data-act="hapus" data-id="${b.id}" class="text-xs font-medium px-3 py-1.5 rounded-lg bg-coral-50 text-coral-700 hover:bg-coral-100 flex items-center gap-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i>Hapus</button>` : ''}
          </div>
        </div>
      </div>
    </div>`).join('')}</div>`;

  container.querySelectorAll('[data-siswa]').forEach((b) => b.addEventListener('click', () => showStudents(b.dataset.siswa)));
  container.querySelectorAll('[data-act]').forEach((btn) => btn.addEventListener('click', async () => {
    const { act, id } = btn.dataset;
    if (act === 'disetujui') {
      const r = await U.confirmAction({ title: 'Setujui booking ini?', confirmText: 'Setujui', icon: 'question' });
      if (!r.isConfirmed) return;
      const { error } = await db.setBookingStatus(id, 'disetujui');
      if (error) return U.alertError(error.message.replace(/^.*?:\s/, ''));
      U.toast('success', 'Booking disetujui');
    } else if (act === 'tolak') {
      const { value: alasan, isConfirmed } = await Swal.fire({
        title: 'Tolak booking', input: 'textarea', inputPlaceholder: 'Alasan penolakan (opsional)',
        showCancelButton: true, confirmButtonText: 'Tolak', cancelButtonText: 'Batal', confirmButtonColor: '#e11d48',
      });
      if (!isConfirmed) return;
      const { error } = await db.setBookingStatus(id, 'ditolak', alasan || null);
      if (error) return U.alertError(error.message);
      U.toast('success', 'Booking ditolak');
    } else if (act === 'selesai') {
      const { error } = await db.setBookingStatus(id, 'selesai');
      if (error) return U.alertError(error.message);
      U.toast('success', 'Ditandai selesai');
    } else if (act === 'hapus') {
      const r = await U.confirmAction({ title: 'Hapus booking ini?', text: 'Data booking akan dihapus permanen.', danger: true, confirmText: 'Hapus', icon: 'warning' });
      if (!r.isConfirmed) return;
      const { error } = await db.deleteBooking(id);
      if (error) return U.alertError(error.message);
      U.toast('success', 'Booking dihapus');
    }
    refresh();
  }));
  U.icons();
}

// ---- Kalender --------------------------------------------------------------
export async function calendar(el) { await renderCalendar(el); }

// ---- Laboratorium ----------------------------------------------------------
export async function labs(el) {
  const { data, error } = await db.labsStatus();
  if (error) throw error;
  el.innerHTML = `
    <div class="flex justify-end mb-4">
      <button id="add" class="text-sm bg-brand-600 hover:bg-brand-700 shadow-glow active:scale-95 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5"><i data-lucide="plus" class="w-4 h-4"></i>Tambah Lab</button>
    </div>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      ${(data || []).map((l) => `
        <div class="bg-white rounded-2xl border border-slate-200 shadow-card p-5">
          <div class="flex items-start justify-between">
            <div class="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 grid place-items-center"><i data-lucide="flask-conical" class="w-5 h-5"></i></div>
            ${U.labBadge(l.status_efektif)}
          </div>
          <p class="font-semibold text-slate-800 mt-3">${U.escapeHtml(l.nama)}</p>
          <p class="text-xs text-slate-400">${U.escapeHtml(l.kode || '')} · Kapasitas ${l.kapasitas} · ${U.escapeHtml(l.lokasi || '-')}</p>
          <div class="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
            <select data-status="${l.id}" class="text-xs rounded-lg border border-slate-200 px-2 py-1.5 flex-1">
              ${['tersedia', 'maintenance', 'ditutup'].map((s) => `<option value="${s}" ${l.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <button data-edit="${l.id}" class="text-slate-400 hover:text-brand-600 p-1.5"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            <button data-del="${l.id}" class="text-slate-400 hover:text-coral-700 p-1.5"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          </div>
        </div>`).join('')}
    </div>`;
  U.icons();

  el.querySelector('#add').addEventListener('click', () => labForm());
  el.querySelectorAll('[data-status]').forEach((s) => s.addEventListener('change', async () => {
    const { error } = await db.updateLab(s.dataset.status, { status: s.value });
    if (error) return U.alertError(error.message);
    U.toast('success', 'Status lab diperbarui'); reload(labs);
  }));
  el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => {
    const lab = data.find((x) => x.id === b.dataset.edit); labForm(lab);
  }));
  el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => del('Lab', () => db.deleteLab(b.dataset.del), labs)));
}

async function labForm(lab = null) {
  const { value, isConfirmed } = await Swal.fire({
    title: lab ? 'Edit Lab' : 'Tambah Lab',
    html: `
      <input id="s-nama" class="swal2-input" placeholder="Nama lab" value="${U.escapeHtml(lab?.nama || '')}">
      <input id="s-kode" class="swal2-input" placeholder="Kode (mis. LK1)" value="${U.escapeHtml(lab?.kode || '')}">
      <input id="s-kap" type="number" class="swal2-input" placeholder="Kapasitas" value="${lab?.kapasitas ?? 30}">
      <input id="s-lokasi" class="swal2-input" placeholder="Lokasi" value="${U.escapeHtml(lab?.lokasi || '')}">`,
    showCancelButton: true, confirmButtonText: 'Simpan', cancelButtonText: 'Batal', confirmButtonColor: '#0F766E',
    focusConfirm: false,
    preConfirm: () => {
      const nama = document.getElementById('s-nama').value.trim();
      if (!nama) { Swal.showValidationMessage('Nama wajib diisi'); return false; }
      return {
        nama, kode: document.getElementById('s-kode').value.trim() || null,
        kapasitas: Number(document.getElementById('s-kap').value) || 30,
        lokasi: document.getElementById('s-lokasi').value.trim() || null,
      };
    },
  });
  if (!isConfirmed) return;
  const { error } = lab ? await db.updateLab(lab.id, value) : await db.createLab(value);
  if (error) return U.alertError(error.message);
  U.toast('success', 'Tersimpan'); reload(labs);
}

// ---- Equipment -------------------------------------------------------------
export async function equipment(el) {
  const today = U.todayISO();
  const [{ data: eq, error }, { data: labs }, usageRes] = await Promise.all([
    db.equipment(), db.labs(), db.equipmentUsage(today),
  ]);
  if (error) throw error;
  const usage = usageRes?.data || []; // kosong bila view belum dibuat (schema-v5)
  const now = U.nowTime();
  const isAktif = (u) => u.tanggal === today && u.jam_mulai <= now && u.jam_selesai >= now;
  const aktif = usage.filter(isAktif);
  const terjadwal = usage.filter((u) => !isAktif(u));

  // Hitung per UNIT (bukan per jenis) — mis. total 10, rusak 1
  const unitDipinjam = aktif.reduce((s, u) => s + (u.jumlah_pinjam || 0), 0);
  const totalUnit = (eq || []).reduce((s, e) => s + U.stok(e).total, 0);
  const unitBaik = (eq || []).reduce((s, e) => s + U.stok(e).baik, 0);
  const unitBermasalah = (eq || []).reduce((s, e) => { const k = U.stok(e); return s + k.rr + k.rb + k.hl; }, 0);
  const bermasalah = (eq || []).filter((e) => { const k = U.stok(e); return k.rr + k.rb + k.hl > 0; });

  const usageRow = (u, badge) => `
    <div class="flex items-start gap-3 border-b border-slate-100 last:border-0 py-3">
      <div class="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 grid place-items-center shrink-0"><i data-lucide="wrench" class="w-4 h-4"></i></div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-slate-700 break-words">${U.escapeHtml(u.alat)} <span class="text-slate-400">×${u.jumlah_pinjam}</span></p>
        <p class="text-[11px] text-slate-400 mt-0.5">${U.escapeHtml(u.guru || '-')} · ${U.fmtDate(u.tanggal)} · ${U.fmtTime(u.jam_mulai)}–${U.fmtTime(u.jam_selesai)}${u.lab ? ' · ' + U.escapeHtml(u.lab) : ''}</p>
      </div>
      ${badge}
    </div>`;

  el.innerHTML = `
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      ${U.statTile('wrench', `Total Unit (${(eq || []).length} jenis)`, totalUnit, 'blue')}
      ${U.statTile('arrow-up-right', 'Unit Sedang Dipinjam', unitDipinjam, 'amber')}
      ${U.statTile('check-circle-2', 'Unit Kondisi Baik', unitBaik, 'emerald')}
      ${U.statTile('alert-triangle', 'Unit Rusak / Hilang', unitBermasalah, 'red')}
    </div>

    <div class="grid lg:grid-cols-2 gap-6 mb-6">
      <div>
        <h2 class="font-semibold text-slate-900 font-display text-[17px] mb-2">Sedang Dipinjam</h2>
        ${U.card(`<div class="px-4">${aktif.length ? aktif.map((u) => usageRow(u, `<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 shrink-0">Berlangsung</span>`)).join('')
          : `<p class="text-sm text-slate-400 py-6 text-center">Tidak ada alat yang sedang dipinjam.</p>`}</div>`)}
      </div>
      <div>
        <h2 class="font-semibold text-slate-900 font-display text-[17px] mb-2">Terjadwal</h2>
        ${U.card(`<div class="px-4">${terjadwal.length ? terjadwal.slice(0, 6).map((u) => usageRow(u, `<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 shrink-0">Terjadwal</span>`)).join('')
          : `<p class="text-sm text-slate-400 py-6 text-center">Belum ada jadwal peminjaman alat.</p>`}</div>`)}
      </div>
    </div>

    ${bermasalah.length ? `
      <div class="mb-6">
        <h2 class="font-semibold text-slate-900 font-display text-[17px] mb-2">Perlu Perhatian (Rusak / Hilang)</h2>
        ${U.card(`<div class="p-4 space-y-2">${bermasalah.map((e) => `
          <div class="flex items-start gap-3 flex-wrap border border-slate-200 rounded-xl px-3 py-2">
            <span class="text-sm font-medium text-slate-700">${U.escapeHtml(e.nama)}
              <span class="text-xs text-slate-400 font-normal">· total ${U.stok(e).total}</span></span>
            ${U.stokBadges(e)}
          </div>`).join('')}</div>`)}
      </div>` : ''}

    <div class="flex items-center justify-between gap-2 mb-4">
      <h2 class="font-semibold text-slate-900 font-display text-[17px]">Daftar Alat</h2>
      <div class="flex gap-2 flex-wrap justify-end">
        <button id="export-equip" class="${BTN_GREEN}"><i data-lucide="file-spreadsheet" class="w-4 h-4"></i><span class="hidden sm:inline">Ekspor Inventaris</span></button>
        <button id="tpl" class="${BTN_GHOST}"><i data-lucide="file-down" class="w-4 h-4"></i><span class="hidden sm:inline">Unduh </span>Template</button>
        <button id="import" class="${BTN_GHOST}"><i data-lucide="upload" class="w-4 h-4"></i><span class="hidden sm:inline">Import Excel/CSV</span></button>
        <button id="add" class="${BTN_MAIN}"><i data-lucide="plus" class="w-4 h-4"></i>Tambah</button>
      </div>
    </div>
    ${!eq?.length ? U.emptyState('Belum ada alat') : U.card(`
      <div class="overflow-x-auto"><table class="w-full text-sm min-w-[720px]">
        <thead class="text-left text-slate-400 border-b border-slate-200">
          <tr><th class="p-4 font-medium">Nama</th><th class="p-4 font-medium">Lab</th><th class="p-4 font-medium">Satuan</th><th class="p-4 font-medium">Total</th><th class="p-4 font-medium">Siap Pakai</th><th class="p-4 font-medium">Rincian Kondisi</th><th class="p-4"></th></tr>
        </thead>
        <tbody>${eq.map((e) => `
          <tr class="border-b border-slate-100 last:border-0">
            <td class="p-4 font-medium text-slate-700">${U.escapeHtml(e.nama)}</td>
            <td class="p-4 text-slate-500">${U.escapeHtml(e.laboratories?.nama || '-')}</td>
            <td class="p-4 text-slate-500"><span class="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">${U.escapeHtml(e.satuan || 'pcs')}</span></td>
            <td class="p-4 text-slate-500">${U.stok(e).total}</td>
            <td class="p-4 font-semibold ${U.stok(e).siap > 0 ? 'text-emerald-600' : 'text-coral-700'}">${U.stok(e).siap}</td>
            <td class="p-4">${U.stokBadges(e)}</td>
            <td class="p-4 text-right whitespace-nowrap">
              <button data-hist="${e.id}" title="Riwayat kondisi" class="text-slate-400 hover:text-brand-600 p-1.5"><i data-lucide="history" class="w-4 h-4"></i></button>
              <button data-edit="${e.id}" class="text-slate-400 hover:text-brand-600 p-1.5"><i data-lucide="pencil" class="w-4 h-4"></i></button>
              <button data-del="${e.id}" class="text-slate-400 hover:text-coral-700 p-1.5"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
          </tr>`).join('')}</tbody>
      </table></div>`)}`;
  U.icons();

  el.querySelector('#add').addEventListener('click', () => equipForm(null, labs));
  el.querySelector('#tpl').addEventListener('click', () => templateAlat(labs || []));
  el.querySelector('#import').addEventListener('click', () => importEquipment(labs));
  el.querySelector('#export-equip').addEventListener('click', () => {
    if (!eq?.length) return U.toast('info', 'Tidak ada data alat.');
    const data = eq.map((e, i) => {
      const s = U.stok(e);
      return {
        'No': i + 1, 'Nama Alat/Bahan': e.nama, 'Kode': e.kode || '-',
        'Laboratorium': e.laboratories?.nama || '-', 'Satuan': e.satuan || 'pcs',
        'Jumlah Total': s.total, 'Kondisi Baik': s.baik, 'Siap Pakai': s.siap,
        'Rusak Ringan': s.rr, 'Rusak Berat': s.rb, 'Hilang': s.hl,
      };
    });
    const meta = `Per ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}   •   ${eq.length} jenis alat/bahan`;
    const perLab = groupBy(eq, (e) => e.laboratories?.nama || '-');
    const jml = (list, f) => list.reduce((s, e) => s + f(U.stok(e)), 0);
    exportToExcel([
      sheetRingkasan({
        name: 'Ringkasan Inventaris',
        judul: 'LAPORAN INVENTARIS ALAT & BAHAN',
        meta,
        angka: [
          ['Jenis alat/bahan terdaftar', eq.length],
          ['Total unit dimiliki', jml(eq, (s) => s.total)],
          ['Unit kondisi baik', jml(eq, (s) => s.baik)],
          ['Unit siap pakai', jml(eq, (s) => s.siap)],
          ['Unit rusak / hilang', jml(eq, (s) => s.rr + s.rb + s.hl)],
        ],
        blok: [{
          judul: 'REKAP PER LABORATORIUM',
          headers: ['Laboratorium', 'Jenis Alat', 'Total Unit', 'Siap Pakai'],
          rows: [...perLab.entries()]
            .map(([k, v]) => [k, v.length, jml(v, (s) => s.total), jml(v, (s) => s.siap)])
            .sort((a, b) => b[2] - a[2]),
        }],
      }),
      sheetLaporan({ name: 'Inventaris Alat', judul: 'RINCIAN INVENTARIS ALAT & BAHAN', meta, cols: COLS_INVENTARIS, data }),
    ], `Inventaris_Alat_${U.todayISO()}.xlsx`);
    U.toast('success', 'Laporan inventaris berhasil diunduh!');
  });
  el.querySelectorAll('[data-hist]').forEach((b) => b.addEventListener('click', () => equipHistory(eq.find((x) => x.id === b.dataset.hist))));
  el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => equipForm(eq.find((x) => x.id === b.dataset.edit), labs)));
  el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => del('Alat', () => db.deleteEquipment(b.dataset.del), equipment)));
}

async function equipForm(item, labs) {
  const { value, isConfirmed } = await Swal.fire({
    title: item ? 'Edit Alat' : 'Tambah Alat',
    html: `
      <input id="s-nama" class="swal2-input" placeholder="Nama alat" value="${U.escapeHtml(item?.nama || '')}">
      <select id="s-lab" class="swal2-select">${labs.map((l) => `<option value="${l.id}" ${item?.lab_id === l.id ? 'selected' : ''}>${U.escapeHtml(l.nama)}</option>`).join('')}</select>
      <select id="s-satuan" class="swal2-select">${SATUAN_ALAT.map((s) => `<option value="${s}" ${(item?.satuan || 'pcs') === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <input id="s-jml" type="number" min="1" class="swal2-input" placeholder="Jumlah total unit" value="${item?.jumlah ?? 1}">
      <div style="display:flex;gap:8px;margin:0 1em">
        <label style="flex:1;text-align:left;font-size:12px;color:#64748b">Rusak Ringan
          <input id="s-rr" type="number" min="0" value="${item?.rusak_ringan ?? 0}" style="width:100%;padding:6px 8px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px">
        </label>
        <label style="flex:1;text-align:left;font-size:12px;color:#64748b">Rusak Berat
          <input id="s-rb" type="number" min="0" value="${item?.rusak_berat ?? 0}" style="width:100%;padding:6px 8px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px">
        </label>
        <label style="flex:1;text-align:left;font-size:12px;color:#64748b">Hilang
          <input id="s-hl" type="number" min="0" value="${item?.hilang ?? 0}" style="width:100%;padding:6px 8px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px">
        </label>
      </div>
      <p style="font-size:12px;color:#64748b;margin:6px 1em 0;text-align:left">Sisanya otomatis dihitung sebagai <b>Baik</b>. Unit <b>Rusak Berat</b> &amp; <b>Hilang</b> tidak bisa dipinjam.</p>
      <textarea id="s-catatan" class="swal2-textarea" placeholder="Catatan (bila kondisi berubah, mis. 1 unit layar pecah saat praktikum)"></textarea>`,
    showCancelButton: true, confirmButtonText: 'Simpan', cancelButtonText: 'Batal', confirmButtonColor: '#0F766E',
    focusConfirm: false,
    preConfirm: () => {
      const nama = document.getElementById('s-nama').value.trim();
      if (!nama) { Swal.showValidationMessage('Nama wajib diisi'); return false; }
      const jumlah = Number(document.getElementById('s-jml').value) || 1;
      const rr = Math.max(0, Number(document.getElementById('s-rr').value) || 0);
      const rb = Math.max(0, Number(document.getElementById('s-rb').value) || 0);
      const hl = Math.max(0, Number(document.getElementById('s-hl').value) || 0);
      if (rr + rb + hl > jumlah) {
        Swal.showValidationMessage(`Rusak + hilang (${rr + rb + hl}) melebihi jumlah total (${jumlah})`);
        return false;
      }
      return {
        nama, lab_id: document.getElementById('s-lab').value,
        satuan: document.getElementById('s-satuan').value,
        jumlah, rusak_ringan: rr, rusak_berat: rb, hilang: hl,
        _catatan: document.getElementById('s-catatan').value.trim() || null,
      };
    },
  });
  if (!isConfirmed) return;
  const catatan = value._catatan;
  delete value._catatan;

  const { error } = item ? await db.updateEquipment(item.id, value) : await db.createEquipment(value);
  if (error) return U.alertError(error.message);

  // Catat riwayat bila rincian kondisi/jumlah berubah (peminjam terakhir ikut disimpan)
  if (item) {
    const a = U.stok(item), b = U.stok(value);
    if (a.total !== b.total || a.rr !== b.rr || a.rb !== b.rb || a.hl !== b.hl) {
      const { data: last } = await db.lastBorrower(item.id);
      await db.createEquipmentLog({
        equipment_id: item.id,
        kondisi_lama: U.stokRingkas(item),
        kondisi_baru: U.stokRingkas(value),
        catatan,
        peminjam_terakhir: last?.guru || null,
        tanggal_pinjam_terakhir: last?.tanggal || null,
      });
    }
  }
  U.toast('success', 'Tersimpan'); reload(equipment);
}

// ---- Riwayat kondisi alat --------------------------------------------------
async function equipHistory(item) {
  const { data, error } = await db.equipmentLogs(item.id);
  if (error) return U.alertError('Riwayat belum tersedia. Jalankan schema-v6.sql di Supabase.');
  const rows = data || [];
  Swal.fire({
    title: `Riwayat: ${item.nama}`,
    width: 620,
    html: rows.length ? `
      <div class="text-left max-h-80 overflow-y-auto divide-y divide-slate-100">
        ${rows.map((r) => `
          <div class="py-3">
            <div class="flex items-start gap-2 flex-wrap text-sm">
              <span class="text-slate-400">${U.escapeHtml(r.kondisi_lama || '-')}</span>
              <span class="text-slate-400">→</span>
              <span class="font-medium text-slate-700">${U.escapeHtml(r.kondisi_baru)}</span>
            </div>
            <p class="text-xs text-slate-400 mt-1">${new Date(r.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            ${r.catatan ? `<p class="text-sm text-slate-600 mt-1">${U.escapeHtml(r.catatan)}</p>` : ''}
            ${r.peminjam_terakhir ? `<p class="text-xs text-slate-500 mt-1"><b>Peminjam terakhir:</b> ${U.escapeHtml(r.peminjam_terakhir)}${r.tanggal_pinjam_terakhir ? ' · ' + U.fmtDate(r.tanggal_pinjam_terakhir) : ''}</p>` : ''}
          </div>`).join('')}
      </div>`
      : `<p class="text-slate-400 text-sm">Belum ada perubahan kondisi yang tercatat.</p>`,
    confirmButtonColor: '#0F766E',
  });
}

// ---- Data Guru -------------------------------------------------------------
export async function gurus(el) {
  const { data, error } = await db.gurus();
  if (error) throw error;
  el.innerHTML = `
    <div class="flex flex-wrap justify-end gap-2 mb-4">
      <button id="tpl" class="${BTN_GHOST}"><i data-lucide="file-down" class="w-4 h-4"></i>Unduh Template</button>
      <button id="import" class="${BTN_GHOST}"><i data-lucide="upload" class="w-4 h-4"></i>Import Excel/CSV</button>
      <button id="add" class="${BTN_MAIN}"><i data-lucide="plus" class="w-4 h-4"></i>Tambah Guru</button>
    </div>
    ${!data?.length ? U.emptyState('Belum ada guru') : U.card(`
      <div class="overflow-x-auto"><table class="w-full text-sm min-w-[480px]">
        <thead class="text-left text-slate-400 border-b border-slate-200">
          <tr><th class="p-4 font-medium">Nama</th><th class="p-4 font-medium">Kode Guru</th><th class="p-4 font-medium">Mapel</th><th class="p-4"></th></tr>
        </thead>
        <tbody>${data.map((g) => `
          <tr class="border-b border-slate-100 last:border-0">
            <td class="p-4 font-medium text-slate-700">${U.escapeHtml(g.nama)}</td>
            <td class="p-4 text-slate-500">${U.escapeHtml(g.nip || '-')}</td>
            <td class="p-4 text-slate-500">${U.escapeHtml(g.mapel || '-')}</td>
            <td class="p-4 text-right whitespace-nowrap">
              <button data-edit="${g.id}" class="text-slate-400 hover:text-brand-600 p-1.5"><i data-lucide="pencil" class="w-4 h-4"></i></button>
              <button data-del="${g.id}" class="text-slate-400 hover:text-coral-700 p-1.5"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
          </tr>`).join('')}</tbody>
      </table></div>`)}`;
  U.icons();

  el.querySelector('#add').addEventListener('click', () => guruForm());
  el.querySelector('#tpl').addEventListener('click', () => templateGuru());
  el.querySelector('#import').addEventListener('click', () => importGurus(data || []));
  el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => guruForm(data.find((x) => x.id === b.dataset.edit))));
  el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => del('Guru', () => db.deleteGuru(b.dataset.del), gurus)));
}

async function guruForm(guru = null) {
  const { value, isConfirmed } = await Swal.fire({
    title: guru ? 'Edit Guru' : 'Tambah Guru',
    html: `
      <input id="s-nama" class="swal2-input" placeholder="Nama lengkap" value="${U.escapeHtml(guru?.nama || '')}">
      <input id="s-nip" class="swal2-input" placeholder="Kode Guru" value="${U.escapeHtml(guru?.nip || '')}">
      <input id="s-mapel" class="swal2-input" placeholder="Mata pelajaran" value="${U.escapeHtml(guru?.mapel || '')}">`,
    showCancelButton: true, confirmButtonText: 'Simpan', cancelButtonText: 'Batal', confirmButtonColor: '#0F766E',
    focusConfirm: false,
    preConfirm: () => {
      const nama = document.getElementById('s-nama').value.trim();
      if (!nama) { Swal.showValidationMessage('Nama wajib diisi'); return false; }
      return {
        nama, nip: document.getElementById('s-nip').value.trim() || null,
        mapel: document.getElementById('s-mapel').value.trim() || null,
      };
    },
  });
  if (!isConfirmed) return;
  const { error } = guru ? await db.updateGuru(guru.id, value) : await db.createGuru(value);
  if (error) return U.alertError(error.message);
  U.toast('success', 'Tersimpan'); reload(gurus);
}

// ---- Data Siswa ------------------------------------------------------------
export async function students(el) {
  const { data: kelasRows } = await db.studentClasses();
  const classes = (kelasRows || []).map((r) => r.kelas);
  let page = 0, q = '', kelas = '', size = 20;

  el.innerHTML = `
    <div class="flex flex-col sm:flex-row gap-2 sm:items-center justify-between mb-4">
      <div class="flex gap-2 flex-1">
        <div class="relative flex-1 max-w-xs">
          <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-3"></i>
          <input id="q" placeholder="Cari nama / NIS…" class="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/12">
        </div>
        <select id="kf" class="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/12">
          <option value="">Semua kelas</option>
          ${classes.map((k) => `<option value="${U.escapeHtml(k)}">${U.escapeHtml(k)}</option>`).join('')}
        </select>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button id="tpl" class="${BTN_GHOST}"><i data-lucide="file-down" class="w-4 h-4"></i><span class="hidden sm:inline">Unduh </span>Template</button>
        <button id="import" class="${BTN_GHOST}"><i data-lucide="upload" class="w-4 h-4"></i>Import Excel/CSV</button>
        <button id="add" class="${BTN_MAIN}"><i data-lucide="plus" class="w-4 h-4"></i>Tambah Siswa</button>
      </div>
    </div>
    <div id="st-wrap">${U.spinner()}</div>`;
  U.icons();

  const load = async () => {
    const wrap = document.getElementById('st-wrap');
    const { data, count, error } = await db.studentsPage({ page, size, q, kelas });
    if (error) { wrap.innerHTML = `<p class="text-coral-600 text-sm">${U.escapeHtml(error.message)}</p>`; return; }
    if (!count) { wrap.innerHTML = U.emptyState('Tidak ada siswa'); return; }
    const rowsById = Object.fromEntries((data || []).map((r) => [r.id, r]));
    const from = page * size + 1, to = Math.min(count, page * size + size), pages = Math.ceil(count / size);
    wrap.innerHTML = U.card(`
      <div class="overflow-x-auto"><table class="w-full text-sm min-w-[420px]">
        <thead class="text-left text-slate-400 border-b border-slate-200">
          <tr><th class="p-4 font-medium">Nama</th><th class="p-4 font-medium">Kelas</th><th class="p-4 font-medium">NIS</th><th class="p-4"></th></tr>
        </thead>
        <tbody>${(data || []).map((s) => `
          <tr class="border-b border-slate-100 last:border-0">
            <td class="p-4 font-medium text-slate-700">${U.escapeHtml(s.nama)}</td>
            <td class="p-4 text-slate-500">${U.escapeHtml(s.kelas)}</td>
            <td class="p-4 text-slate-500">${U.escapeHtml(s.nis || '-')}</td>
            <td class="p-4 text-right whitespace-nowrap">
              <button data-edit="${s.id}" class="text-slate-400 hover:text-brand-600 p-1.5"><i data-lucide="pencil" class="w-4 h-4"></i></button>
              <button data-del="${s.id}" class="text-slate-400 hover:text-coral-700 p-1.5"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
          </tr>`).join('')}</tbody>
      </table></div>`) + `
      <div class="flex items-center justify-between mt-4 text-sm text-slate-500">
        <span>Menampilkan ${from}–${to} dari ${count} siswa</span>
        <div class="flex gap-2">
          <button id="prev" class="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40" ${page <= 0 ? 'disabled' : ''}>Sebelumnya</button>
          <button id="next" class="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40" ${page >= pages - 1 ? 'disabled' : ''}>Berikutnya</button>
        </div>
      </div>`;
    U.icons();
    wrap.querySelector('#prev')?.addEventListener('click', () => { if (page > 0) { page--; load(); } });
    wrap.querySelector('#next')?.addEventListener('click', () => { if (page < pages - 1) { page++; load(); } });
    wrap.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => studentForm(rowsById[b.dataset.edit], load)));
    wrap.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      const r = await U.confirmAction({ title: 'Hapus siswa?', danger: true, confirmText: 'Hapus', icon: 'warning' });
      if (!r.isConfirmed) return;
      const { error } = await db.deleteStudent(b.dataset.del);
      if (error) return U.alertError(error.message);
      U.toast('success', 'Siswa dihapus'); load();
    }));
  };

  let t;
  document.getElementById('q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { q = e.target.value.trim(); page = 0; load(); }, 250); });
  document.getElementById('kf').addEventListener('change', (e) => { kelas = e.target.value; page = 0; load(); });
  document.getElementById('add').addEventListener('click', () => studentForm(null, load));
  document.getElementById('tpl').addEventListener('click', () => templateSiswa(classes));
  document.getElementById('import').addEventListener('click', () => importStudents());
  load();
}

async function studentForm(student, refresh) {
  const { value, isConfirmed } = await Swal.fire({
    title: student ? 'Edit Siswa' : 'Tambah Siswa',
    html: `
      <input id="s-nama" class="swal2-input" placeholder="Nama lengkap" value="${U.escapeHtml(student?.nama || '')}">
      <input id="s-kelas" class="swal2-input" placeholder="Kelas (mis. XI IPA 1)" value="${U.escapeHtml(student?.kelas || '')}">
      <input id="s-nis" class="swal2-input" placeholder="NIS (opsional)" value="${U.escapeHtml(student?.nis || '')}">`,
    showCancelButton: true, confirmButtonText: 'Simpan', cancelButtonText: 'Batal', confirmButtonColor: '#0F766E', focusConfirm: false,
    preConfirm: () => {
      const nama = document.getElementById('s-nama').value.trim();
      const kelas = document.getElementById('s-kelas').value.trim();
      if (!nama || !kelas) { Swal.showValidationMessage('Nama & kelas wajib diisi'); return false; }
      return { nama, kelas, nis: document.getElementById('s-nis').value.trim() || null };
    },
  });
  if (!isConfirmed) return;
  const { error } = student ? await db.updateStudent(student.id, value) : await db.createStudent(value);
  if (error) return U.alertError(error.message);
  U.toast('success', 'Tersimpan'); refresh ? refresh() : reload(students);
}

// ============================================================================
//  IMPORT EXCEL/CSV + TEMPLATE
//  Setiap jenis data punya sepasang fungsi: template<X>() untuk mengunduh
//  contoh berkas (lengkap dengan lembar "Petunjuk"), dan import<X>() untuk
//  membaca berkas yang sudah diisi admin.
// ============================================================================
const SATUAN_ALAT = ['pcs', 'liter', 'ml', 'kg', 'gram', 'pack', 'botol', 'roll', 'set', 'lembar', 'buah', 'batang', 'pasang', 'unit', 'box', 'lusin', 'rim', 'dus'];

/** Ringkasan hasil import agar admin tahu berapa baris yang dilewati & kenapa. */
async function konfirmasiImport({ label, rows, dilewati, catatan }) {
  if (!rows.length) {
    U.alertError(`Tidak ada baris yang bisa diimport.\n\n${catatan}`);
    return false;
  }
  const r = await Swal.fire({
    icon: 'question',
    title: `Import ${rows.length} ${label}?`,
    html: `
      <div style="text-align:left;font-size:13.5px;color:#55504A">
        <p><b>${rows.length}</b> baris siap diimport.</p>
        ${dilewati ? `<p style="color:#B94227;margin-top:6px"><b>${dilewati}</b> baris dilewati (kosong / tidak valid / duplikat).</p>` : ''}
        <p style="margin-top:8px;color:#857E75;font-size:12.5px">${catatan}</p>
      </div>`,
    showCancelButton: true, confirmButtonText: 'Import', cancelButtonText: 'Batal',
    confirmButtonColor: '#0F766E', reverseButtons: true,
  });
  return r.isConfirmed;
}

async function jalankanImport({ rows, fn, label, view }) {
  Swal.fire({ title: 'Mengimport…', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  try {
    const n = await chunkInsert(rows, fn);
    Swal.close();
    await U.alertOk(`${n} ${label} berhasil diimport.`);
  } catch (e) {
    Swal.close();
    U.alertError('Sebagian gagal: ' + e.message);
  }
  reload(view);
}

// ---- Guru ------------------------------------------------------------------
function templateGuru() {
  downloadTemplate({
    judul: 'TEMPLATE IMPORT DATA GURU',
    sheetName: 'Data Guru',
    filename: 'Template_Import_Data_Guru.xlsx',
    columns: [
      { key: 'nama', wajib: true, keterangan: 'Nama lengkap guru (boleh dengan gelar). Baris tanpa nama akan dilewati.', contoh: 'Dra. Siti Aminah, M.Pd.' },
      { key: 'kode_guru', wajib: false, keterangan: 'Kode guru / NIP. Boleh dikosongkan.', contoh: '198703152010012005' },
      { key: 'mapel', wajib: false, keterangan: 'Mata pelajaran yang diampu.', contoh: 'Biologi' },
    ],
    examples: [
      { nama: 'Dra. Siti Aminah, M.Pd.', kode_guru: '198703152010012005', mapel: 'Biologi' },
      { nama: 'Ahmad Fauzi, S.Pd.', kode_guru: 'G-014', mapel: 'Fisika' },
      { nama: 'Rina Kusuma, S.Si.', kode_guru: '', mapel: 'Kimia' },
    ],
    catatan: [
      'Nama guru yang sudah terdaftar akan otomatis dilewati agar tidak dobel.',
      'Guru login tanpa password — cukup memilih namanya, jadi pastikan penulisan nama sudah benar.',
      'Kolom "kode_guru" boleh juga ditulis "nip" — keduanya dikenali sistem.',
    ],
  });
}

function importGurus(existing = []) {
  const sudahAda = new Set(existing.map((g) => g.nama.trim().toLowerCase()));
  pickAndParse(async (raw) => {
    let dilewati = 0;
    const seen = new Set();
    const rows = raw.map(normKeys).map((r) => ({
      nama: String(r.nama || r.name || r.nama_guru || '').trim(),
      nip: String(r.kode_guru || r.nip || r.kode || '').trim() || null,
      mapel: String(r.mapel || r.mata_pelajaran || r.pelajaran || '').trim() || null,
    })).filter((r) => {
      const key = r.nama.toLowerCase();
      if (!r.nama || sudahAda.has(key) || seen.has(key)) { dilewati++; return false; }
      seen.add(key);
      return true;
    });
    const ok = await konfirmasiImport({
      label: 'guru', rows, dilewati,
      catatan: 'Berkas wajib punya kolom <b>nama</b>. Kolom opsional: kode_guru, mapel. Unduh template bila ragu dengan formatnya.',
    });
    if (ok) await jalankanImport({ rows, fn: db.bulkInsertGurus, label: 'guru', view: gurus });
  }, U.alertError);
}

// ---- Siswa -----------------------------------------------------------------
function templateSiswa(classes = []) {
  downloadTemplate({
    judul: 'TEMPLATE IMPORT DATA SISWA',
    sheetName: 'Data Siswa',
    filename: 'Template_Import_Data_Siswa.xlsx',
    columns: [
      { key: 'nama', wajib: true, keterangan: 'Nama lengkap siswa.', contoh: 'Andi Pratama' },
      { key: 'kelas', wajib: true, keterangan: 'Tulis persis seperti penamaan kelas di sekolah. Dipakai untuk filter saat guru memilih peserta.', contoh: 'X IPA 1' },
      { key: 'nis', wajib: false, keterangan: 'Nomor Induk Siswa. Boleh dikosongkan.', contoh: '2024001' },
    ],
    examples: [
      { nama: 'Andi Pratama', kelas: 'X IPA 1', nis: '2024001' },
      { nama: 'Bella Safitri', kelas: 'X IPA 1', nis: '2024002' },
      { nama: 'Citra Dewanti', kelas: 'X IPA 2', nis: '2024003' },
      { nama: 'Dimas Nugroho', kelas: 'XI IPA 1', nis: '2023001' },
    ],
    catatan: [
      'Baris tanpa nama ATAU tanpa kelas akan dilewati.',
      'Tulis kelas secara konsisten ("X IPA 1", bukan campur "X-IPA-1") agar tidak muncul kelas kembar.',
      classes.length ? `Kelas yang sudah ada di sistem: ${classes.join(', ')}` : 'Belum ada kelas terdaftar — kelas akan dibuat otomatis dari isi kolom "kelas".',
      'Data lama tidak dihapus; hasil import ditambahkan ke daftar yang sudah ada.',
    ],
  });
}

function importStudents() {
  pickAndParse(async (raw) => {
    let dilewati = 0;
    const rows = raw.map(normKeys).map((r) => ({
      nama: String(r.nama || r.name || r.nama_siswa || '').trim(),
      kelas: String(r.kelas || r.class || r.rombel || '').trim(),
      nis: String(r.nis || r.nisn || '').trim() || null,
    })).filter((r) => {
      if (!r.nama || !r.kelas) { dilewati++; return false; }
      return true;
    });
    const ok = await konfirmasiImport({
      label: 'siswa', rows, dilewati,
      catatan: 'Berkas wajib punya kolom <b>nama</b> dan <b>kelas</b>. Kolom opsional: nis. Data ditambahkan ke daftar siswa yang ada.',
    });
    if (ok) await jalankanImport({ rows, fn: db.bulkInsertStudents, label: 'siswa', view: students });
  }, U.alertError);
}

// ---- Alat / Bahan ----------------------------------------------------------
function templateAlat(labs = []) {
  const daftarLab = labs.map((l) => `${l.kode || '(tanpa kode)'} = ${l.nama}`);
  const kode1 = labs[0]?.kode || labs[0]?.nama || 'LK1';
  const kode2 = labs[1]?.kode || labs[1]?.nama || kode1;
  downloadTemplate({
    judul: 'TEMPLATE IMPORT DATA ALAT & BAHAN',
    sheetName: 'Data Alat',
    filename: 'Template_Import_Data_Alat.xlsx',
    columns: [
      { key: 'nama', wajib: true, keterangan: 'Nama alat atau bahan.', contoh: 'Mikroskop Binokuler' },
      { key: 'lab_kode', wajib: true, keterangan: 'Kode lab tempat alat disimpan (boleh diisi nama labnya). Lihat daftar lab di bawah — kode yang tidak cocok membuat baris dilewati.', contoh: kode1 },
      { key: 'satuan', wajib: false, keterangan: `Satuan unit. Pilihan: ${SATUAN_ALAT.join(', ')}. Kosong = pcs.`, contoh: 'unit' },
      { key: 'jumlah', wajib: false, keterangan: 'Jumlah total unit yang dimiliki. Kosong = 1.', contoh: 15 },
      { key: 'rusak_ringan', wajib: false, keterangan: 'Jumlah unit rusak ringan (masih bisa dipakai). Kosong = 0.', contoh: 0 },
      { key: 'rusak_berat', wajib: false, keterangan: 'Jumlah unit rusak berat (tidak bisa dipinjam). Kosong = 0.', contoh: 1 },
      { key: 'hilang', wajib: false, keterangan: 'Jumlah unit hilang (tidak bisa dipinjam). Kosong = 0.', contoh: 0 },
    ],
    examples: [
      { nama: 'Mikroskop Binokuler', lab_kode: kode1, satuan: 'unit', jumlah: 15, rusak_ringan: 0, rusak_berat: 1, hilang: 0 },
      { nama: 'Gelas Ukur 100 ml', lab_kode: kode1, satuan: 'pcs', jumlah: 30, rusak_ringan: 2, rusak_berat: 0, hilang: 1 },
      { nama: 'Alkohol 70%', lab_kode: kode2, satuan: 'botol', jumlah: 12, rusak_ringan: 0, rusak_berat: 0, hilang: 0 },
    ],
    catatan: [
      'Jumlah kondisi baik dihitung otomatis: jumlah − rusak_ringan − rusak_berat − hilang.',
      'rusak_ringan + rusak_berat + hilang tidak boleh melebihi kolom jumlah.',
      daftarLab.length ? `Kode lab yang tersedia: ${daftarLab.join(' | ')}` : 'Belum ada laboratorium terdaftar — tambahkan lab dulu di menu Laboratorium sebelum import alat.',
    ],
  });
}

function importEquipment(labs) {
  const byKode = {}, byNama = {};
  labs.forEach((l) => { if (l.kode) byKode[l.kode.toLowerCase()] = l.id; byNama[l.nama.toLowerCase()] = l.id; });
  pickAndParse(async (raw) => {
    let dilewati = 0;
    const rows = raw.map(normKeys).map((r) => {
      const key = String(r.lab_kode || r.kode || r.lab || '').trim().toLowerCase();
      const jumlah = Math.max(1, Number(r.jumlah) || 1);
      let rr = Math.max(0, Number(r.rusak_ringan) || 0);
      let rb = Math.max(0, Number(r.rusak_berat) || 0);
      let hl = Math.max(0, Number(r.hilang) || 0);
      // Kompatibilitas: file lama yang memakai kolom tunggal `kondisi`
      if (!rr && !rb && !hl) {
        const k = String(r.kondisi || '').trim().toLowerCase().replace(/\s+/g, '_');
        if (k === 'rusak_ringan') rr = jumlah;
        else if (k === 'rusak_berat') rb = jumlah;
        else if (k === 'hilang') hl = jumlah;
      }
      // Jaga agar tidak melebihi total
      if (rr + rb + hl > jumlah) { rr = Math.min(rr, jumlah); rb = Math.min(rb, jumlah - rr); hl = Math.min(hl, jumlah - rr - rb); }
      const satuanRaw = String(r.satuan || r.unit || '').trim().toLowerCase();
      const satuan = SATUAN_ALAT.includes(satuanRaw) ? satuanRaw : 'pcs';
      return {
        nama: String(r.nama || r.nama_alat || '').trim(), lab_id: byKode[key] || byNama[key] || null,
        satuan, jumlah, rusak_ringan: rr, rusak_berat: rb, hilang: hl,
      };
    }).filter((r) => {
      if (!r.nama || !r.lab_id) { dilewati++; return false; }
      return true;
    });
    const ok = await konfirmasiImport({
      label: 'alat/bahan', rows, dilewati,
      catatan: 'Berkas wajib punya kolom <b>nama</b> dan <b>lab_kode</b> yang cocok dengan kode/nama lab terdaftar. Kolom opsional: satuan, jumlah, rusak_ringan, rusak_berat, hilang.',
    });
    if (ok) await jalankanImport({ rows, fn: db.bulkInsertEquipment, label: 'alat/bahan', view: equipment });
  }, U.alertError);
}

// ---- Pengaturan (Kontak WhatsApp) ------------------------------------------
export async function settings(el) {
  const [{ data: num }, { data: nm }] = await Promise.all([db.getSetting('wa_number'), db.getSetting('wa_nama')]);
  const inp = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] text-slate-800 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/12 placeholder:text-slate-300';
  el.innerHTML = U.card(`
    <form id="cfg" class="p-6 space-y-5 max-w-lg">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-2xl bg-green-100 text-green-600 grid place-items-center"><i data-lucide="message-circle" class="w-5 h-5"></i></div>
        <div>
          <p class="font-semibold text-slate-800">Contact Person (WhatsApp)</p>
          <p class="text-xs text-slate-400">Dipakai tombol "Lapor Kendala" yang melayang di halaman guru.</p>
        </div>
      </div>
      <div>
        <label class="text-[12.5px] font-semibold text-slate-600">Nama Contact Person</label>
        <input name="nama" class="${inp}" placeholder="mis. Pak Andi (Laboran)" value="${U.escapeHtml(nm?.value || '')}">
      </div>
      <div>
        <label class="text-[12.5px] font-semibold text-slate-600">Nomor WhatsApp</label>
        <input name="number" class="${inp}" placeholder="mis. 081234567890" value="${U.escapeHtml(num?.value || '')}">
        <p class="text-[11px] text-slate-400 mt-1">Boleh format 08xx atau 62xx — otomatis disesuaikan. Kosongkan untuk menyembunyikan tombol lapor.</p>
      </div>
      <div class="flex justify-end">
        <button type="submit" class="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 shadow-glow active:scale-95 flex items-center gap-2"><i data-lucide="save" class="w-4 h-4"></i>Simpan</button>
      </div>
    </form>`);
  U.icons();
  document.getElementById('cfg').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    const r1 = await db.setSetting('wa_number', f.number.trim());
    const r2 = await db.setSetting('wa_nama', f.nama.trim());
    btn.disabled = false;
    if (r1.error || r2.error) return U.alertError((r1.error || r2.error).message);
    U.alertOk('Pengaturan tersimpan.');
  });
}

// ---- Util hapus ------------------------------------------------------------
async function del(label, fn, view) {
  const r = await U.confirmAction({ title: `Hapus ${label}?`, text: 'Tindakan ini tidak bisa dibatalkan.', danger: true, confirmText: 'Hapus', icon: 'warning' });
  if (!r.isConfirmed) return;
  const { error } = await fn();
  if (error) return U.alertError(error.message);
  U.toast('success', `${label} dihapus`); reload(view);
}
