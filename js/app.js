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
  '#/admin/gurus':     { role: 'admin', title: 'Data Guru', subtitle: 'Kelola daftar guru', view: Admin.gurus },
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
  document.getElementById('btn-logout')?.addEventListener('click', logout);
  document.getElementById('btn-menu')?.addEventListener('click', () =>
    document.getElementById('mobile-nav')?.classList.toggle('hidden'));
  return document.getElementById('view');
}

async function logout() {
  const r = await U.confirmAction({ title: 'Keluar dari aplikasi?', confirmText: 'Keluar', danger: true, icon: 'warning' });
  if (!r.isConfirmed) return;
  if (S.admin) { await auth.signOut(); S.admin = null; }
  clearGuru();
  location.hash = '#/';
}

// ---- Router ----------------------------------------------------------------
async function render() {
  if (!isConfigured) return renderNotConfigured();

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
  app.innerHTML = `
    <div class="min-h-screen grid place-items-center bg-slate-50 p-6">
      <div class="max-w-md text-center bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 grid place-items-center mx-auto mb-4">
          <i data-lucide="settings" class="w-6 h-6"></i>
        </div>
        <h1 class="font-semibold text-gray-800 text-lg">Belum dikonfigurasi</h1>
        <p class="text-sm text-gray-500 mt-2">Isi <code class="bg-gray-100 px-1.5 py-0.5 rounded">SUPABASE_URL</code> dan
        <code class="bg-gray-100 px-1.5 py-0.5 rounded">SUPABASE_ANON_KEY</code> di berkas
        <code class="bg-gray-100 px-1.5 py-0.5 rounded">js/config.js</code>.</p>
      </div>
    </div>`;
  U.icons();
}

// ---- Halaman: Landing (pilih peran) ----------------------------------------
function authBackdrop(inner) {
  return `
    <div class="min-h-screen relative overflow-hidden grid place-items-center p-6
                bg-gradient-to-br from-brand-50 via-white to-indigo-50">
      <div class="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-200/40 blur-3xl animate-float-slow"></div>
      <div class="absolute -bottom-32 -left-24 w-96 h-96 rounded-full bg-indigo-200/40 blur-3xl animate-float-slow" style="animation-delay:-4s"></div>
      <div class="relative w-full max-w-md animate-scale-in">${inner}</div>
    </div>`;
}

function renderLanding() {
  if (S.admin) { location.hash = '#/admin/dashboard'; return; }
  if (S.guru) { location.hash = '#/guru/dashboard'; return; }
  app.innerHTML = authBackdrop(`
    <div class="text-center mb-9">
      <div class="w-16 h-16 rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white mx-auto mb-5 shadow-glow">
        <i data-lucide="flask-conical" class="w-8 h-8"></i>
      </div>
      <h1 class="text-[26px] font-bold text-slate-800 font-display tracking-tight">Manajemen Laboratorium</h1>
      <p class="text-slate-500 mt-1.5">Silakan masuk sesuai peran Anda</p>
    </div>
    <div class="space-y-3.5">
      <a href="#/login/guru" class="flex items-center gap-4 bg-white/80 glass hover:bg-white border border-slate-200/70 rounded-2xl p-5 shadow-card hover:shadow-float hover:-translate-y-0.5 transition-all group">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white grid place-items-center shadow-glow"><i data-lucide="user" class="w-6 h-6"></i></div>
        <div class="flex-1"><p class="font-bold text-slate-800 font-display">Masuk sebagai Guru</p><p class="text-sm text-slate-400">Cukup pilih nama, tanpa password</p></div>
        <i data-lucide="arrow-right" class="w-5 h-5 text-slate-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition"></i>
      </a>
      <a href="#/login/admin" class="flex items-center gap-4 bg-white/80 glass hover:bg-white border border-slate-200/70 rounded-2xl p-5 shadow-card hover:shadow-float hover:-translate-y-0.5 transition-all group">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white grid place-items-center shadow-glow"><i data-lucide="shield-check" class="w-6 h-6"></i></div>
        <div class="flex-1"><p class="font-bold text-slate-800 font-display">Masuk sebagai Admin</p><p class="text-sm text-slate-400">Login dengan email & password</p></div>
        <i data-lucide="arrow-right" class="w-5 h-5 text-slate-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition"></i>
      </a>
    </div>
    <p class="text-center text-xs text-slate-400 mt-8">Sistem Manajemen Laboratorium Sekolah</p>`);
  U.icons();
}

