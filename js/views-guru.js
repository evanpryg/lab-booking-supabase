// ============================================================================
//  View untuk peran GURU
// ============================================================================
import { db } from './supabase.js';
import { S } from './session.js';
import * as U from './ui.js';
import { renderCalendar } from './calendar.js';

const Swal = window.Swal;

// ---- Dashboard -------------------------------------------------------------
export async function dashboard(el) {
  const { data, error } = await db.bookings({ guru_id: S.guru.id });
  if (error) throw error;
  const rows = data || [];
  const count = (s) => rows.filter((r) => r.status === s).length;

  el.innerHTML = `
    ${U.heroBanner({
      name: S.guru.nama,
      subtitle: 'Ajukan peminjaman laboratorium dan pantau statusnya di sini.',
      actionHtml: `<a href="#/guru/new" class="bg-white/95 hover:bg-white text-brand-700 font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition"><i data-lucide="plus" class="w-4 h-4"></i>Buat Booking</a>`,
    })}
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      ${U.statTile('calendar-check', 'Total Booking', rows.length, 'blue')}
      ${U.statTile('clock', 'Menunggu', count('menunggu'), 'amber')}
      ${U.statTile('check-circle-2', 'Disetujui', count('disetujui'), 'emerald')}
      ${U.statTile('flag', 'Selesai', count('selesai'), 'violet')}
    </div>
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-semibold text-slate-800 font-display">Booking Terbaru</h2>
      <a href="#/guru/new" class="text-sm bg-gradient-to-r from-brand-600 to-brand-500 shadow-glow hover:to-brand-600 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5">
        <i data-lucide="plus" class="w-4 h-4"></i>Buat Booking</a>
    </div>
    <div id="list"></div>`;
  paintBookingCards(document.getElementById('list'), rows.slice(0, 5), true);
  U.icons();
}

