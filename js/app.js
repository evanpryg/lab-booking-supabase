// ============================================================================
//  App shell: router (hash), autentikasi, halaman login, dan kerangka layout.
// ============================================================================
import { auth, db, isConfigured } from './supabase.js';
import { S, loadGuru, setGuru, clearGuru } from './session.js';
import * as U from './ui.js';
import * as Admin from './views-admin.js';
import * as Guru from './views-guru.js';

const app = document.getElementById('app');

// Peta rute → { role, active, title, subtitle, view }
const ROUTES = {
  '#/admin/dashboard': { role: 'admin', title: 'Dashboard', subtitle: 'Ringkasan aktivitas laboratorium', view: Admin.dashboard },
  '#/admin/bookings':  { role: 'admin', title: 'Manajemen Booking', subtitle: 'Setujui, tolak, atau selesaikan booking', view: Admin.bookings },
  '#/admin/calendar':  { role: 'admin', title: 'Kalender', subtitle: 'Jadwal pemakaian laboratorium', view: Admin.calendar },
  '#/admin/labs':      { role: 'admin', title: 'Laboratorium', subtitle: 'Kelola data & status lab', view: Admin.labs },
  '#/admin/equipment': { role: 'admin', title: 'Alat / Equipment', subtitle: 'Kelola inventaris alat', view: Admin.equipment },
  '#/admin/students':  { role: 'admin', title: 'Data Siswa', subtitle: 'Kelola & import daftar siswa', view: Admin.students },
  '#/admin/gurus':     { role: 'admin', title: 'Data Guru', subtitle: 'Kelola daftar guru', view: Admin.gurus },
  '#/admin/settings':  { role: 'admin', title: 'Pengaturan', subtitle: 'Kontak & pengaturan sistem', view: Admin.settings },
  '#/guru/dashboard':  { role: 'guru', title: 'Dashboard', subtitle: 'Ringkasan booking Anda', view: Guru.dashboard },
  '#/guru/new':        { role: 'guru', title: 'Buat Booking', subtitle: 'Ajukan peminjaman laboratorium', view: Guru.newBooking },
  '#/guru/bookings':   { role: 'guru', title: 'Booking Saya', subtitle: 'Riwayat & status pengajuan', view: Guru.myBookings },
  '#/guru/calendar':   { role: 'guru', title: 'Kalender', subtitle: 'Jadwal pemakaian laboratorium', view: Guru.calendar },
};

// ---- Render kerangka + jalankan view ---------------------------------------
function frame(route) {
  const userName = route.role === 'admin' ? (S.admin?.user?.email || 'Admin') : (S.guru?.nama || 'Guru');
  app.innerHTML = U.shell({
    role: route.role, active: location.hash, title: route.title, subtitle: route.subtitle,
    userName, content: U.spinner(),
  });
  U.icons();
  document.querySelectorAll('[data-logout]').forEach((b) => b.addEventListener('click', logout));
  document.getElementById('btn-menu')?.addEventListener('click', () =>
    document.getElementById('mobile-nav')?.classList.toggle('hidden'));
  if (route.role === 'guru') renderGuruFab(); else document.getElementById('guru-fab')?.remove();
  return document.getElementById('view');
}

async function logout() {
  const r = await U.confirmAction({ title: 'Keluar dari aplikasi?', confirmText: 'Keluar', danger: true, icon: 'warning' });
  if (!r.isConfirmed) return;
  if (S.admin) { await auth.signOut(); S.admin = null; }
  clearGuru();
  location.hash = '#/';
}

