// Render kalender FullCalendar dari data booking (responsif untuk mobile)
import { db } from './supabase.js';
import * as U from './ui.js';

const COLORS = { disetujui: '#2563eb', selesai: '#64748b' };

export async function renderCalendar(el) {
  el.innerHTML = U.card(`<div class="p-3 sm:p-4 overflow-x-auto"><div id="fc" class="min-w-[300px]"></div></div>`);
  const { data, error } = await db.approvedForCalendar();
  if (error) { el.innerHTML = `<p class="text-rose-500 text-sm">${U.escapeHtml(error.message)}</p>`; return; }

  const events = (data || []).map((b) => ({
    title: `${b.laboratories?.kode || ''} · ${b.gurus?.nama?.split(',')[0] || ''} (${b.jumlah_peserta})`,
    start: `${b.tanggal}T${b.jam_mulai}`,
    end: `${b.tanggal}T${b.jam_selesai}`,
    backgroundColor: COLORS[b.status] || '#2563eb',
    borderColor: COLORS[b.status] || '#2563eb',
    extendedProps: b,
  }));

  const isMobile = window.matchMedia('(max-width: 640px)').matches;

  const cal = new window.FullCalendar.Calendar(document.getElementById('fc'), {
    initialView: 'dayGridMonth', // default: tampilan kalender bulan
    locale: 'id',
    height: 'auto',
    expandRows: true,
    dayMaxEvents: isMobile ? 2 : 3,
    headerToolbar: isMobile
      ? { left: 'prev,next', center: 'title', right: 'today' }
      : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' },
    footerToolbar: isMobile ? { center: 'dayGridMonth,timeGridWeek,listWeek' } : false,
    buttonText: { today: 'Hari ini', month: 'Bulan', week: 'Minggu', list: 'Daftar' },
    noEventsText: 'Tidak ada jadwal',
    events,
    eventClick: (info) => {
      const b = info.event.extendedProps;
      window.Swal.fire({
        title: b.laboratories?.nama || 'Booking',
        html: `<div class="text-left text-sm space-y-1">
          <p><b>Guru:</b> ${U.escapeHtml(b.gurus?.nama || '-')}</p>
          <p><b>Tanggal:</b> ${U.fmtDate(b.tanggal)}</p>
          <p><b>Waktu:</b> ${U.fmtTime(b.jam_mulai)}–${U.fmtTime(b.jam_selesai)}</p>
          <p><b>Peserta:</b> ${b.jumlah_peserta}</p>
          <p><b>Kelas:</b> ${U.escapeHtml(b.kelas || '-')}</p>
          <p><b>Keperluan:</b> ${U.escapeHtml(b.keperluan || '-')}</p></div>`,
        confirmButtonColor: '#2563eb',
      });
    },
  });
  cal.render();

  // Re-render bila ukuran layar berubah lintas breakpoint (mobile ⇄ desktop)
  let wasMobile = isMobile;
  const onResize = () => {
    const nowMobile = window.matchMedia('(max-width: 640px)').matches;
    if (nowMobile !== wasMobile) { wasMobile = nowMobile; cal.destroy(); renderCalendar(el); }
  };
  window.addEventListener('resize', onResize, { once: true });
}
