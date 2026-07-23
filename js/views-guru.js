// ============================================================================
//  View untuk peran GURU
// ============================================================================
import { db } from './supabase.js';
import { S } from './session.js';
import * as U from './ui.js';
import { renderCalendar } from './calendar.js';

// ---- Dashboard -------------------------------------------------------------
export async function dashboard(el) {
  const { data, error } = await db.bookings({ guru_id: S.guru.id });
  if (error) throw error;
  const rows = data || [];
  const count = (s) => rows.filter((r) => r.status === s).length;

  el.innerHTML = `
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      ${U.statTile('calendar-check', 'Total Booking', rows.length, 'blue')}
      ${U.statTile('clock', 'Menunggu', count('menunggu'), 'amber')}
      ${U.statTile('check-circle-2', 'Disetujui', count('disetujui'), 'emerald')}
      ${U.statTile('flag', 'Selesai', count('selesai'), 'blue')}
    </div>
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-semibold text-gray-800">Booking Terbaru</h2>
      <a href="#/guru/new" class="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5">
        <i data-lucide="plus" class="w-4 h-4"></i>Buat Booking</a>
    </div>
    <div id="list"></div>`;
  paintBookingCards(document.getElementById('list'), rows.slice(0, 5), true);
  U.icons();
}

// ---- Buat Booking ----------------------------------------------------------
export async function newBooking(el) {
  const { data: labs } = await db.labs();
  const available = (labs || []).filter((l) => l.status === 'tersedia');

  el.innerHTML = U.card(`
    <form id="bk" class="p-6 space-y-4">
      <div>
        <label class="text-xs font-medium text-gray-500">Laboratorium</label>
        <select name="lab_id" required class="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">— Pilih lab —</option>
          ${available.map((l) => `<option value="${l.id}" data-kap="${l.kapasitas}">${U.escapeHtml(l.nama)} (kap. ${l.kapasitas})</option>`).join('')}
        </select>
        ${available.length < (labs || []).length ? `<p class="text-[11px] text-amber-600 mt-1">Sebagian lab disembunyikan (maintenance/ditutup).</p>` : ''}
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><label class="text-xs font-medium text-gray-500">Tanggal</label>
          <input name="tanggal" type="date" required min="${U.todayISO()}" class="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"></div>
        <div><label class="text-xs font-medium text-gray-500">Jam Mulai</label>
          <input name="jam_mulai" type="time" required class="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"></div>
        <div><label class="text-xs font-medium text-gray-500">Jam Selesai</label>
          <input name="jam_selesai" type="time" required class="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label class="text-xs font-medium text-gray-500">Jumlah Peserta</label>
          <input name="jumlah_peserta" type="number" min="1" max="30" required class="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="mis. 30"></div>
        <div><label class="text-xs font-medium text-gray-500">Kelas</label>
          <input name="kelas" type="text" class="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="mis. XI IPA 1"></div>
      </div>
      <div><label class="text-xs font-medium text-gray-500">Keperluan</label>
        <textarea name="keperluan" rows="2" class="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="mis. Praktikum jaringan komputer"></textarea></div>
      <div id="equip-wrap" class="hidden">
        <label class="text-xs font-medium text-gray-500">Alat yang dipinjam (opsional)</label>
        <div id="equip" class="mt-1 grid grid-cols-2 gap-2"></div>
      </div>
      <div id="hint" class="hidden text-sm rounded-xl px-3.5 py-2.5"></div>
      <div class="flex justify-end gap-2 pt-2">
        <button type="button" id="btn-cek" class="px-4 py-2.5 rounded-xl text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100">Cek Ketersediaan</button>
        <button type="submit" class="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
          <i data-lucide="send" class="w-4 h-4"></i>Ajukan Booking</button>
      </div>
    </form>`);
  U.icons();

  const form = document.getElementById('bk');
  const equipWrap = document.getElementById('equip-wrap');
  const equipEl = document.getElementById('equip');

  // Muat alat saat lab dipilih
  form.lab_id.addEventListener('change', async () => {
    const labId = form.lab_id.value;
    if (!labId) { equipWrap.classList.add('hidden'); return; }
    const { data: eq } = await db.equipmentByLab(labId);
    if (!eq || !eq.length) { equipWrap.classList.add('hidden'); return; }
    equipEl.innerHTML = eq.map((e) => `
      <label class="flex items-center gap-2 text-sm border border-gray-200 rounded-xl px-3 py-2 cursor-pointer hover:bg-blue-50">
        <input type="checkbox" value="${e.id}" class="rounded text-blue-600"> ${U.escapeHtml(e.nama)}</label>`).join('');
    equipWrap.classList.remove('hidden');
  });

  const readForm = () => Object.fromEntries(new FormData(form));

  // Cek ketersediaan (memanggil RPC peserta_terpakai lewat select biasa)
  document.getElementById('btn-cek').addEventListener('click', async () => {
    const f = readForm();
    const hint = document.getElementById('hint');
    if (!f.lab_id || !f.tanggal || !f.jam_mulai || !f.jam_selesai) return U.toast('info', 'Lengkapi lab, tanggal, dan jam dulu');
    const kap = Number(form.lab_id.selectedOptions[0].dataset.kap || 30);
    const { data, error } = await db.bookings({ status: 'disetujui' });
    if (error) return U.alertError(error.message);
    const terpakai = (data || []).filter((b) =>
      b.lab_id === f.lab_id && b.tanggal === f.tanggal &&
      b.jam_mulai < f.jam_selesai && b.jam_selesai > f.jam_mulai
    ).reduce((s, b) => s + b.jumlah_peserta, 0);
    const sisa = kap - terpakai;
    hint.className = `text-sm rounded-xl px-3.5 py-2.5 ${sisa > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`;
    hint.innerHTML = sisa > 0
      ? `Tersedia <b>${sisa}</b> kursi pada rentang waktu itu (terpakai ${terpakai}/${kap}).`
      : `Penuh — sudah ${terpakai}/${kap} peserta pada rentang waktu itu.`;
    hint.classList.remove('hidden');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = readForm();
    const equipment = [...equipEl.querySelectorAll('input:checked')].map((c) => ({ equipment_id: c.value, jumlah: 1 }));
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Mengirim…'; U.icons();

    const { error } = await db.createBooking({
      lab_id: f.lab_id, guru_id: S.guru.id, tanggal: f.tanggal,
      jam_mulai: f.jam_mulai, jam_selesai: f.jam_selesai,
      jumlah_peserta: Number(f.jumlah_peserta), kelas: f.kelas, keperluan: f.keperluan, equipment,
    });
    btn.disabled = false; btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> Ajukan Booking'; U.icons();
    if (error) return U.alertError(error.message.replace(/^.*?:\s/, ''));
    await U.alertOk('Booking diajukan. Menunggu persetujuan admin.');
    location.hash = '#/guru/bookings';
  });
}