// ---- Floating button "Lapor Kendala" (guru → WhatsApp admin) ---------------
let waCache; // undefined=belum diambil, null=tak ada nomor, {number,nama}=ada
async function renderGuruFab() {
  if (!S.guru) return;
  if (waCache === undefined) {
    const [{ data: num }, { data: nm }] = await Promise.all([db.getSetting('wa_number'), db.getSetting('wa_nama')]);
    waCache = num?.value ? { number: num.value, nama: nm?.value || 'Admin' } : null;
  }
  if (!waCache || document.getElementById('guru-fab')) return;
  const digits = waCache.number.replace(/\D/g, '').replace(/^0/, '62');
  const msg = encodeURIComponent(
    `Halo ${waCache.nama}, saya ${S.guru.nama} (guru) ingin melaporkan kendala di laboratorium:\n\n- Jenis kendala: \n- Lab / lokasi: \n- Keterangan: `);
  const fab = document.createElement('a');
  fab.id = 'guru-fab';
  fab.href = `https://wa.me/${digits}?text=${msg}`;
  fab.target = '_blank';
  fab.rel = 'noopener';
  fab.className = 'fixed bottom-5 right-5 z-40 w-14 h-14 grid place-items-center bg-coral-500 hover:bg-coral-600 active:scale-95 text-white rounded-2xl shadow-float ring-[3px] ring-white transition-all hover:-translate-y-0.5';
  fab.title = 'Lapor kendala via WhatsApp';
  fab.setAttribute('aria-label', 'Lapor kendala via WhatsApp');
  fab.innerHTML = `<i data-lucide="message-circle" class="w-6 h-6"></i>`;
  document.body.appendChild(fab);
  U.icons();
}

// ---- Router ----------------------------------------------------------------
async function render() {
  if (!isConfigured) return renderNotConfigured();

  document.getElementById('guru-fab')?.remove(); // dibuat ulang oleh frame() bila halaman guru

  const hash = location.hash || '#/';

  // Halaman publik
  if (hash === '#/' || hash === '') return renderLanding();
  if (hash === '#/login/admin') return renderAdminLogin();
  if (hash === '#/login/guru') return renderGuruLogin();

  const route = ROUTES[hash];
  if (!route) { location.hash = '#/'; return; }

  // Guard akses
  if (route.role === 'admin' && !S.admin) { location.hash = '#/login/admin'; return; }
  if (route.role === 'guru' && !S.guru) { location.hash = '#/login/guru'; return; }

  const view = frame(route);
  try {
    await route.view(view);
  } catch (e) {
    view.innerHTML = `<div class="text-center text-red-500 py-16 text-sm">Terjadi kesalahan: ${U.escapeHtml(e.message)}</div>`;
  }
  U.icons();
}

// ---- Halaman: belum dikonfigurasi ------------------------------------------
function renderNotConfigured() {
  const code = 'bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md text-[12px] font-mono';
  app.innerHTML = authBackdrop(`
    <div class="text-center bg-white rounded-3xl border border-slate-200 shadow-float p-9">
      <div class="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 grid place-items-center mx-auto mb-5">
        <i data-lucide="settings" class="w-7 h-7"></i>
      </div>
      <h1 class="font-semibold text-slate-900 text-xl font-display">Belum dikonfigurasi</h1>
      <p class="text-[14px] text-slate-500 mt-2.5 leading-relaxed">Isi <code class="${code}">SUPABASE_URL</code> dan
      <code class="${code}">SUPABASE_ANON_KEY</code> di berkas <code class="${code}">js/config.js</code>.</p>
    </div>`);
  U.icons();
}

// ---- Halaman publik: latar & gaya bersama ----------------------------------
const FIELD = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-800 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/12 placeholder:text-slate-300';

function authBackdrop(inner, wide = false) {
  return `
    <div class="min-h-screen relative overflow-hidden grid place-items-center p-5 sm:p-6">
      <div class="absolute -top-40 -right-32 w-[34rem] h-[34rem] rounded-full bg-brand-300/25 blur-3xl animate-float-slow"></div>
      <div class="absolute -bottom-48 -left-32 w-[34rem] h-[34rem] rounded-full bg-coral-300/20 blur-3xl animate-float-slow" style="animation-delay:-5s"></div>
      <div class="absolute top-1/3 left-1/2 w-96 h-96 rounded-full bg-brand-200/15 blur-3xl"></div>
      <div class="relative w-full ${wide ? 'max-w-lg' : 'max-w-[420px]'} animate-scale-in">${inner}</div>
    </div>`;
}