// ---- Halaman: Login Admin --------------------------------------------------
function renderAdminLogin() {
  const inp = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15';
  app.innerHTML = authBackdrop(`
    <div class="bg-white/90 glass rounded-3xl border border-slate-200/70 shadow-float p-8">
      <a href="#/" class="text-sm text-slate-400 hover:text-brand-600 flex items-center gap-1 mb-6 transition"><i data-lucide="arrow-left" class="w-4 h-4"></i>Kembali</a>
      <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white grid place-items-center mb-5 shadow-glow"><i data-lucide="shield-check" class="w-7 h-7"></i></div>
      <h1 class="text-2xl font-bold text-slate-800 font-display tracking-tight">Login Admin</h1>
      <p class="text-sm text-slate-400 mb-6">Masuk untuk mengelola sistem</p>
      <form id="admin-form" class="space-y-4">
        <div>
          <label class="text-xs font-semibold text-slate-500">Email</label>
          <input name="email" type="email" required autocomplete="username" class="${inp}" placeholder="admin@sekolah.sch.id">
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-500">Password</label>
          <input name="password" type="password" required autocomplete="current-password" class="${inp}" placeholder="••••••••">
        </div>
        <button type="submit" class="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:to-brand-600 text-white font-semibold rounded-xl py-3 text-sm transition shadow-glow flex items-center justify-center gap-2">
          <span>Masuk</span><i data-lucide="arrow-right" class="w-4 h-4"></i>
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
    <div class="bg-white/90 glass rounded-3xl border border-slate-200/70 shadow-float p-8">
      <a href="#/" class="text-sm text-slate-400 hover:text-brand-600 flex items-center gap-1 mb-6 transition"><i data-lucide="arrow-left" class="w-4 h-4"></i>Kembali</a>
      <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white grid place-items-center mb-5 shadow-glow"><i data-lucide="user" class="w-7 h-7"></i></div>
      <h1 class="text-2xl font-bold text-slate-800 font-display tracking-tight">Login Guru</h1>
      <p class="text-sm text-slate-400 mb-5">Ketik lalu pilih nama Anda</p>
      <div class="relative">
        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"></i>
        <input id="guru-search" type="text" placeholder="Cari nama guru…" autocomplete="off"
          class="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15">
      </div>
      <div id="guru-list" class="mt-3 max-h-72 overflow-y-auto space-y-1 pr-1">${U.spinner()}</div>
    </div>`);
  U.icons();

  const { data: gurus, error } = await db.gurus();
  const listEl = document.getElementById('guru-list');
  if (error) return listEl.innerHTML = `<p class="text-sm text-rose-500 py-4 text-center">Gagal memuat: ${U.escapeHtml(error.message)}</p>`;

  const paint = (rows) => {
    if (!rows.length) return listEl.innerHTML = U.emptyState('Nama tidak ditemukan');
    listEl.innerHTML = rows.map((g) => `
      <button data-id="${g.id}" data-nama="${U.escapeHtml(g.nama)}"
        class="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-brand-50 border border-transparent hover:border-brand-100 transition">
        <div class="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white grid place-items-center font-semibold text-sm shadow-soft">${U.escapeHtml(g.nama.charAt(0))}</div>
        <div><p class="text-sm font-semibold text-slate-700">${U.escapeHtml(g.nama)}</p>
        <p class="text-[11px] text-slate-400">${U.escapeHtml(g.mapel || '')}</p></div>
      </button>`).join('');
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
