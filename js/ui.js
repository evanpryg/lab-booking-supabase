// ============================================================================
//  Helper UI: notifikasi, format, badge, dan kerangka layout (sidebar + navbar)
// ============================================================================
const Swal = window.Swal;

export const toast = (icon, title) =>
  Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: 2600, timerProgressBar: true });

export const alertError = (msg) =>
  Swal.fire({ icon: 'error', title: 'Gagal', text: msg, confirmButtonColor: '#2563eb' });

export const alertOk = (msg) =>
  Swal.fire({ icon: 'success', title: 'Berhasil', text: msg, confirmButtonColor: '#2563eb' });

export const confirmAction = (opts) =>
  Swal.fire({
    icon: opts.icon || 'question',
    title: opts.title,
    text: opts.text,
    showCancelButton: true,
    confirmButtonText: opts.confirmText || 'Ya',
    cancelButtonText: 'Batal',
    confirmButtonColor: opts.danger ? '#dc2626' : '#2563eb',
    cancelButtonColor: '#6b7280',
  });

export const icons = () => window.lucide?.createIcons();

// ---- Format ----------------------------------------------------------------
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function fmtDate(d) {
  if (!d) return '-';
  const [y, m, day] = d.split('-').map(Number);
  const dt = new Date(y, m - 1, day);
  return `${HARI[dt.getDay()]}, ${day} ${BULAN[m - 1]} ${y}`;
}
export const fmtTime = (t) => (t ? t.slice(0, 5) : '-');
export const todayISO = () => {
  const n = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

// ---- Badge -----------------------------------------------------------------
const BOOK_BADGE = {
  menunggu:   ['Menunggu Persetujuan', 'bg-amber-100 text-amber-700'],
  disetujui:  ['Disetujui', 'bg-emerald-100 text-emerald-700'],
  ditolak:    ['Ditolak', 'bg-red-100 text-red-700'],
  dibatalkan: ['Dibatalkan', 'bg-gray-200 text-gray-600'],
  selesai:    ['Selesai', 'bg-blue-100 text-blue-700'],
};
export const bookingBadge = (s) => {
  const [label, cls] = BOOK_BADGE[s] || [s, 'bg-gray-100 text-gray-600'];
  return `<span class="px-2.5 py-1 rounded-full text-xs font-medium ${cls}">${label}</span>`;
};

const LAB_BADGE = {
  tersedia:    ['Tersedia', 'bg-emerald-100 text-emerald-700'],
  dipakai:     ['Dipakai', 'bg-blue-100 text-blue-700'],
  maintenance: ['Maintenance', 'bg-amber-100 text-amber-700'],
  ditutup:     ['Ditutup', 'bg-red-100 text-red-700'],
};
export const labBadge = (s) => {
  const [label, cls] = LAB_BADGE[s] || [s, 'bg-gray-100 text-gray-600'];
  return `<span class="px-2.5 py-1 rounded-full text-xs font-medium ${cls}">${label}</span>`;
};

export const spinner = () =>
  `<div class="flex items-center justify-center py-20 text-gray-400">
     <i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i>
     <span class="ml-2 text-sm">Memuat…</span>
   </div>`;

export const emptyState = (text) =>
  `<div class="flex flex-col items-center justify-center py-16 text-gray-400">
     <i data-lucide="inbox" class="w-10 h-10 mb-3"></i>
     <p class="text-sm">${text}</p>
   </div>`;

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---- Kerangka layout (sidebar + navbar) ------------------------------------
const NAV = {
  admin: [
    ['#/admin/dashboard', 'layout-dashboard', 'Dashboard'],
    ['#/admin/bookings', 'calendar-check', 'Booking'],
    ['#/admin/calendar', 'calendar-days', 'Kalender'],
    ['#/admin/labs', 'flask-conical', 'Laboratorium'],
    ['#/admin/equipment', 'wrench', 'Alat'],
    ['#/admin/gurus', 'users', 'Guru'],
  ],
  guru: [
    ['#/guru/dashboard', 'layout-dashboard', 'Dashboard'],
    ['#/guru/new', 'plus-circle', 'Buat Booking'],
    ['#/guru/bookings', 'calendar-check', 'Booking Saya'],
    ['#/guru/calendar', 'calendar-days', 'Kalender'],
  ],
};

export function shell({ role, active, title, subtitle, userName, content }) {
  const items = NAV[role]
    .map(([href, icon, label]) => {
      const on = active === href;
      return `<a href="${href}" class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition
        ${on ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'}">
        <i data-lucide="${icon}" class="w-[18px] h-[18px]"></i>${label}</a>`;
    })
    .join('');

  return `
  <div class="min-h-screen flex bg-slate-50">
    <!-- Sidebar -->
    <aside class="hidden md:flex w-64 shrink-0 flex-col border-r border-gray-100 bg-white px-4 py-5">
      <div class="flex items-center gap-2.5 px-2 mb-6">
        <div class="w-9 h-9 rounded-xl bg-blue-600 grid place-items-center text-white">
          <i data-lucide="flask-conical" class="w-5 h-5"></i>
        </div>
        <div>
          <p class="font-semibold text-gray-800 leading-tight">Lab Sekolah</p>
          <p class="text-[11px] text-gray-400 -mt-0.5">${role === 'admin' ? 'Panel Admin' : 'Panel Guru'}</p>
        </div>
      </div>
      <nav class="space-y-1">${items}</nav>
      <button id="btn-logout" class="mt-auto flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50">
        <i data-lucide="log-out" class="w-[18px] h-[18px]"></i>Keluar
      </button>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-16 border-b border-gray-100 bg-white/80 backdrop-blur flex items-center justify-between px-5 sticky top-0 z-10">
        <div class="flex items-center gap-3">
          <button id="btn-menu" class="md:hidden text-gray-500"><i data-lucide="menu" class="w-5 h-5"></i></button>
          <div>
            <h1 class="font-semibold text-gray-800 leading-tight">${title}</h1>
            ${subtitle ? `<p class="text-xs text-gray-400 -mt-0.5">${subtitle}</p>` : ''}
          </div>
        </div>
        <div class="flex items-center gap-2.5">
          <div class="text-right hidden sm:block">
            <p class="text-sm font-medium text-gray-700 leading-tight">${escapeHtml(userName || '')}</p>
            <p class="text-[11px] text-gray-400 -mt-0.5">${role === 'admin' ? 'Administrator' : 'Guru'}</p>
          </div>
          <div class="w-9 h-9 rounded-full bg-blue-100 text-blue-700 grid place-items-center font-semibold text-sm">
            ${escapeHtml((userName || '?').trim().charAt(0).toUpperCase())}
          </div>
        </div>
      </header>

      <!-- Mobile nav -->
      <nav id="mobile-nav" class="md:hidden hidden border-b border-gray-100 bg-white px-4 py-2 space-y-1">${items}</nav>

      <main class="flex-1 p-5 md:p-7 max-w-6xl w-full mx-auto">${content}</main>
    </div>
  </div>`;
}

export const card = (inner, cls = '') =>
  `<div class="bg-white rounded-2xl border border-gray-100 shadow-sm ${cls}">${inner}</div>`;

export const statTile = (icon, label, value, tone = 'blue') => {
  const tones = {
    blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600', red: 'bg-red-50 text-red-600',
  };
  return card(`
    <div class="p-5 flex items-center gap-4">
      <div class="w-11 h-11 rounded-xl grid place-items-center ${tones[tone]}"><i data-lucide="${icon}" class="w-5 h-5"></i></div>
      <div>
        <p class="text-2xl font-bold text-gray-800 leading-none">${value}</p>
        <p class="text-xs text-gray-400 mt-1">${label}</p>
      </div>
    </div>`);
};
