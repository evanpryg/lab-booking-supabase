// ============================================================================
//  Helper UI — Sistem desain "Soft Aurora"
//  Kanvas krem hangat · kartu putih sudut besar · aksen teal + koral.
//  Catatan: seluruh nama fungsi & tanda tangannya dipertahankan agar tidak ada
//  fitur yang berubah — yang dirombak hanya lapisan visualnya.
// ============================================================================
const Swal = window.Swal;

const TEAL = '#0F766E';
const CORAL = '#DE5433';

export const toast = (icon, title) =>
  Swal.fire({ toast: true, position: 'top-end', icon, title, showConfirmButton: false, timer: 2800, timerProgressBar: true });

export const alertError = (msg) =>
  Swal.fire({ icon: 'error', title: 'Gagal', text: msg, confirmButtonColor: TEAL });

export const alertOk = (msg) =>
  Swal.fire({ icon: 'success', title: 'Berhasil', text: msg, confirmButtonColor: TEAL });

export const confirmAction = (opts) =>
  Swal.fire({
    icon: opts.icon || 'question',
    title: opts.title,
    text: opts.text,
    showCancelButton: true,
    confirmButtonText: opts.confirmText || 'Ya',
    cancelButtonText: 'Batal',
    confirmButtonColor: opts.danger ? CORAL : TEAL,
    cancelButtonColor: '#F4F2EE',
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
export const nowTime = () => {
  const n = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
};
export const todayISO = () => {
  const n = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

// ---- Badge -----------------------------------------------------------------
// Pil lembut: latar tint tipis, teks pekat, titik warna sebagai penanda cepat.
const pill = (label, tint, ink, dot) =>
  `<span class="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-[3px] rounded-full text-[11.5px] font-semibold ${tint} ${ink}">
     <span class="w-1.5 h-1.5 rounded-full ${dot}"></span>${label}</span>`;

const BOOK_BADGE = {
  menunggu:   ['Menunggu', 'bg-amber-50', 'text-amber-700', 'bg-amber-400'],
  disetujui:  ['Disetujui', 'bg-emerald-50', 'text-emerald-700', 'bg-emerald-500'],
  ditolak:    ['Ditolak', 'bg-coral-50', 'text-coral-700', 'bg-coral-500'],
  dibatalkan: ['Dibatalkan', 'bg-slate-100', 'text-slate-500', 'bg-slate-400'],
  selesai:    ['Selesai', 'bg-brand-50', 'text-brand-700', 'bg-brand-500'],
};
export const bookingBadge = (s) => {
  const [l, t, i, d] = BOOK_BADGE[s] || [s, 'bg-slate-100', 'text-slate-600', 'bg-slate-400'];
  return pill(l, t, i, d);
};

const LAB_BADGE = {
  tersedia:    ['Tersedia', 'bg-emerald-50', 'text-emerald-700', 'bg-emerald-500'],
  dipakai:     ['Dipakai', 'bg-brand-50', 'text-brand-700', 'bg-brand-500'],
  maintenance: ['Maintenance', 'bg-amber-50', 'text-amber-700', 'bg-amber-400'],
  ditutup:     ['Ditutup', 'bg-coral-50', 'text-coral-700', 'bg-coral-500'],
};
export const labBadge = (s) => {
  const [l, t, i, d] = LAB_BADGE[s] || [s, 'bg-slate-100', 'text-slate-600', 'bg-slate-400'];
  return pill(l, t, i, d);
};

const KOND_BADGE = {
  baik:         ['Baik', 'bg-emerald-50', 'text-emerald-700', 'bg-emerald-500'],
  rusak_ringan: ['Rusak Ringan', 'bg-amber-50', 'text-amber-700', 'bg-amber-400'],
  rusak_berat:  ['Rusak Berat', 'bg-coral-50', 'text-coral-700', 'bg-coral-500'],
  hilang:       ['Hilang', 'bg-slate-100', 'text-slate-600', 'bg-slate-400'],
};
export const kondisiBadge = (k) => {
  const [l, t, i, d] = KOND_BADGE[k] || [k, 'bg-slate-100', 'text-slate-600', 'bg-slate-400'];
  return pill(l, t, i, d);
};

// ---- Stok alat (jumlah per kondisi, bukan label global) --------------------
export const stok = (e) => {
  const total = e.jumlah || 0;
  const rr = e.rusak_ringan || 0, rb = e.rusak_berat || 0, hl = e.hilang || 0;
  return {
    total, rr, rb, hl,
    baik: Math.max(0, total - rr - rb - hl),
    siap: Math.max(0, total - rb - hl), // rusak ringan masih bisa dipakai
  };
};

export const stokBadges = (e) => {
  const s = stok(e);
  const items = [];
  if (s.baik) items.push(['Baik', s.baik, 'bg-emerald-50', 'text-emerald-700', 'bg-emerald-500']);
  if (s.rr) items.push(['Rusak Ringan', s.rr, 'bg-amber-50', 'text-amber-700', 'bg-amber-400']);
  if (s.rb) items.push(['Rusak Berat', s.rb, 'bg-coral-50', 'text-coral-700', 'bg-coral-500']);
  if (s.hl) items.push(['Hilang', s.hl, 'bg-slate-100', 'text-slate-600', 'bg-slate-400']);
  if (!items.length) return `<span class="text-xs text-slate-400">—</span>`;
  return `<div class="flex flex-wrap gap-1.5">${items
    .map(([l, n, t, i, d]) => pill(`${l} <span class="opacity-60">·</span> ${n}`, t, i, d))
    .join('')}</div>`;
};

export const stokRingkas = (e) => {
  const s = stok(e);
  const parts = [`Baik ${s.baik}`];
  if (s.rr) parts.push(`Rusak Ringan ${s.rr}`);
  if (s.rb) parts.push(`Rusak Berat ${s.rb}`);
  if (s.hl) parts.push(`Hilang ${s.hl}`);
  return `${parts.join(' · ')} (total ${s.total})`;
};

// ---- Penanda booking -------------------------------------------------------
export const bookingTitle = (b) => escapeHtml(b.laboratories?.nama || (b.tipe === 'alat' ? 'Peminjaman Alat' : '-'));

export const pesertaLabel = (b) => (b.tipe === 'alat' ? 'Pinjam alat' : `${b.jumlah_peserta} peserta`);

export const tipeTag = (b) =>
  b.tipe === 'alat'
    ? `<span class="px-2 py-[3px] rounded-full text-[10.5px] font-semibold bg-coral-50 text-coral-700">Pinjam Alat</span>`
    : '';

export const equipLine = (list) => {
  if (!list || !list.length) return '';
  const txt = list
    .map((be) => `${escapeHtml(be.equipment?.nama || 'Alat')}<span class="text-slate-400 font-normal"> ×${be.jumlah} ${escapeHtml(be.equipment?.satuan || 'pcs')}</span>`)
    .join('<span class="text-slate-300"> · </span>');
  return `<p class="text-[12.5px] text-slate-600 font-medium mt-2 flex items-start gap-1.5">
    <i data-lucide="package" class="w-3.5 h-3.5 text-brand-500 mt-[3px] shrink-0"></i><span>${txt}</span></p>`;
};

// ---- Loading & empty -------------------------------------------------------
export const spinner = () =>
  `<div class="space-y-3">${Array(3).fill(`
     <div class="bg-white rounded-2xl border border-slate-200 shadow-soft p-4 flex items-center gap-4">
       <div class="skeleton w-12 h-12 rounded-2xl"></div>
       <div class="flex-1 space-y-2.5">
         <div class="skeleton h-3.5 w-1/3"></div>
         <div class="skeleton h-3 w-2/3"></div>
       </div>
     </div>`).join('')}</div>`;

export const emptyState = (text) =>
  `<div class="flex flex-col items-center justify-center py-20 px-6 text-center">
     <div class="relative mb-5">
       <div class="absolute inset-0 bg-brand-200/40 blur-2xl rounded-full"></div>
       <div class="relative w-16 h-16 rounded-3xl bg-white border border-slate-200 shadow-soft grid place-items-center text-brand-500">
         <i data-lucide="inbox" class="w-7 h-7"></i>
       </div>
     </div>
     <p class="text-[15px] font-semibold text-slate-700 font-display">${text}</p>
     <p class="text-[13px] text-slate-400 mt-1">Data akan muncul di sini setelah tersedia.</p>
   </div>`;

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---- Kartu & tile ----------------------------------------------------------
export const card = (inner, cls = '') =>
  `<div class="bg-white rounded-2xl border border-slate-200 shadow-card ${cls}">${inner}</div>`;

// Tint lembut per nada warna (bukan gradasi tajam) — ciri khas Soft Aurora.
const TONES = {
  blue:    ['bg-brand-50', 'text-brand-600', 'rgba(15,118,110,.16)'],
  amber:   ['bg-amber-50', 'text-amber-600', 'rgba(245,158,11,.16)'],
  emerald: ['bg-emerald-50', 'text-emerald-600', 'rgba(16,185,129,.16)'],
  red:     ['bg-coral-50', 'text-coral-600', 'rgba(242,107,71,.18)'],
  violet:  ['bg-violet-50', 'text-violet-600', 'rgba(139,92,246,.16)'],
};

export const statTile = (icon, label, value, tone = 'blue') => {
  const [tint, ink, glow] = TONES[tone] || TONES.blue;
  return `
  <div class="group relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-card p-5
              transition duration-300 hover:shadow-float hover:-translate-y-1">
    <div class="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-70 transition-opacity duration-300 group-hover:opacity-100"
         style="background:${glow}"></div>
    <div class="relative flex items-start justify-between gap-3">
      <div class="w-11 h-11 rounded-2xl grid place-items-center ${tint} ${ink}">
        <i data-lucide="${icon}" class="w-5 h-5"></i>
      </div>
    </div>
    <p class="relative text-[32px] leading-none font-semibold text-slate-900 mt-5 font-display tabular-nums">${value}</p>
    <p class="relative text-[13px] text-slate-500 mt-2 font-medium">${label}</p>
  </div>`;
};

// ---- Banner sambutan -------------------------------------------------------
export const heroBanner = ({ name, subtitle, actionHtml = '' }) =>
  `<div class="relative overflow-hidden rounded-3xl p-7 md:p-9 mb-6 text-white shadow-float
              bg-[linear-gradient(135deg,#0F766E_0%,#0C5E58_52%,#134E4A_100%)]">
     <div class="absolute -top-24 -right-10 w-72 h-72 rounded-full bg-brand-300/25 blur-3xl"></div>
     <div class="absolute -bottom-28 left-16 w-72 h-72 rounded-full bg-coral-400/20 blur-3xl"></div>
     <div class="absolute inset-0 opacity-[0.06]"
          style="background-image:radial-gradient(circle at 1px 1px,#fff 1px,transparent 0);background-size:24px 24px;"></div>
     <div class="relative flex items-end justify-between gap-5 flex-wrap">
       <div class="min-w-0">
         <p class="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase
                   text-white/70 bg-white/10 rounded-full pl-2 pr-3 py-1 backdrop-blur-sm">
           <span class="w-1.5 h-1.5 rounded-full bg-brand-200"></span>Selamat datang
         </p>
         <h2 class="text-[26px] md:text-[32px] font-semibold font-display tracking-tight mt-3 leading-tight break-words">
           ${escapeHtml(name)}
         </h2>
         ${subtitle ? `<p class="text-white/70 text-sm mt-2 max-w-md leading-relaxed">${subtitle}</p>` : ''}
       </div>
       ${actionHtml}
     </div>
   </div>`;

// ---- Kerangka layout (sidebar melayang + navbar) ---------------------------
const NAV = {
  admin: [
    ['#/admin/dashboard', 'layout-dashboard', 'Dashboard'],
    ['#/admin/bookings', 'calendar-check', 'Booking'],
    ['#/admin/calendar', 'calendar-days', 'Kalender'],
    ['#/admin/labs', 'flask-conical', 'Laboratorium'],
    ['#/admin/equipment', 'package', 'Alat & Bahan'],
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

const navItems = (role, active) =>
  NAV[role]
    .map(([href, icon, label]) => {
      const on = active === href;
      return `<a href="${href}" class="group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all duration-200
        ${on ? 'bg-brand-600 text-white shadow-glow' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'}">
        <i data-lucide="${icon}" class="w-[18px] h-[18px] shrink-0 ${on ? 'text-white' : 'text-slate-400 group-hover:text-brand-600'}"></i>
        <span class="truncate">${label}</span>
        ${on ? `<span class="ml-auto w-1.5 h-1.5 rounded-full bg-white/70"></span>` : ''}
      </a>`;
    })
    .join('');

const brandMark = (role, compact = false) => `
  <div class="flex items-center gap-3 ${compact ? '' : 'px-1.5'}">
    <img src="img/logo-smasif.png" alt="Logo SMASIF" class="w-10 h-10 rounded-xl object-contain shrink-0">
    <div class="min-w-0">
      <p class="font-semibold text-slate-900 leading-tight font-display text-[14px]">SMA Progresif</p>
      <p class="text-[11px] text-slate-400 leading-tight mt-0.5">${role === 'admin' ? 'Panel Admin' : 'Panel Guru'}</p>
    </div>
  </div>`;

const logoutBtn = (extra = '') => `
  <button data-logout class="${extra} flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold
         text-slate-500 hover:text-coral-700 hover:bg-coral-50 transition-colors">
    <i data-lucide="log-out" class="w-[18px] h-[18px]"></i>Keluar
  </button>`;

export function shell({ role, active, title, subtitle, userName, content }) {
  const items = navItems(role, active);
  const initial = escapeHtml((userName || '?').trim().charAt(0).toUpperCase());
  const roleLabel = role === 'admin' ? 'Administrator' : 'Guru';

  return `
  <div class="min-h-screen flex">

    <!-- Sidebar melayang -->
    <aside class="hidden md:block w-[272px] shrink-0 p-3 pr-0">
      <div class="sticky top-3 flex flex-col h-[calc(100vh-1.5rem)] bg-white rounded-3xl border border-slate-200 shadow-card px-3.5 py-5">
        ${brandMark(role)}

        <p class="text-[10px] font-bold text-slate-300 tracking-[0.14em] px-3.5 mt-8 mb-2.5">MENU</p>
        <nav class="space-y-1 overflow-y-auto no-scrollbar">${items}</nav>

        <div class="mt-auto pt-4">
          <div class="flex items-center gap-3 px-2.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 mb-1.5">
            <div class="w-9 h-9 rounded-full bg-brand-600 text-white grid place-items-center font-semibold text-[13px] shrink-0">${initial}</div>
            <div class="min-w-0">
              <p class="text-[13px] font-semibold text-slate-800 truncate leading-tight">${escapeHtml(userName || '')}</p>
              <p class="text-[11px] text-slate-400 leading-tight mt-0.5">${roleLabel}</p>
            </div>
          </div>
          ${logoutBtn('w-full')}
        </div>
      </div>
    </aside>

    <!-- Area utama -->
    <div class="flex-1 flex flex-col min-w-0">

      <header class="sticky top-0 z-20 glass border-b border-slate-200/70">
        <div class="max-w-6xl w-full mx-auto px-5 md:px-8 py-3.5 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <button id="btn-menu" aria-label="Buka menu"
              class="md:hidden w-10 h-10 -ml-1 rounded-xl border border-slate-200 bg-white text-slate-600 grid place-items-center shrink-0 active:scale-95 transition">
              <i data-lucide="menu" class="w-[18px] h-[18px]"></i>
            </button>
            <div class="min-w-0">
              <h1 class="font-semibold text-slate-900 font-display text-[19px] md:text-[22px] leading-tight truncate">${title}</h1>
              ${subtitle ? `<p class="text-[12.5px] text-slate-400 mt-0.5 truncate">${subtitle}</p>` : ''}
            </div>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <div class="text-right hidden lg:block">
              <p class="text-[13px] font-semibold text-slate-800 leading-tight">${escapeHtml(userName || '')}</p>
              <p class="text-[11px] text-slate-400 leading-tight mt-0.5">${roleLabel}</p>
            </div>
            <div class="w-10 h-10 rounded-full bg-brand-600 text-white grid place-items-center font-semibold text-[14px] shadow-glow ring-[3px] ring-white md:hidden lg:grid">${initial}</div>
          </div>
        </div>
      </header>

      <!-- Menu mobile -->
      <nav id="mobile-nav" class="md:hidden hidden px-4 pt-3 pb-1">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-card p-2.5 space-y-1">
          ${items}
          <div class="h-px bg-slate-200 my-1.5"></div>
          ${logoutBtn('w-full')}
        </div>
      </nav>

      <main class="flex-1 px-5 md:px-8 py-6 md:py-8 max-w-6xl w-full mx-auto ${role === 'guru' ? 'pb-28' : 'pb-12'}">
        <div id="view" class="animate-fade-up">${content}</div>
      </main>
    </div>
  </div>`;
}