// ---- Booking Saya ----------------------------------------------------------
export async function myBookings(el) {
  const { data, error } = await db.bookings({ guru_id: S.guru.id });
  if (error) throw error;
  el.innerHTML = `<div id="list"></div>`;
  paintBookingCards(document.getElementById('list'), data || [], true);
  U.icons();
}

// ---- Kalender --------------------------------------------------------------
export async function calendar(el) { await renderCalendar(el); }

// ---- Util: kartu booking (dipakai guru) ------------------------------------
function paintBookingCards(container, rows, allowCancel) {
  if (!rows.length) { container.innerHTML = U.emptyState('Belum ada booking'); return; }
  container.innerHTML = `<div class="space-y-3">${rows.map((b) => `
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
      <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center shrink-0"><i data-lucide="flask-conical" class="w-5 h-5"></i></div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="font-semibold text-gray-800">${U.escapeHtml(b.laboratories?.nama || '-')}</p>
          ${U.bookingBadge(b.status)}
        </div>
        <p class="text-sm text-gray-500 mt-0.5">${U.fmtDate(b.tanggal)} · ${U.fmtTime(b.jam_mulai)}–${U.fmtTime(b.jam_selesai)} · ${b.jumlah_peserta} peserta${b.kelas ? ' · ' + U.escapeHtml(b.kelas) : ''}</p>
        ${b.keperluan ? `<p class="text-sm text-gray-400 mt-0.5">${U.escapeHtml(b.keperluan)}</p>` : ''}
        ${b.status === 'ditolak' && b.alasan_penolakan ? `<p class="text-sm text-red-500 mt-1">Alasan ditolak: ${U.escapeHtml(b.alasan_penolakan)}</p>` : ''}
        ${allowCancel && ['menunggu', 'disetujui'].includes(b.status)
          ? `<button data-cancel="${b.id}" class="mt-2 text-xs font-medium text-red-600 hover:underline">Batalkan booking</button>` : ''}
      </div>
    </div>`).join('')}</div>`;

  container.querySelectorAll('[data-cancel]').forEach((btn) => btn.addEventListener('click', async () => {
    const r = await U.confirmAction({ title: 'Batalkan booking ini?', danger: true, confirmText: 'Batalkan', icon: 'warning' });
    if (!r.isConfirmed) return;
    const { error } = await db.cancelBooking(btn.dataset.cancel, S.guru.id);
    if (error) return U.alertError(error.message);
    U.toast('success', 'Booking dibatalkan');
    myBookings(document.getElementById('view'));
  }));
  U.icons();
}