const roleCard = (href, icon, title, desc, tint) => `
  <a href="${href}" class="group flex items-center gap-4 bg-white hover:bg-white border border-slate-200 rounded-2xl p-4 sm:p-5
     shadow-card hover:shadow-float hover:-translate-y-1 hover:border-brand-200 transition-all duration-300">
    <div class="w-12 h-12 rounded-2xl ${tint} grid place-items-center shrink-0 transition-transform duration-300 group-hover:scale-105">
      <i data-lucide="${icon}" class="w-[22px] h-[22px]"></i>
    </div>
    <div class="flex-1 min-w-0">
      <p class="font-semibold text-slate-900 font-display text-[15.5px]">${title}</p>
      <p class="text-[13px] text-slate-400 mt-0.5">${desc}</p>
    </div>
    <i data-lucide="arrow-right" class="w-[18px] h-[18px] text-slate-300 group-hover:text-brand-600 group-hover:translate-x-1 transition-all shrink-0"></i>
  </a>`;

function renderLanding() {
  if (S.admin) { location.hash = '#/admin/dashboard'; return; }
  if (S.guru) { location.hash = '#/guru/dashboard'; return; }
  app.innerHTML = authBackdrop(`
    <div class="text-center mb-9">
      <img src="img/logo-smasif.png" alt="Logo SMA Progresif Bumi Shalawat" class="w-20 h-20 object-contain mx-auto mb-5 drop-shadow-lg">
      <h1 class="text-[28px] leading-[1.15] font-semibold text-slate-900 font-display tracking-tight">
        Manajemen<br>Laboratorium
      </h1>
      <p class="text-[13px] text-slate-500 mt-2">SMA Progresif Bumi Shalawat</p>
      <p class="text-[13.5px] text-slate-400 mt-1">Silakan masuk sesuai peran Anda</p>
    </div>
    <div class="space-y-3">
      ${roleCard('#/login/guru', 'user', 'Masuk sebagai Guru', 'Cukup pilih nama, tanpa password', 'bg-brand-50 text-brand-600')}
      ${roleCard('#/login/admin', 'shield-check', 'Masuk sebagai Admin', 'Login dengan email & password', 'bg-coral-50 text-coral-600')}
    </div>
    <p class="text-center text-[11.5px] text-slate-400 mt-10">Islamic Boarding School · SMA Progresif Bumi Shalawat</p>`);
  U.icons();
}

// ---- Halaman: Login Admin --------------------------------------------------
function renderAdminLogin() {
  app.innerHTML = authBackdrop(`
    <div class="bg-white rounded-3xl border border-slate-200 shadow-float p-7 sm:p-9">
      <a href="#/" class="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-400 hover:text-brand-600 mb-7 transition">
        <i data-lucide="arrow-left" class="w-4 h-4"></i>Kembali</a>
      <img src="img/logo-smasif.png" alt="Logo SMASIF" class="w-14 h-14 object-contain mb-6">
      <h1 class="text-[26px] font-semibold text-slate-900 font-display tracking-tight leading-tight">Login Admin</h1>
      <p class="text-[14px] text-slate-400 mt-1.5 mb-7">Masuk untuk mengelola sistem</p>
      <form id="admin-form" class="space-y-5">
        <div>
          <label class="text-[12.5px] font-semibold text-slate-600">Email</label>
          <input name="email" type="email" required autocomplete="username" class="${FIELD}" placeholder="admin@sekolah.sch.id">
        </div>
        <div>
          <label class="text-[12.5px] font-semibold text-slate-600">Password</label>
          <input name="password" type="password" required autocomplete="current-password" class="${FIELD}" placeholder="••••••••">
        </div>
        <button type="submit" class="w-full bg-brand-600 hover:bg-brand-700 active:scale-[.98] text-white font-semibold rounded-xl py-3.5 text-[14.5px] transition-all shadow-glow flex items-center justify-center gap-2">
          <span>Masuk</span><i data-lucide="arrow-right" class="w-[18px] h-[18px]"></i>
        </button>
      </form>
    </div>`);
  U.icons();
  document.getElementById('admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const { email, password } = Object.fromEntries(new FormData(e.target));
    btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Memproses…'; U.icons();
    const { data, error } = await auth.signIn(email, password);
    if (error) { btn.disabled = false; btn.textContent = 'Masuk'; return U.alertError('Email atau password salah.'); }
    S.admin = data.session;
    location.hash = '#/admin/dashboard';
  });
}