// ---- Buat Booking ----------------------------------------------------------
export async function newBooking(el) {
  const [{ data: labs }, { data: kelasRows }] = await Promise.all([db.labs(), db.studentClasses()]);
  const available = (labs || []).filter((l) => l.status === 'tersedia');
  const classes = (kelasRows || []).map((r) => r.kelas);

  const inp = 'mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15';

  el.innerHTML = U.card(`
    <form id="bk" class="p-5 sm:p-6 space-y-5">
      <div>
        <label class="text-xs font-semibold text-slate-500 mb-1.5 block">Jenis Peminjaman</label>
        <div class="inline-flex bg-slate-100 rounded-xl p-1 gap-1">
          <button type="button" data-mode="lab" class="mode-btn px-4 py-2 rounded-lg text-sm font-semibold transition">Pakai Lab</button>
          <button type="button" data-mode="alat" class="mode-btn px-4 py-2 rounded-lg text-sm font-semibold transition">Pinjam Alat Saja</button>
        </div>
      </div>
      <div id="lab-field">
        <label class="text-xs font-semibold text-slate-500">Laboratorium <span id="lab-hint" class="text-slate-300 font-normal"></span></label>
        <select name="lab_id" required class="${inp}">
          <option value="">— Pilih lab —</option>
          ${available.map((l) => `<option value="${l.id}" data-kap="${l.kapasitas}">${U.escapeHtml(l.nama)} (kap. ${l.kapasitas})</option>`).join('')}
        </select>
        ${available.length < (labs || []).length ? `<p class="text-[11px] text-amber-600 mt-1">Sebagian lab disembunyikan (maintenance/ditutup).</p>` : ''}
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><label class="text-xs font-semibold text-slate-500">Tanggal</label>
          <input name="tanggal" type="date" required min="${U.todayISO()}" class="${inp}"></div>
        <div><label class="text-xs font-semibold text-slate-500">Jam Mulai</label>
          <input name="jam_mulai" type="time" required class="${inp}"></div>
        <div><label class="text-xs font-semibold text-slate-500">Jam Selesai</label>
          <input name="jam_selesai" type="time" required class="${inp}"></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div id="kelas-field"><label class="text-xs font-semibold text-slate-500">Kelas / Rombel <span class="text-slate-300">(opsional)</span></label>
          <input name="kelas" type="text" class="${inp}" placeholder="mis. XI IPA 1"></div>
        <div><label class="text-xs font-semibold text-slate-500">Keperluan <span class="text-rose-400">*</span></label>
          <input name="keperluan" type="text" required class="${inp}" placeholder="mis. Praktikum jaringan"></div>
      </div>

      <!-- ============ PILIH SISWA ============ -->
      <div id="siswa-section" class="rounded-2xl border border-slate-200 p-4">
        <div class="flex items-center justify-between mb-3">
          <label class="text-sm font-semibold text-slate-700 flex items-center gap-2"><i data-lucide="users" class="w-4 h-4 text-brand-600"></i>Siswa yang ikut ke lab</label>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700"><span id="pcount">0</span> peserta</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select id="kelas-filter" class="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15">
            <option value="">Semua kelas</option>
            ${classes.map((k) => `<option value="${U.escapeHtml(k)}">${U.escapeHtml(k)}</option>`).join('')}
          </select>
          <div class="relative sm:col-span-2">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-3"></i>
            <input id="siswa-search" type="text" autocomplete="off" placeholder="Cari nama siswa…" class="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15">
          </div>
        </div>
        <p class="text-[11px] text-slate-400 mt-1.5">Filter kelas hanya untuk mempermudah pencarian — Anda tetap bisa memilih siswa lintas kelas.</p>
        <div id="siswa-results" class="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50 hidden"></div>
        <div id="siswa-selected" class="mt-3 flex flex-wrap gap-2"></div>
        <input type="number" id="peserta-manual" min="1" max="30" class="${inp} hidden" placeholder="Jumlah peserta (mis. 30)">
        <p id="peserta-manual-note" class="text-[11px] text-slate-400 mt-1 hidden">Belum ada data siswa dipilih — isi jumlah peserta manual.</p>
      </div>

      <!-- ============ ALAT ============ -->
      <div class="rounded-2xl border border-slate-200 p-4">
        <label class="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3"><i data-lucide="wrench" class="w-4 h-4 text-brand-600"></i>Alat yang dipinjam <span id="alat-opsional" class="text-slate-300 font-normal">(opsional)</span></label>
        <div id="equip" class="space-y-2"><p class="text-sm text-slate-400">Pilih laboratorium dulu.</p></div>
      </div>

      <div id="hint" class="hidden text-sm rounded-xl px-3.5 py-2.5"></div>
      <div class="flex justify-end gap-2 pt-1">
        <button type="button" id="btn-cek" class="px-4 py-2.5 rounded-xl text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100">Cek Ketersediaan</button>
        <button type="submit" class="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-brand-600 to-brand-500 shadow-glow hover:to-brand-600 flex items-center gap-2">
          <i data-lucide="send" class="w-4 h-4"></i>Ajukan Booking</button>
      </div>
    </form>`);
  U.icons();

  const form = document.getElementById('bk');
  const equipEl = document.getElementById('equip');
  const resultsEl = document.getElementById('siswa-results');
  const selectedEl = document.getElementById('siswa-selected');
  const kelasFilter = document.getElementById('kelas-filter');
  const searchEl = document.getElementById('siswa-search');
  const pcount = document.getElementById('pcount');
  const manual = document.getElementById('peserta-manual');
  const manualNote = document.getElementById('peserta-manual-note');
  const selected = new Map(); // id -> {nama, kelas}

  const noStudents = classes.length === 0;
  if (noStudents) { manual.classList.remove('hidden'); manualNote.classList.remove('hidden'); }

  // ---- Mode: Pakai Lab vs Pinjam Alat Saja ----
  const siswaSection = document.getElementById('siswa-section');
  const labField = document.getElementById('lab-field');
  const kelasField = document.getElementById('kelas-field');
  const alatOpsional = document.getElementById('alat-opsional');
  let mode = 'lab';
  const setMode = (m) => {
    mode = m;
    const alat = m === 'alat';
    form.querySelectorAll('.mode-btn').forEach((b) => {
      const on = b.dataset.mode === m;
      b.className = `mode-btn px-4 py-2 rounded-lg text-sm font-semibold transition ${on ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`;
    });
    labField.classList.toggle('hidden', alat);   // mode alat: tak perlu pilih lab
    form.lab_id.required = !alat;
    kelasField.classList.toggle('hidden', alat);  // mode alat: tak perlu kelas/rombel
    siswaSection.classList.toggle('hidden', alat);
    document.getElementById('btn-cek').classList.toggle('hidden', alat);
    alatOpsional.textContent = alat ? '(wajib pilih ≥1)' : '(opsional)';
    alatOpsional.className = alat ? 'text-rose-400 font-normal' : 'text-slate-300 font-normal';
  };
  form.querySelectorAll('.mode-btn').forEach((b) => b.addEventListener('click', async () => {
    setMode(b.dataset.mode);
    if (b.dataset.mode === 'alat') {
      const { data: eq } = await db.equipment(); // semua alat dari semua lab
      renderEquip(eq, true, 'Belum ada alat terdaftar.');
    } else {
      const labId = form.lab_id.value;
      if (labId) { const { data: eq } = await db.equipmentByLab(labId); renderEquip(eq, false, 'Tidak ada alat terdaftar untuk lab ini.'); }
      else renderEquip(null, false, 'Pilih laboratorium dulu.');
    }
  }));
  setMode('lab');

  // ---- Render daftar alat (dipakai kedua mode) ----
  const renderEquip = (eq, showLab, placeholder) => {
    equipEl.innerHTML = (eq && eq.length)
      ? eq.map((e) => {
        const k = U.stok(e);
        const habis = k.siap <= 0;                 // semua unit rusak berat / hilang
        const catatan = [k.rb ? `${k.rb} rusak berat` : '', k.hl ? `${k.hl} hilang` : ''].filter(Boolean).join(', ');
        return `
        <div class="flex items-start gap-3 text-sm border rounded-xl px-3 py-2.5 ${habis ? 'border-slate-100 bg-slate-50' : 'border-slate-200'}">
          <label class="flex items-start gap-2.5 flex-1 min-w-0 ${habis ? 'cursor-not-allowed' : 'cursor-pointer'}">
            <input type="checkbox" data-eqid="${e.id}" ${habis ? 'disabled' : ''} class="equip-check rounded text-brand-600 mt-0.5 shrink-0 disabled:opacity-40">
            <span class="min-w-0">
              <span class="block font-medium break-words leading-snug ${habis ? 'text-slate-400 line-through' : 'text-slate-700'}">${U.escapeHtml(e.nama)}</span>
              <span class="block text-[11px] mt-0.5 ${habis ? 'text-rose-500' : 'text-slate-400'}">
                ${showLab && e.laboratories?.nama ? U.escapeHtml(e.laboratories.nama) + ' · ' : ''}${habis
                  ? 'Tidak ada unit siap pakai'
                  : `siap pakai <b class="text-slate-600">${k.siap}</b> dari ${k.total}${catatan ? ` · ${catatan}` : ''}`}
              </span>
            </span>
          </label>
          <div class="flex items-center gap-1.5 shrink-0 ${habis ? 'hidden' : ''}">
            <span class="text-[11px] text-slate-400 hidden sm:inline">pinjam</span>
            <input type="number" data-qty="${e.id}" min="1" max="${k.siap}" value="1" disabled
              class="w-14 sm:w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-center outline-none focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-300">
          </div>
        </div>`; }).join('')
      : `<p class="text-sm text-slate-400">${placeholder || 'Tidak ada alat.'}</p>`;
    equipEl.querySelectorAll('.equip-check').forEach((c) => c.addEventListener('change', () => {
      const qty = equipEl.querySelector(`[data-qty="${c.dataset.eqid}"]`);
      qty.disabled = !c.checked;
      if (c.checked) qty.focus();
    }));
    U.icons();
  };

  // Mode "pakai lab": alat mengikuti lab yang dipilih
  form.lab_id.addEventListener('change', async () => {
    if (mode === 'alat') return;
    const labId = form.lab_id.value;
    if (!labId) { renderEquip(null, false, 'Pilih laboratorium dulu.'); return; }
    const { data: eq } = await db.equipmentByLab(labId);
    renderEquip(eq, false, 'Tidak ada alat terdaftar untuk lab ini.');
  });

  // ---- Pencarian siswa ----
  const renderSelected = () => {
    pcount.textContent = selected.size;
    selectedEl.innerHTML = [...selected.entries()].map(([id, s]) => `
      <span class="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-medium border border-brand-100">
        ${U.escapeHtml(s.nama)} <span class="text-brand-400">· ${U.escapeHtml(s.kelas)}</span>
        <button type="button" data-rm="${id}" class="w-4 h-4 rounded-full hover:bg-brand-200 grid place-items-center"><i data-lucide="x" class="w-3 h-3"></i></button>
      </span>`).join('') || (noStudents ? '' : `<span class="text-xs text-slate-400">Belum ada siswa dipilih.</span>`);
    selectedEl.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { selected.delete(b.dataset.rm); renderSelected(); }));
    // fallback manual bila tak ada data siswa
    const useManual = noStudents;
    manual.classList.toggle('hidden', !useManual);
    manualNote.classList.toggle('hidden', !useManual);
    U.icons();
  };

  const addOne = (id, nama, kelasName) => {
    if (selected.size >= 30) { U.toast('info', 'Maksimal 30 peserta'); return false; }
    selected.set(id, { nama, kelas: kelasName });
    return true;
  };

  const runSearch = async () => {
    const q = searchEl.value.trim();
    const kelas = kelasFilter.value;
    if (!q && !kelas) { resultsEl.classList.add('hidden'); resultsEl.innerHTML = ''; return; }
    const { data, error } = await db.searchStudents({ kelas, q, limit: 100 });
    if (error) return;
    const rows = (data || []).filter((s) => !selected.has(s.id));
    resultsEl.classList.remove('hidden');
    const header = (kelas && rows.length) ? `
      <button type="button" id="add-all" class="w-full text-left px-3 py-2.5 bg-brand-50 text-brand-700 text-sm font-semibold flex items-center gap-2 sticky top-0 border-b border-brand-100">
        <i data-lucide="user-plus" class="w-4 h-4"></i>Tambah semua siswa kelas ${U.escapeHtml(kelas)} (${rows.length})</button>` : '';
    resultsEl.innerHTML = header + (rows.length ? rows.map((s) => `
      <button type="button" data-add="${s.id}" data-nama="${U.escapeHtml(s.nama)}" data-kelas="${U.escapeHtml(s.kelas)}"
        class="w-full text-left px-3 py-2 hover:bg-brand-50 flex items-center justify-between">
        <span class="text-sm text-slate-700">${U.escapeHtml(s.nama)}</span>
        <span class="text-xs text-slate-400">${U.escapeHtml(s.kelas)}</span>
      </button>`).join('') : `<p class="px-3 py-3 text-sm text-slate-400">Semua siswa yang cocok sudah dipilih.</p>`);
    U.icons();

    // Pilih satu — dropdown TETAP terbuka & daftar diperbarui (tanpa bolak-balik kelas)
    resultsEl.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
      if (addOne(b.dataset.add, b.dataset.nama, b.dataset.kelas)) { renderSelected(); runSearch(); }
    }));
    // Pilih satu kelas penuh sekaligus
    document.getElementById('add-all')?.addEventListener('click', () => {
      let capped = false;
      for (const s of rows) { if (!addOne(s.id, s.nama, s.kelas)) { capped = true; break; } }
      renderSelected();
      if (capped) U.toast('info', 'Sebagian tidak ditambahkan (maks 30 peserta)');
      runSearch();
    });
  };

  let t;
  searchEl.addEventListener('input', () => { clearTimeout(t); t = setTimeout(runSearch, 250); });
  kelasFilter.addEventListener('change', runSearch);
  document.addEventListener('click', (e) => { if (!resultsEl.contains(e.target) && e.target !== searchEl) resultsEl.classList.add('hidden'); });
  renderSelected();

  // ---- Cek ketersediaan ----
  document.getElementById('btn-cek').addEventListener('click', async () => {
    const f = Object.fromEntries(new FormData(form));
    const hint = document.getElementById('hint');
    if (!f.lab_id || !f.tanggal || !f.jam_mulai || !f.jam_selesai) return U.toast('info', 'Lengkapi lab, tanggal, dan jam dulu');
    const kap = Number(form.lab_id.selectedOptions[0].dataset.kap || 30);
    const { data } = await db.bookings({ status: 'disetujui' });
    const terpakai = (data || []).filter((b) => b.lab_id === f.lab_id && b.tanggal === f.tanggal && b.jam_mulai < f.jam_selesai && b.jam_selesai > f.jam_mulai)
      .reduce((s, b) => s + b.jumlah_peserta, 0);
    const sisa = kap - terpakai;
    hint.className = `text-sm rounded-xl px-3.5 py-2.5 ${sisa > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`;
    hint.innerHTML = sisa > 0
      ? `Tersedia <b>${sisa}</b> kursi pada rentang waktu itu (terpakai ${terpakai}/${kap}).`
      : `Penuh — sudah ${terpakai}/${kap} peserta pada rentang waktu itu.`;
    hint.classList.remove('hidden');
  });

  // ---- Submit ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const equipment = [...equipEl.querySelectorAll('.equip-check:checked')].map((c) => {
      const qty = equipEl.querySelector(`[data-qty="${c.dataset.eqid}"]`);
      return { equipment_id: c.dataset.eqid, jumlah: Math.max(1, Number(qty?.value) || 1) };
    });

    let students = [], peserta = null;
    if (mode === 'alat') {
      if (!equipment.length) return U.alertError('Pilih minimal 1 alat yang dipinjam.');
    } else {
      students = [...selected.keys()];
      peserta = students.length || Number(manual.value) || 0;
      if (peserta <= 0) return U.alertError('Pilih minimal 1 siswa, atau isi jumlah peserta.');
    }

    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Mengirim…'; U.icons();

    const { error } = await db.createBooking({
      lab_id: mode === 'alat' ? null : f.lab_id, guru_id: S.guru.id, tanggal: f.tanggal,
      jam_mulai: f.jam_mulai, jam_selesai: f.jam_selesai, jumlah_peserta: peserta,
      kelas: f.kelas, keperluan: f.keperluan, equipment, students, tipe: mode,
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

// ---- Lihat daftar siswa sebuah booking -------------------------------------
export async function showStudents(bookingId) {
  const { data, error } = await db.bookingStudents(bookingId);
  if (error) return U.alertError(error.message);
  const list = (data || []).map((r) => r.students).filter(Boolean);
  Swal.fire({
    title: `Daftar Siswa (${list.length})`,
    html: list.length
      ? `<div class="text-left max-h-72 overflow-y-auto text-sm divide-y divide-slate-100">${list
          .map((s) => `<div class="py-2 flex justify-between"><span>${U.escapeHtml(s.nama)}</span><span class="text-slate-400">${U.escapeHtml(s.kelas)}</span></div>`).join('')}</div>`
      : '<p class="text-slate-400 text-sm">Tidak ada data siswa untuk booking ini.</p>',
    confirmButtonColor: '#2563eb',
  });
}

// ---- Util: kartu booking (dipakai guru) ------------------------------------
function paintBookingCards(container, rows, allowCancel) {
  if (!rows.length) { container.innerHTML = U.emptyState('Belum ada booking'); return; }
  container.innerHTML = `<div class="space-y-3">${rows.map((b) => `
    <div class="bg-white rounded-2xl border border-slate-200/70 shadow-card p-4 flex items-start gap-4">
      <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow grid place-items-center shrink-0"><i data-lucide="flask-conical" class="w-5 h-5"></i></div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="font-semibold text-slate-800">${U.bookingTitle(b)}</p>
          ${U.bookingBadge(b.status)}${U.tipeTag(b)}
        </div>
        <p class="text-sm text-slate-500 mt-0.5">${U.fmtDate(b.tanggal)} · ${U.fmtTime(b.jam_mulai)}–${U.fmtTime(b.jam_selesai)} · ${U.pesertaLabel(b)}${b.kelas ? ' · ' + U.escapeHtml(b.kelas) : ''}</p>
        ${b.keperluan ? `<p class="text-sm text-slate-400 mt-0.5">${U.escapeHtml(b.keperluan)}</p>` : ''}
        ${U.equipLine(b.booking_equipment)}
        ${b.status === 'ditolak' && b.alasan_penolakan ? `<p class="text-sm text-rose-500 mt-1">Alasan ditolak: ${U.escapeHtml(b.alasan_penolakan)}</p>` : ''}
        <div class="flex items-center gap-3 mt-2">
          ${b.tipe !== 'alat' ? `<button data-siswa="${b.id}" class="text-xs font-medium text-brand-600 hover:underline flex items-center gap-1"><i data-lucide="users" class="w-3.5 h-3.5"></i>Lihat siswa</button>` : ''}
          ${allowCancel && ['menunggu', 'disetujui'].includes(b.status)
            ? `<button data-cancel="${b.id}" class="text-xs font-medium text-rose-600 hover:underline">Batalkan</button>` : ''}
        </div>
      </div>
    </div>`).join('')}</div>`;

  container.querySelectorAll('[data-siswa]').forEach((b) => b.addEventListener('click', () => showStudents(b.dataset.siswa)));
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
