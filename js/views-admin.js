// ============================================================================
//  View untuk peran ADMIN
// ============================================================================
import { db } from './supabase.js';
import * as U from './ui.js';
import { renderCalendar } from './calendar.js';

const Swal = window.Swal;
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
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      ${U.statTile('calendar-check', 'Total Booking', rows.length, 'blue')}
      ${U.statTile('clock', 'Menunggu Persetujuan', count('menunggu'), 'amber')}
      ${U.statTile('calendar-days', 'Booking Hari Ini', todayCount, 'emerald')}
      ${U.statTile('flask-conical', 'Lab Sedang Dipakai', dipakai, 'red')}
    </div>
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

export async function bookings(el, status = '') {
  const { data, error } = await db.bookings(status ? { status } : {});
  if (error) throw error;
  el.innerHTML = `
    <div class="flex gap-2 flex-wrap mb-4">
      ${FILTERS.map(([v, l]) => `<button data-f="${v}" class="filter px-3.5 py-1.5 rounded-full text-sm font-medium transition
        ${v === status ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-brand-50'}">${l}</button>`).join('')}
    </div>
    <div id="list"></div>`;
  el.querySelectorAll('.filter').forEach((b) => b.addEventListener('click', () => bookings(el, b.dataset.f)));
  paintAdminBookings(document.getElementById('list'), data || [], () => bookings(el, status));
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
            <p class="font-semibold text-slate-800">${U.escapeHtml(b.laboratories?.nama || '-')}</p>${U.bookingBadge(b.status)}
          </div>
          <p class="text-sm text-slate-500 mt-0.5">
            <i data-lucide="user" class="w-3.5 h-3.5 inline -mt-0.5"></i> ${U.escapeHtml(b.gurus?.nama || '-')} ·
            ${U.fmtDate(b.tanggal)} · ${U.fmtTime(b.jam_mulai)}–${U.fmtTime(b.jam_selesai)} · ${b.jumlah_peserta} peserta${b.kelas ? ' · ' + U.escapeHtml(b.kelas) : ''}
          </p>
          ${b.keperluan ? `<p class="text-sm text-slate-400 mt-0.5">${U.escapeHtml(b.keperluan)}</p>` : ''}
          ${b.status === 'ditolak' && b.alasan_penolakan ? `<p class="text-sm text-rose-500 mt-1">Alasan: ${U.escapeHtml(b.alasan_penolakan)}</p>` : ''}
          <div class="flex gap-2 mt-3 flex-wrap">
            ${b.status === 'menunggu' ? `
              <button data-act="disetujui" data-id="${b.id}" class="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i>Setujui</button>
              <button data-act="tolak" data-id="${b.id}" class="text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center gap-1"><i data-lucide="x" class="w-3.5 h-3.5"></i>Tolak</button>` : ''}
            ${b.status === 'disetujui' ? `
              <button data-act="selesai" data-id="${b.id}" class="text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 flex items-center gap-1"><i data-lucide="flag" class="w-3.5 h-3.5"></i>Tandai Selesai</button>` : ''}
          </div>
        </div>
      </div>
    </div>`).join('')}</div>`;

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
  const [{ data: eq, error }, { data: labs }] = await Promise.all([db.equipment(), db.labs()]);
  if (error) throw error;
  el.innerHTML = `
    <div class="flex justify-end mb-4">
      <button id="add" class="text-sm bg-gradient-to-r from-brand-600 to-brand-500 shadow-glow hover:to-brand-600 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5"><i data-lucide="plus" class="w-4 h-4"></i>Tambah Alat</button>
    </div>
    ${!eq?.length ? U.emptyState('Belum ada alat') : U.card(`
      <table class="w-full text-sm">
        <thead class="text-left text-slate-400 border-b border-slate-200/70">
          <tr><th class="p-4 font-medium">Nama</th><th class="p-4 font-medium">Lab</th><th class="p-4 font-medium">Jumlah</th><th class="p-4 font-medium">Kondisi</th><th class="p-4"></th></tr>
        </thead>
        <tbody>${eq.map((e) => `
          <tr class="border-b border-slate-100 last:border-0">
            <td class="p-4 font-medium text-slate-700">${U.escapeHtml(e.nama)}</td>
            <td class="p-4 text-slate-500">${U.escapeHtml(e.laboratories?.nama || '-')}</td>
            <td class="p-4 text-slate-500">${e.jumlah}</td>
            <td class="p-4 text-slate-500">${U.escapeHtml(e.kondisi)}</td>
            <td class="p-4 text-right whitespace-nowrap">
              <button data-edit="${e.id}" class="text-slate-400 hover:text-brand-600 p-1.5"><i data-lucide="pencil" class="w-4 h-4"></i></button>
              <button data-del="${e.id}" class="text-slate-400 hover:text-rose-600 p-1.5"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
          </tr>`).join('')}</tbody>
      </table>`)}`;
  U.icons();

  el.querySelector('#add').addEventListener('click', () => equipForm(null, labs));
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
      <select id="s-kondisi" class="swal2-select">${['baik', 'rusak_ringan', 'rusak_berat'].map((k) => `<option value="${k}" ${item?.kondisi === k ? 'selected' : ''}>${k}</option>`).join('')}</select>`,
    showCancelButton: true, confirmButtonText: 'Simpan', cancelButtonText: 'Batal', confirmButtonColor: '#2563eb',
    focusConfirm: false,
    preConfirm: () => {
      const nama = document.getElementById('s-nama').value.trim();
      if (!nama) { Swal.showValidationMessage('Nama wajib diisi'); return false; }
      return {
        nama, lab_id: document.getElementById('s-lab').value,
        jumlah: Number(document.getElementById('s-jml').value) || 1,
        kondisi: document.getElementById('s-kondisi').value,
      };
    },
  });
  if (!isConfirmed) return;
  const { error } = item ? await db.updateEquipment(item.id, value) : await db.createEquipment(value);
  if (error) return U.alertError(error.message);
  U.toast('success', 'Tersimpan'); reload(equipment);
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
      <table class="w-full text-sm">
        <thead class="text-left text-slate-400 border-b border-slate-200/70">
          <tr><th class="p-4 font-medium">Nama</th><th class="p-4 font-medium">NIP</th><th class="p-4 font-medium">Mapel</th><th class="p-4"></th></tr>
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
      </table>`)}`;
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
      <input id="s-nip" class="swal2-input" placeholder="NIP" value="${U.escapeHtml(guru?.nip || '')}">
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

// ---- Util hapus ------------------------------------------------------------
async function del(label, fn, view) {
  const r = await U.confirmAction({ title: `Hapus ${label}?`, text: 'Tindakan ini tidak bisa dibatalkan.', danger: true, confirmText: 'Hapus', icon: 'warning' });
  if (!r.isConfirmed) return;
  const { error } = await fn();
  if (error) return U.alertError(error.message);
  U.toast('success', `${label} dihapus`); reload(view);
}
