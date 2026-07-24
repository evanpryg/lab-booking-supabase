// ============================================================================
//  View untuk peran ADMIN
// ============================================================================
import { db } from './supabase.js';
import * as U from './ui.js';
import { renderCalendar } from './calendar.js';
import { showStudents } from './views-guru.js';

const Swal = window.Swal;
const XLSX = window.XLSX;
const reload = (fn) => fn(document.getElementById('view'));

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
      actionHtml: `<a href="#/admin/bookings" class="bg-white/95 hover:bg-white text-brand-700 font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition"><i data-lucide="calendar-check" class="w-4 h-4"></i>Kelola Booking</a>`,
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
        <h2 class="font-semibold text-slate-800 mb-3">Menunggu Persetujuan</h2>
        <div id="pending"></div>
      </div>
      <div>
        <h2 class="font-semibold text-slate-800 mb-3">Status Laboratorium</h2>
        <div class="space-y-2">
          ${(labs || []).map((l) => `
            <div class="bg-white rounded-xl border border-slate-200/70 shadow-card p-3.5 flex items-center justify-between">
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
    <div class="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
      <div class="flex gap-2 flex-wrap">
        ${FILTERS.map(([v, l]) => `<button data-f="${v}" class="filter px-3.5 py-1.5 rounded-full text-sm font-medium transition
          ${v === status ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-brand-50'}">${l}</button>`).join('')}
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <input type="month" id="month" value="${month}" class="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15">
        <button id="allmonth" class="px-3 py-2 rounded-xl text-sm font-medium border transition ${month ? 'bg-white border-slate-200 text-slate-600 hover:bg-brand-50' : 'bg-brand-600 border-brand-600 text-white'}">Semua bulan</button>
      </div>
    </div>
    <div id="list"></div>`;
  el.querySelectorAll('.filter').forEach((b) => b.addEventListener('click', () => bookings(el, b.dataset.f, month)));
  el.querySelector('#month').addEventListener('change', (e) => bookings(el, status, e.target.value));
  el.querySelector('#allmonth').addEventListener('click', () => bookings(el, status, month ? '' : U.todayISO().slice(0, 7)));
  paintAdminBookings(document.getElementById('list'), data || [], () => bookings(el, status, month));
  U.icons();
}

function paintAdminBookings(container, rows, refresh) {
  if (!rows.length) { container.innerHTML = U.emptyState('Tidak ada data booking'); return; }
  container.innerHTML = `<div class="space-y-3">${rows.map((b) => `
    <div class="bg-white rounded-2xl border border-slate-200/70 shadow-card p-4">
      <div class="flex items-start gap-4">
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow grid place-items-center shrink-0"><i data-lucide="flask-conical" class="w-5 h-5"></i></div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="font-semibold text-slate-800">${U.bookingTitle(b)}</p>${U.bookingBadge(b.status)}${U.tipeTag(b)}
          </div>
          <p class="text-sm text-slate-500 mt-0.5">
            <i data-lucide="user" class="w-3.5 h-3.5 inline -mt-0.5"></i> ${U.escapeHtml(b.gurus?.nama || '-')} ·
            ${U.fmtDate(b.tanggal)} · ${U.fmtTime(b.jam_mulai)}–${U.fmtTime(b.jam_selesai)} · ${U.pesertaLabel(b)}${b.kelas ? ' · ' + U.escapeHtml(b.kelas) : ''}
          </p>
          ${b.keperluan ? `<p class="text-sm text-slate-400 mt-0.5">${U.escapeHtml(b.keperluan)}</p>` : ''}
          ${U.equipLine(b.booking_equipment)}
          ${b.status === 'ditolak' && b.alasan_penolakan ? `<p class="text-sm text-rose-500 mt-1">Alasan: ${U.escapeHtml(b.alasan_penolakan)}</p>` : ''}
          <div class="flex gap-2 mt-3 flex-wrap">
            ${b.tipe !== 'alat' ? `<button data-siswa="${b.id}" class="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1"><i data-lucide="users" class="w-3.5 h-3.5"></i>Lihat siswa</button>` : ''}
            ${b.status === 'menunggu' ? `
              <button data-act="disetujui" data-id="${b.id}" class="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i>Setujui</button>
              <button data-act="tolak" data-id="${b.id}" class="text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center gap-1"><i data-lucide="x" class="w-3.5 h-3.5"></i>Tolak</button>` : ''}
            ${b.status === 'disetujui' ? `
              <button data-act="selesai" data-id="${b.id}" class="text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 flex items-center gap-1"><i data-lucide="flag" class="w-3.5 h-3.5"></i>Tandai Selesai</button>` : ''}
            ${['dibatalkan', 'ditolak'].includes(b.status) ? `
              <button data-act="hapus" data-id="${b.id}" class="text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center gap-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i>Hapus</button>` : ''}
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
      <button id="add" class="text-sm bg-gradient-to-r from-brand-600 to-brand-500 shadow-glow hover:to-brand-600 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5"><i data-lucide="plus" class="w-4 h-4"></i>Tambah Lab</button>
    </div>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      ${(data || []).map((l) => `
        <div class="bg-white rounded-2xl border border-slate-200/70 shadow-card p-5">
          <div class="flex items-start justify-between">
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow grid place-items-center"><i data-lucide="flask-conical" class="w-5 h-5"></i></div>
            ${U.labBadge(l.status_efektif)}
          </div>
          <p class="font-semibold text-slate-800 mt-3">${U.escapeHtml(l.nama)}</p>
          <p class="text-xs text-slate-400">${U.escapeHtml(l.kode || '')} · Kapasitas ${l.kapasitas} · ${U.escapeHtml(l.lokasi || '-')}</p>
          <div class="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
            <select data-status="${l.id}" class="text-xs rounded-lg border border-slate-200 px-2 py-1.5 flex-1">
              ${['tersedia', 'maintenance', 'ditutup'].map((s) => `<option value="${s}" ${l.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <button data-edit="${l.id}" class="text-slate-400 hover:text-brand-600 p-1.5"><i data-lucide="pencil" class="w-4 h-4"></i></button>
            <button data-del="${l.id}" class="text-slate-400 hover:text-rose-600 p-1.5"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
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
    showCancelButton: true, confirmButtonText: 'Simpan', cancelButtonText: 'Batal', confirmButtonColor: '#2563eb',
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

  const totalJenis = (eq || []).length;
  const unitDipinjam = aktif.reduce((s, u) => s + (u.jumlah_pinjam || 0), 0);
  const kondisiBaik = (eq || []).filter((e) => e.kondisi === 'baik').length;
  const bermasalah = (eq || []).filter((e) => e.kondisi !== 'baik');

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
      ${U.statTile('wrench', 'Jenis Alat', totalJenis, 'blue')}
      ${U.statTile('arrow-up-right', 'Unit Sedang Dipinjam', unitDipinjam, 'amber')}
      ${U.statTile('check-circle-2', 'Kondisi Baik', kondisiBaik, 'emerald')}
      ${U.statTile('alert-triangle', 'Rusak / Hilang', bermasalah.length, 'red')}
    </div>

    <div class="grid lg:grid-cols-2 gap-6 mb-6">
      <div>
        <h2 class="font-semibold text-slate-800 font-display mb-2">Sedang Dipinjam</h2>
        ${U.card(`<div class="px-4">${aktif.length ? aktif.map((u) => usageRow(u, `<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 shrink-0">Berlangsung</span>`)).join('')
          : `<p class="text-sm text-slate-400 py-6 text-center">Tidak ada alat yang sedang dipinjam.</p>`}</div>`)}
      </div>
      <div>
        <h2 class="font-semibold text-slate-800 font-display mb-2">Terjadwal</h2>
        ${U.card(`<div class="px-4">${terjadwal.length ? terjadwal.slice(0, 6).map((u) => usageRow(u, `<span class="px-2 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 shrink-0">Terjadwal</span>`)).join('')
          : `<p class="text-sm text-slate-400 py-6 text-center">Belum ada jadwal peminjaman alat.</p>`}</div>`)}
      </div>
    </div>

    ${bermasalah.length ? `
      <div class="mb-6">
        <h2 class="font-semibold text-slate-800 font-display mb-2">Perlu Perhatian (Rusak / Hilang)</h2>
        ${U.card(`<div class="p-4 flex flex-wrap gap-2">${bermasalah.map((e) => `
          <span class="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 text-sm">
            ${U.escapeHtml(e.nama)} ${U.kondisiBadge(e.kondisi)}
          </span>`).join('')}</div>`)}
      </div>` : ''}

    <div class="flex items-center justify-between gap-2 mb-4">
      <h2 class="font-semibold text-slate-800 font-display">Daftar Alat</h2>
      <div class="flex gap-2">
        <button id="import" class="text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3.5 py-2 rounded-xl flex items-center gap-1.5"><i data-lucide="upload" class="w-4 h-4"></i><span class="hidden sm:inline">Import Excel/CSV</span></button>
        <button id="add" class="text-sm bg-gradient-to-r from-brand-600 to-brand-500 shadow-glow hover:to-brand-600 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5"><i data-lucide="plus" class="w-4 h-4"></i>Tambah</button>
      </div>
    </div>
    ${!eq?.length ? U.emptyState('Belum ada alat') : U.card(`
      <div class="overflow-x-auto"><table class="w-full text-sm min-w-[560px]">
        <thead class="text-left text-slate-400 border-b border-slate-200/70">
          <tr><th class="p-4 font-medium">Nama</th><th class="p-4 font-medium">Lab</th><th class="p-4 font-medium">Jumlah</th><th class="p-4 font-medium">Kondisi</th><th class="p-4"></th></tr>
        </thead>
        <tbody>${eq.map((e) => `
          <tr class="border-b border-slate-100 last:border-0">
            <td class="p-4 font-medium text-slate-700">${U.escapeHtml(e.nama)}</td>
            <td class="p-4 text-slate-500">${U.escapeHtml(e.laboratories?.nama || '-')}</td>
            <td class="p-4 text-slate-500">${e.jumlah}</td>
            <td class="p-4">${U.kondisiBadge(e.kondisi)}</td>
            <td class="p-4 text-right whitespace-nowrap">
              <button data-hist="${e.id}" title="Riwayat kondisi" class="text-slate-400 hover:text-brand-600 p-1.5"><i data-lucide="history" class="w-4 h-4"></i></button>
              <button data-edit="${e.id}" class="text-slate-400 hover:text-brand-600 p-1.5"><i data-lucide="pencil" class="w-4 h-4"></i></button>
              <button data-del="${e.id}" class="text-slate-400 hover:text-rose-600 p-1.5"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
          </tr>`).join('')}</tbody>
      </table></div>`)}`;
  U.icons();

  el.querySelector('#add').addEventListener('click', () => equipForm(null, labs));
  el.querySelector('#import').addEventListener('click', () => importEquipment(labs));
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
      <input id="s-jml" type="number" class="swal2-input" placeholder="Jumlah" value="${item?.jumlah ?? 1}">
      <select id="s-kondisi" class="swal2-select">${[['baik', 'Baik'], ['rusak_ringan', 'Rusak Ringan'], ['rusak_berat', 'Rusak Berat'], ['hilang', 'Hilang']].map(([k, l]) => `<option value="${k}" ${item?.kondisi === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <textarea id="s-catatan" class="swal2-textarea" placeholder="Catatan (diisi bila kondisi berubah, mis. layar pecah saat praktikum)"></textarea>`,
    showCancelButton: true, confirmButtonText: 'Simpan', cancelButtonText: 'Batal', confirmButtonColor: '#2563eb',
    focusConfirm: false,
    preConfirm: () => {
      const nama = document.getElementById('s-nama').value.trim();
      if (!nama) { Swal.showValidationMessage('Nama wajib diisi'); return false; }
      return {
        nama, lab_id: document.getElementById('s-lab').value,
        jumlah: Number(document.getElementById('s-jml').value) || 1,
        kondisi: document.getElementById('s-kondisi').value,
        _catatan: document.getElementById('s-catatan').value.trim() || null,
      };
    },
  });
  if (!isConfirmed) return;
  const catatan = value._catatan;
  delete value._catatan;

  const { error } = item ? await db.updateEquipment(item.id, value) : await db.createEquipment(value);
  if (error) return U.alertError(error.message);

  // Catat riwayat bila kondisi berubah (siapa peminjam terakhir ikut disimpan)
  if (item && item.kondisi !== value.kondisi) {
    const { data: last } = await db.lastBorrower(item.id);
    await db.createEquipmentLog({
      equipment_id: item.id,
      kondisi_lama: item.kondisi,
      kondisi_baru: value.kondisi,
      catatan,
      peminjam_terakhir: last?.guru || null,
      tanggal_pinjam_terakhir: last?.tanggal || null,
    });
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
            <div class="flex items-center gap-2 flex-wrap text-sm">
              ${U.kondisiBadge(r.kondisi_lama || '-')}<span class="text-slate-400">→</span>${U.kondisiBadge(r.kondisi_baru)}
            </div>
            <p class="text-xs text-slate-400 mt-1">${new Date(r.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            ${r.catatan ? `<p class="text-sm text-slate-600 mt-1">${U.escapeHtml(r.catatan)}</p>` : ''}
            ${r.peminjam_terakhir ? `<p class="text-xs text-slate-500 mt-1"><b>Peminjam terakhir:</b> ${U.escapeHtml(r.peminjam_terakhir)}${r.tanggal_pinjam_terakhir ? ' · ' + U.fmtDate(r.tanggal_pinjam_terakhir) : ''}</p>` : ''}
          </div>`).join('')}
      </div>`
      : `<p class="text-slate-400 text-sm">Belum ada perubahan kondisi yang tercatat.</p>`,
    confirmButtonColor: '#2563eb',
  });
}

// ---- Data Guru -------------------------------------------------------------
export async function gurus(el) {
  const { data, error } = await db.gurus();
  if (error) throw error;
  el.innerHTML = `
    <div class="flex justify-end mb-4">
      <button id="add" class="text-sm bg-gradient-to-r from-brand-600 to-brand-500 shadow-glow hover:to-brand-600 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5"><i data-lucide="plus" class="w-4 h-4"></i>Tambah Guru</button>
    </div>
    ${!data?.length ? U.emptyState('Belum ada guru') : U.card(`
      <div class="overflow-x-auto"><table class="w-full text-sm min-w-[480px]">
        <thead class="text-left text-slate-400 border-b border-slate-200/70">
          <tr><th class="p-4 font-medium">Nama</th><th class="p-4 font-medium">Kode Guru</th><th class="p-4 font-medium">Mapel</th><th class="p-4"></th></tr>
        </thead>
        <tbody>${data.map((g) => `
          <tr class="border-b border-slate-100 last:border-0">
            <td class="p-4 font-medium text-slate-700">${U.escapeHtml(g.nama)}</td>
            <td class="p-4 text-slate-500">${U.escapeHtml(g.nip || '-')}</td>
            <td class="p-4 text-slate-500">${U.escapeHtml(g.mapel || '-')}</td>
            <td class="p-4 text-right whitespace-nowrap">
              <button data-edit="${g.id}" class="text-slate-400 hover:text-brand-600 p-1.5"><i data-lucide="pencil" class="w-4 h-4"></i></button>
              <button data-del="${g.id}" class="text-slate-400 hover:text-rose-600 p-1.5"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
          </tr>`).join('')}</tbody>
      </table></div>`)}`;
  U.icons();

  el.querySelector('#add').addEventListener('click', () => guruForm());
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
    showCancelButton: true, confirmButtonText: 'Simpan', cancelButtonText: 'Batal', confirmButtonColor: '#2563eb',
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
          <input id="q" placeholder="Cari nama / NIS…" class="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15">
        </div>
        <select id="kf" class="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15">
          <option value="">Semua kelas</option>
          ${classes.map((k) => `<option value="${U.escapeHtml(k)}">${U.escapeHtml(k)}</option>`).join('')}
        </select>
      </div>
      <div class="flex gap-2">
        <button id="import" class="text-sm bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3.5 py-2 rounded-xl flex items-center gap-1.5"><i data-lucide="upload" class="w-4 h-4"></i>Import Excel/CSV</button>
        <button id="add" class="text-sm bg-gradient-to-r from-brand-600 to-brand-500 shadow-glow hover:to-brand-600 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5"><i data-lucide="plus" class="w-4 h-4"></i>Tambah Siswa</button>
      </div>
    </div>
    <div id="st-wrap">${U.spinner()}</div>`;
  U.icons();

  const load = async () => {
    const wrap = document.getElementById('st-wrap');
    const { data, count, error } = await db.studentsPage({ page, size, q, kelas });
    if (error) { wrap.innerHTML = `<p class="text-rose-500 text-sm">${U.escapeHtml(error.message)}</p>`; return; }
    if (!count) { wrap.innerHTML = U.emptyState('Tidak ada siswa'); return; }
    const rowsById = Object.fromEntries((data || []).map((r) => [r.id, r]));
    const from = page * size + 1, to = Math.min(count, page * size + size), pages = Math.ceil(count / size);
    wrap.innerHTML = U.card(`
      <div class="overflow-x-auto"><table class="w-full text-sm min-w-[420px]">
        <thead class="text-left text-slate-400 border-b border-slate-200/70">
          <tr><th class="p-4 font-medium">Nama</th><th class="p-4 font-medium">Kelas</th><th class="p-4 font-medium">NIS</th><th class="p-4"></th></tr>
        </thead>
        <tbody>${(data || []).map((s) => `
          <tr class="border-b border-slate-100 last:border-0">
            <td class="p-4 font-medium text-slate-700">${U.escapeHtml(s.nama)}</td>
            <td class="p-4 text-slate-500">${U.escapeHtml(s.kelas)}</td>
            <td class="p-4 text-slate-500">${U.escapeHtml(s.nis || '-')}</td>
            <td class="p-4 text-right whitespace-nowrap">
              <button data-edit="${s.id}" class="text-slate-400 hover:text-brand-600 p-1.5"><i data-lucide="pencil" class="w-4 h-4"></i></button>
              <button data-del="${s.id}" class="text-slate-400 hover:text-rose-600 p-1.5"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
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
    showCancelButton: true, confirmButtonText: 'Simpan', cancelButtonText: 'Batal', confirmButtonColor: '#2563eb', focusConfirm: false,
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

// ---- Import Excel/CSV ------------------------------------------------------
function pickAndParse(onRows) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.csv,.xlsx,.xls';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      onRows(XLSX.utils.sheet_to_json(ws, { defval: '' }));
    } catch (e) { U.alertError('Gagal membaca file: ' + e.message); }
  };
  input.click();
}
const normKeys = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [String(k).trim().toLowerCase(), v]));

async function chunkInsert(rows, fn) {
  let ok = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const slice = rows.slice(i, i + 500);
    const { error } = await fn(slice);
    if (error) throw new Error(`${error.message} (setelah ${ok} baris)`);
    ok += slice.length;
  }
  return ok;
}

function importStudents() {
  pickAndParse(async (raw) => {
    const rows = raw.map(normKeys).map((r) => ({
      nama: String(r.nama || r.name || '').trim(),
      kelas: String(r.kelas || r.class || r.rombel || '').trim(),
      nis: String(r.nis || r.nisn || '').trim() || null,
    })).filter((r) => r.nama && r.kelas);
    if (!rows.length) return U.alertError('Tidak ada baris valid. File wajib punya kolom "nama" dan "kelas".');
    const c = await U.confirmAction({ title: `Import ${rows.length} siswa?`, text: 'Data ditambahkan ke daftar siswa yang ada.', confirmText: 'Import', icon: 'question' });
    if (!c.isConfirmed) return;
    Swal.fire({ title: 'Mengimport…', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    try { const n = await chunkInsert(rows, db.bulkInsertStudents); Swal.close(); await U.alertOk(`${n} siswa berhasil diimport.`); reload(students); }
    catch (e) { Swal.close(); U.alertError('Sebagian gagal: ' + e.message); reload(students); }
  });
}

function importEquipment(labs) {
  const byKode = {}, byNama = {};
  labs.forEach((l) => { if (l.kode) byKode[l.kode.toLowerCase()] = l.id; byNama[l.nama.toLowerCase()] = l.id; });
  const KOND = ['baik', 'rusak_ringan', 'rusak_berat', 'hilang'];
  pickAndParse(async (raw) => {
    const rows = raw.map(normKeys).map((r) => {
      const key = String(r.lab_kode || r.kode || r.lab || '').trim().toLowerCase();
      let kondisi = String(r.kondisi || 'baik').trim().toLowerCase().replace(/\s+/g, '_');
      if (!KOND.includes(kondisi)) kondisi = 'baik';
      return { nama: String(r.nama || '').trim(), lab_id: byKode[key] || byNama[key] || null, jumlah: Number(r.jumlah) || 1, kondisi };
    }).filter((r) => r.nama && r.lab_id);
    if (!rows.length) return U.alertError('Tidak ada baris valid. Wajib kolom "nama" dan "lab_kode" (kode lab yang cocok).');
    const c = await U.confirmAction({ title: `Import ${rows.length} alat?`, confirmText: 'Import', icon: 'question' });
    if (!c.isConfirmed) return;
    Swal.fire({ title: 'Mengimport…', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    try { const n = await chunkInsert(rows, db.bulkInsertEquipment); Swal.close(); await U.alertOk(`${n} alat berhasil diimport.`); reload(equipment); }
    catch (e) { Swal.close(); U.alertError('Sebagian gagal: ' + e.message); reload(equipment); }
  });
}

// ---- Pengaturan (Kontak WhatsApp) ------------------------------------------
export async function settings(el) {
  const [{ data: num }, { data: nm }] = await Promise.all([db.getSetting('wa_number'), db.getSetting('wa_nama')]);
  const inp = 'mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15';
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
        <label class="text-xs font-semibold text-slate-500">Nama Contact Person</label>
        <input name="nama" class="${inp}" placeholder="mis. Pak Andi (Laboran)" value="${U.escapeHtml(nm?.value || '')}">
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-500">Nomor WhatsApp</label>
        <input name="number" class="${inp}" placeholder="mis. 081234567890" value="${U.escapeHtml(num?.value || '')}">
        <p class="text-[11px] text-slate-400 mt-1">Boleh format 08xx atau 62xx — otomatis disesuaikan. Kosongkan untuk menyembunyikan tombol lapor.</p>
      </div>
      <div class="flex justify-end">
        <button type="submit" class="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-500 shadow-glow hover:to-brand-600 flex items-center gap-2"><i data-lucide="save" class="w-4 h-4"></i>Simpan</button>
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
