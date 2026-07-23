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
    userName, content: `<div id="view">${U.spinner()}</div>`,
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
function renderLanding() {
  if (S.admin) { location.hash = '#/admin/dashboard'; return; }
  if (S.guru) { location.hash = '#/guru/dashboard'; return; }
  app.innerHTML = `
    <div class="min-h-screen grid place-items-center bg-gradient-to-b from-blue-50 to-slate-50 p-6">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="w-14 h-14 rounded-2xl bg-blue-600 grid place-items-center text-white mx-auto mb-4 shadow-lg shadow-blue-200">
            <i data-lucide="flask-conical" class="w-7 h-7"></i>
          </div>
          <h1 class="text-2xl font-bold text-gray-800">Sistem Manajemen Laboratorium</h1>
          <p class="text-gray-500 mt-1">Silakan masuk sesuai peran Anda</p>
        </div>
        <div class="space-y-3">
          <a href="#/login/guru" class="flex items-center gap-4 bg-white hover:border-blue-300 border border-gray-100 rounded-2xl p-5 shadow-sm transition group">
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 grid place-items-center"><i data-lucide="user" class="w-6 h-6"></i></div>
            <div class="flex-1"><p class="font-semibold text-gray-800">Masuk sebagai Guru</p><p class="text-sm text-gray-400">Cukup pilih nama, tanpa password</p></div>
            <i data-lucide="chevron-right" class="w-5 h-5 text-gray-300 group-hover:text-blue-500"></i>
          </a>
          <a href="#/login/admin" class="flex items-center gap-4 bg-white hover:border-blue-300 border border-gray-100 rounded-2xl p-5 shadow-sm transition group">
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 grid place-items-center"><i data-lucide="shield-check" class="w-6 h-6"></i></div>
            <div class="flex-1"><p class="font-semibold text-gray-800">Masuk sebagai Admin</p><p class="text-sm text-gray-400">Login dengan email & password</p></div>
            <i data-lucide="chevron-right" class="w-5 h-5 text-gray-300 group-hover:text-blue-500"></i>
          </a>
        </div>
      </div>
    </div>`;
  U.icons();
}

// ---- Halaman: Login Admin --------------------------------------------------
function renderAdminLogin() {
  app.innerHTML = `
    <div class="min-h-screen grid place-items-center bg-gradient-to-b from-blue-50 to-slate-50 p-6">
      <div class="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
        <a href="#/" class="text-sm text-gray-400 hover:text-blue-600 flex items-center gap-1 mb-5"><i data-lucide="arrow-left" class="w-4 h-4"></i>Kembali</a>
        <div class="w-12 h-12 rounded-xl bg-blue-600 text-white grid place-items-center mb-4"><i data-lucide="shield-check" class="w-6 h-6"></i></div>
        <h1 class="text-xl font-bold text-gray-800">Login Admin</h1>
        <p class="text-sm text-gray-400 mb-5">Masuk untuk mengelola sistem</p>
        <form id="admin-form" class="space-y-3">
          <div>
            <label class="text-xs font-medium text-gray-500">Email</label>
            <input name="email" type="email" required autocomplete="username"
              class="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="admin@sekolah.sch.id">
          </div>
          <div>
            <label class="text-xs font-medium text-gray-500">Password</label>
            <input name="password" type="password" required autocomplete="current-password"
              class="mt-1 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="••••••••">
          </div>
          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl py-2.5 text-sm transition flex items-center justify-center gap-2">
            <span>Masuk</span>
          </button>
        </form>
      </div>
    </div>`;
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
  app.innerHTML = `
    <div class="min-h-screen grid place-items-center bg-gradient-to-b from-blue-50 to-slate-50 p-6">
      <div class="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
        <a href="#/" class="text-sm text-gray-400 hover:text-blue-600 flex items-center gap-1 mb-5"><i data-lucide="arrow-left" class="w-4 h-4"></i>Kembali</a>
        <div class="w-12 h-12 rounded-xl bg-blue-600 text-white grid place-items-center mb-4"><i data-lucide="user" class="w-6 h-6"></i></div>
        <h1 class="text-xl font-bold text-gray-800">Login Guru</h1>
        <p class="text-sm text-gray-400 mb-5">Ketik lalu pilih nama Anda</p>
        <div class="relative">
          <i data-lucide="search" class="w-4 h-4 text-gray-400 absolute left-3 top-3"></i>
          <input id="guru-search" type="text" placeholder="Cari nama guru…" autocomplete="off"
            class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
        </div>
        <div id="guru-list" class="mt-2 max-h-72 overflow-y-auto space-y-1">${U.spinner()}</div>
      </div>
    </div>`;
  U.icons();

  const { data: gurus, error } = await db.gurus();
  const listEl = document.getElementById('guru-list');
  if (error) return listEl.innerHTML = `<p class="text-sm text-red-500 py-4 text-center">Gagal memuat: ${U.escapeHtml(error.message)}</p>`;

  const paint = (rows) => {
    if (!rows.length) return listEl.innerHTML = U.emptyState('Nama tidak ditemukan');
    listEl.innerHTML = rows.map((g) => `
      <button data-id="${g.id}" data-nama="${U.escapeHtml(g.nama)}"
        class="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition">
        <div class="w-9 h-9 rounded-full bg-blue-100 text-blue-700 grid place-items-center font-semibold text-sm">${U.escapeHtml(g.nama.charAt(0))}</div>
        <div><p class="text-sm font-medium text-gray-700">${U.escapeHtml(g.nama)}</p>
        <p class="text-[11px] text-gray-400">${U.escapeHtml(g.mapel || '')}</p></div>
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
