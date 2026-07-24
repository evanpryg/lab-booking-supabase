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
    confirmButtonColor: opts.danger ? '#e11d48' : '#2563eb',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
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

// ---- Badge (dengan dot) ----------------------------------------------------
const BOOK_BADGE = {
  menunggu:   ['Menunggu', 'bg-amber-50 text-amber-700 ring-amber-600/20', 'bg-amber-500'],
  disetujui:  ['Disetujui', 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', 'bg-emerald-500'],
  ditolak:    ['Ditolak', 'bg-rose-50 text-rose-700 ring-rose-600/20', 'bg-rose-500'],
  dibatalkan: ['Dibatalkan', 'bg-slate-100 text-slate-500 ring-slate-500/20', 'bg-slate-400'],
  selesai:    ['Selesai', 'bg-brand-50 text-brand-700 ring-brand-600/20', 'bg-brand-500'],
};
export const bookingBadge = (s) => {
  const [label, cls, dot] = BOOK_BADGE[s] || [s, 'bg-slate-100 text-slate-600 ring-slate-500/20', 'bg-slate-400'];
  return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${cls}">
    <span class="w-1.5 h-1.5 rounded-full ${dot}"></span>${label}</span>`;
};

const LAB_BADGE = {
  tersedia:    ['Tersedia', 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', 'bg-emerald-500'],
  dipakai:     ['Dipakai', 'bg-brand-50 text-brand-700 ring-brand-600/20', 'bg-brand-500'],
  maintenance: ['Maintenance', 'bg-amber-50 text-amber-700 ring-amber-600/20', 'bg-amber-500'],
  ditutup:     ['Ditutup', 'bg-rose-50 text-rose-700 ring-rose-600/20', 'bg-rose-500'],
};
export const labBadge = (s) => {
  const [label, cls, dot] = LAB_BADGE[s] || [s, 'bg-slate-100 text-slate-600 ring-slate-500/20', 'bg-slate-400'];
  return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${cls}">
    <span class="w-1.5 h-1.5 rounded-full ${dot}"></span>${label}</span>`;
};

// Baris alat yang dipinjam (dengan jumlah)
export const equipLine = (list) => {
  if (!list || !list.length) return '';
  const txt = list.map((be) => `${escapeHtml(be.equipment?.nama || 'Alat')} <span class="text-slate-400">×${be.jumlah}</span>`).join(', ');
  return `<p class="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5"><i data-lucide="wrench" class="w-3.5 h-3.5 text-brand-500"></i>${txt}</p>`;
};

// ---- Loading & empty -------------------------------------------------------
export const spinner = () =>
  `<div class="space-y-3">${Array(3).fill(`
     <div class="bg-white rounded-2xl border border-slate-200/70 shadow-soft p-4 flex items-center gap-4">
       <div class="skeleton w-11 h-11 rounded-xl"></div>
       <div class="flex-1 space-y-2"><div class="skeleton h-3.5 w-1/3"></div><div class="skeleton h-3 w-2/3"></div></div>
     </div>`).join('')}</div>`;

export const emptyState = (text) =>
  `<div class="flex flex-col items-center justify-center py-20 text-slate-400">
     <div class="w-16 h-16 rounded-2xl bg-slate-100 grid place-items-center mb-4"><i data-lucide="inbox" class="w-7 h-7"></i></div>
     <p class="text-sm font-medium">${text}</p>
   </div>`;

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---- Komponen kartu & tile -------------------------------------------------
export const card = (inner, cls = '') =>
  `<div class="bg-white rounded-2xl border border-slate-200/70 shadow-card ${cls}">${inner}</div>`;

const TONES = {
  blue:    'from-brand-500 to-brand-600',
  amber:   'from-amber-400 to-orange-500',
  emerald: 'from-emerald-400 to-teal-500',
  red:     'from-rose-500 to-red-500',
  violet:  'from-violet-500 to-indigo-500',
};
export const statTile = (icon, label, value, tone = 'blue') =>
  `<div class="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/70 shadow-card p-5 transition hover:shadow-float hover:-translate-y-0.5">
     <div class="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${TONES[tone]} opacity-[0.12] blur-2xl group-hover:opacity-20 transition"></div>
     <div class="relative">
       <div class="w-12 h-12 rounded-2xl grid place-items-center text-white bg-gradient-to-br ${TONES[tone]} shadow-glow">
         <i data-lucide="${icon}" class="w-[22px] h-[22px]"></i>
       </div>
       <p class="text-3xl font-bold text-slate-800 mt-4 font-display leading-none">${value}</p>
       <p class="text-[13px] text-slate-400 mt-1.5">${label}</p>
     </div>
   </div>`;

// Banner sambutan bergradasi untuk header dashboard
export const heroBanner = ({ name, subtitle, actionHtml = '' }) =>
  `<div class="relative overflow-hidden rounded-2xl p-6 md:p-7 mb-6 text-white shadow-glow
              bg-gradient-to-br from-brand-600 via-brand-600 to-indigo-600">
     <div class="absolute -top-12 -right-8 w-48 h-48 rounded-full bg-white/10 blur-2xl"></div>
     <div class="absolute -bottom-16 right-28 w-48 h-48 rounded-full bg-white/10 blur-3xl"></div>
     <div class="absolute inset-0 opacity-[0.07]" style="background-image:radial-gradient(circle at 1px 1px, #fff 1px, transparent 0);background-size:22px 22px;"></div>
     <div class="relative flex items-end justify-between gap-4 flex-wrap">
       <div>
         <p class="text-white/70 text-sm">Selamat datang,</p>
         <h2 class="text-2xl md:text-[26px] font-bold font-display tracking-tight mt-0.5">${escapeHtml(name)}</h2>
         ${subtitle ? `<p class="text-white/80 text-sm mt-1.5">${subtitle}</p>` : ''}
       </div>
       ${actionHtml}
     </div>
   </div>`;

// ---- Kerangka layout (sidebar + navbar) ------------------------------------
const NAV = {
  admin: [
    ['#/admin/dashboard', 'layout-dashboard', 'Dashboard'],
    ['#/admin/bookings', 'calendar-check', 'Booking'],
    ['#/admin/calendar', 'calendar-days', 'Kalender'],
    ['#/admin/labs', 'flask-conical', 'Laboratorium'],
    ['#/admin/equipment', 'wrench', 'Alat'],
    ['#/admin/students', 'graduation-cap', 'Siswa'],
    ['#/admin/gurus', 'users', 'Guru'],
    ['#/admin/settings', 'settings', 'Pengaturan'],
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
      return `<a href="${href}" class="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all
        ${on
          ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-glow'
          : 'text-slate-500 hover:bg-brand-50 hover:text-brand-700'}">
        <i data-lucide="${icon}" class="w-[18px] h-[18px] ${on ? '' : 'text-slate-400 group-hover:text-brand-600'}"></i>${label}</a>`;
    })
    .join('');

  const initial = escapeHtml((userName || '?').trim().charAt(0).toUpperCase());

  return `
  <div class="min-h-screen flex">
    <!-- Sidebar -->
    <aside class="hidden md:flex w-[264px] shrink-0 flex-col glass border-r border-slate-200/70 px-4 py-6">
      <div class="flex items-center gap-3 px-2 mb-8">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white shadow-glow">
          <i data-lucide="flask-conical" class="w-5 h-5"></i>
        </div>
        <div>
          <p class="font-bold text-slate-800 leading-tight font-display">Lab Sekolah</p>
          <p class="text-[11px] text-slate-400 -mt-0.5">${role === 'admin' ? 'Panel Admin' : 'Panel Guru'}</p>
        </div>
      </div>
      <p class="text-[10px] font-semibold text-slate-300 tracking-widest px-3 mb-2">MENU</p>
      <nav class="space-y-1">${items}</nav>
      <button data-logout class="mt-auto flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition">
        <i data-lucide="log-out" class="w-[18px] h-[18px]"></i>Keluar
      </button>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-16 border-b border-slate-200/60 glass flex items-center justify-between px-5 md:px-7 sticky top-0 z-20">
        <div class="flex items-center gap-3">
          <button id="btn-menu" class="md:hidden text-slate-500"><i data-lucide="menu" class="w-5 h-5"></i></button>
          <div>
            <h1 class="font-bold text-slate-800 leading-tight font-display text-[17px]">${title}</h1>
            ${subtitle ? `<p class="text-xs text-slate-400 -mt-0.5">${subtitle}</p>` : ''}
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right hidden sm:block">
            <p class="text-sm font-semibold text-slate-700 leading-tight">${escapeHtml(userName || '')}</p>
            <p class="text-[11px] text-slate-400 -mt-0.5">${role === 'admin' ? 'Administrator' : 'Guru'}</p>
          </div>
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white grid place-items-center font-bold text-sm shadow-glow ring-2 ring-white">${initial}</div>
        </div>
      </header>

      <!-- Mobile nav -->
      <nav id="mobile-nav" class="md:hidden hidden border-b border-slate-200/60 glass px-4 py-3 space-y-1">
        ${items}
        <button data-logout class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition">
          <i data-lucide="log-out" class="w-[18px] h-[18px]"></i>Keluar
        </button>
      </nav>

      <main class="flex-1 p-5 md:p-8 max-w-6xl w-full mx-auto">
        <div id="view" class="animate-fade-up">${content}</div>
      </main>
    </div>
  </div>`;
}