// ---- Halaman: Login Guru (dropdown pencarian) ------------------------------
async function renderGuruLogin() {
  app.innerHTML = authBackdrop(`
    <div class="bg-white rounded-3xl border border-slate-200 shadow-float p-7 sm:p-9">
      <a href="#/" class="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-400 hover:text-brand-600 mb-7 transition">
        <i data-lucide="arrow-left" class="w-4 h-4"></i>Kembali</a>
      <img src="img/logo-smasif.png" alt="Logo SMASIF" class="w-14 h-14 object-contain mb-6">
      <h1 class="text-[26px] font-semibold text-slate-900 font-display tracking-tight leading-tight">Login Guru</h1>
      <p class="text-[14px] text-slate-400 mt-1.5 mb-6">Ketik lalu pilih nama Anda</p>
      <div class="relative">
        <i data-lucide="search" class="w-[18px] h-[18px] text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"></i>
        <input id="guru-search" type="text" placeholder="Cari nama guru…" autocomplete="off"
          class="w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white pl-11 pr-4 py-3.5 text-[14px] outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/12 placeholder:text-slate-300">
      </div>
      <div id="guru-list" class="mt-3 max-h-[19rem] overflow-y-auto space-y-1 -mr-1 pr-1">${U.spinner()}</div>
    </div>`);
  U.icons();

  const { data: gurus, error } = await db.gurus();
  const listEl = document.getElementById('guru-list');
  if (error) return listEl.innerHTML = `<p class="text-sm text-rose-500 py-4 text-center">Gagal memuat: ${U.escapeHtml(error.message)}</p>`;

  const paint = (rows) => {
    if (!rows.length) return listEl.innerHTML = U.emptyState('Nama tidak ditemukan');
    listEl.innerHTML = rows.map((g) => `
      <button data-id="${g.id}" data-nama="${U.escapeHtml(g.nama)}"
        class="group w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-brand-50 border border-transparent hover:border-brand-100 transition">
        <div class="w-9 h-9 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-semibold text-[13px] shrink-0">${U.escapeHtml(g.nama.charAt(0))}</div>
        <div class="min-w-0 flex-1">
          <p class="text-[14px] font-semibold text-slate-800 truncate">${U.escapeHtml(g.nama)}</p>
          <p class="text-[11.5px] text-slate-400 truncate">${U.escapeHtml(g.mapel || '')}</p>
        </div>
        <i data-lucide="arrow-right" class="w-4 h-4 text-slate-200 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all shrink-0"></i>
      </button>`).join('');
    U.icons();
    listEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      setGuru({ id: b.dataset.id, nama: b.dataset.nama });
      location.hash = '#/guru/dashboard';
    }));
  };
  paint(gurus);
  document.getElementById('guru-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    paint(gurus.filter((g) => g.nama.toLowerCase().includes(q) || (g.mapel || '').toLowerCase().includes(q)));
  });
}

// ---- Bootstrap -------------------------------------------------------------
async function boot() {
  loadGuru();
  if (isConfigured) S.admin = await auth.session();
  window.addEventListener('hashchange', render);
  render();
}
boot();
