// ============================================================================
//  Helper Excel — ekspor laporan berformat, unduh template, dan baca berkas
//  import.
//
//  Memakai `xlsx-js-style` (fork SheetJS 0.18.5 + dukungan gaya sel) lewat
//  window.XLSX. API bacanya identik dengan SheetJS, jadi alur import tidak
//  berubah; yang bertambah hanya properti `s` (gaya) pada tiap sel saat menulis.
//
//  Semua warna & tipografi mengikuti sistem desain "Soft Aurora" pada aplikasi
//  agar berkas Excel terasa satu keluarga dengan tampilan layarnya.
// ============================================================================
const XLSX = window.XLSX;

export const SEKOLAH = 'SMA Progresif Bumi Shalawat';

// ---- Palet & gaya dasar ----------------------------------------------------
const W = {
  brand: '0F766E',      // teal utama — kop & judul kolom
  brandGelap: '0B4A46',
  brandMuda: 'D5F2EA',
  brandPucat: 'EFFAF7',
  tinta: '262320',
  redup: '857E75',
  garis: 'E4DFD8',
  zebra: 'FAF9F7',
  putih: 'FFFFFF',
};
const FONT = 'Calibri';
const FORMAT_TANGGAL = 'dd/mm/yyyy';

const isi = (rgb) => ({ patternType: 'solid', fgColor: { rgb } });
const grs = (rgb = W.garis) => ({ style: 'thin', color: { rgb } });
const kotak = (rgb = W.garis) => ({ top: grs(rgb), bottom: grs(rgb), left: grs(rgb), right: grs(rgb) });
const rata = (horizontal, wrapText = false) => ({ horizontal, vertical: 'center', wrapText });

const G = {
  kop:   { font: { name: FONT, sz: 15, bold: true, color: { rgb: W.putih } }, fill: isi(W.brand), alignment: rata('center') },
  judul: { font: { name: FONT, sz: 11.5, bold: true, color: { rgb: W.brandMuda } }, fill: isi(W.brand), alignment: rata('center') },
  meta:  { font: { name: FONT, sz: 9.5, italic: true, color: { rgb: W.redup } }, fill: isi(W.brandPucat), alignment: rata('center') },
  thead: { font: { name: FONT, sz: 10, bold: true, color: { rgb: W.putih } }, fill: isi(W.brandGelap), alignment: rata('center', true), border: kotak(W.brandGelap) },
  seksi: { font: { name: FONT, sz: 10.5, bold: true, color: { rgb: W.brand } }, fill: isi(W.brandMuda), alignment: rata('left') },
  statLabel: { font: { name: FONT, sz: 10, color: { rgb: W.redup } }, alignment: rata('left'), border: { bottom: grs() } },
  statNilai: { font: { name: FONT, sz: 11, bold: true, color: { rgb: W.tinta } }, alignment: rata('right'), border: { bottom: grs() }, numFmt: '#,##0.##' },
  langkah: { font: { name: FONT, sz: 10, color: { rgb: W.tinta } }, alignment: rata('left', true) },
  catatan: { font: { name: FONT, sz: 9.5, italic: true, color: { rgb: W.redup } }, alignment: rata('left', true) },
  contoh: { font: { name: FONT, sz: 10, italic: true, color: { rgb: W.redup } }, alignment: rata('left'), border: kotak() },
  wajib: { font: { name: FONT, sz: 9, bold: true, color: { rgb: 'B94227' } }, fill: isi('FFE4DA'), alignment: rata('center'), border: kotak() },
  opsional: { font: { name: FONT, sz: 9, color: { rgb: W.redup } }, fill: isi('F4F2EE'), alignment: rata('center'), border: kotak() },
  ttd: { font: { name: FONT, sz: 10, color: { rgb: W.tinta } }, alignment: rata('center') },
  kosong: { font: { name: FONT, sz: 10, italic: true, color: { rgb: W.redup } }, alignment: rata('center'), border: kotak() },
};

const TEKS_KOSONG = 'Tidak ada data pada periode & filter ini.';

// Warna pil status agar laporan mudah dipindai — selaras badge di layar.
const STATUS = {
  disetujui:  ['065F46', 'D1FAE5'],
  selesai:    ['0B4A46', 'D5F2EA'],
  menunggu:   ['92400E', 'FEF3C7'],
  ditolak:    ['B94227', 'FFE4DA'],
  dibatalkan: ['55504A', 'F1EEE9'],
};

// Gaya sel data di-cache: satu laporan bisa ribuan sel, tidak perlu objek baru.
const cacheSel = new Map();
function gayaSel(align = 'left', zebra = false) {
  const kunci = `${align}|${zebra}`;
  if (!cacheSel.has(kunci)) {
    cacheSel.set(kunci, {
      font: { name: FONT, sz: 10, color: { rgb: W.tinta } },
      alignment: rata(align === 'wrap' ? 'left' : align, align === 'wrap'),
      border: kotak(),
      ...(zebra ? { fill: isi(W.zebra) } : {}),
      ...(align === 'right' ? { numFmt: '#,##0.##' } : {}),
    });
  }
  return cacheSel.get(kunci);
}

function gayaStatus(nilai, zebra) {
  const warna = STATUS[String(nilai || '').toLowerCase()];
  if (!warna) return gayaSel('center', zebra);
  return {
    font: { name: FONT, sz: 9.5, bold: true, color: { rgb: warna[0] } },
    fill: isi(warna[1]), alignment: rata('center'), border: kotak(),
  };
}

// ---- Perakit worksheet -----------------------------------------------------
/** Ubah larik 2 dimensi (sel objek / nilai polos / null) menjadi worksheet. */
function buatSheet(baris) {
  const ws = {};
  let maxC = 0;
  baris.forEach((row, R) => (row || []).forEach((c, C) => {
    if (c === null || c === undefined) return;
    const sel = (typeof c === 'object' && !(c instanceof Date)) ? { ...c } : { v: c };
    if (sel.v === null || sel.v === undefined) sel.v = '';
    if (!sel.t) sel.t = sel.v instanceof Date ? 'd' : (typeof sel.v === 'number' ? 'n' : 's');
    ws[XLSX.utils.encode_cell({ r: R, c: C })] = sel;
    if (C > maxC) maxC = C;
  }));
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, baris.length - 1), c: maxC } });
  return ws;
}

const lebarOtomatis = (label, data) =>
  Math.min(44, Math.max(11, Math.max(String(label).length, ...data.map((r) => String(r[label] ?? '').length), 0) + 2));

/**
 * Lembar laporan: kop sekolah + judul + baris keterangan, lalu satu tabel
 * berjudul kolom teal, garis tipis, baris belang, dan kolom Status berwarna.
 *
 * @param {string} name   Nama lembar
 * @param {string} judul  Judul laporan (huruf besar)
 * @param {string} meta   Baris keterangan (periode · status · tanggal cetak)
 * @param {Array}  cols   Daftar kolom: 'Label' atau [label, lebar, perataan]
 *                        perataan: left | center | right | wrap
 * @param {Array}  data   Baris data, objek dengan kunci = label kolom
 */
export function sheetLaporan({ name, judul, meta, cols, data }) {
  const kolom = cols.map((c) => (Array.isArray(c) ? c : [c, null, 'left']));
  const n = kolom.length;
  const membentang = (v, gaya) => Array.from({ length: n }, (_, i) => ({ v: i === 0 ? v : '', s: gaya }));

  const baris = [
    membentang(SEKOLAH.toUpperCase(), G.kop),
    membentang(judul, G.judul),
    membentang(meta, G.meta),
    [],
    kolom.map(([label]) => ({ v: label, s: G.thead })),
    ...data.map((row, i) => kolom.map(([label, , align]) => {
      const v = row[label];
      const zebra = i % 2 === 1;
      if (label === 'Status') return { v: v ?? '', s: gayaStatus(v, zebra) };
      const sel = { v: v ?? '', s: gayaSel(align === 'date' ? 'center' : (align || 'left'), zebra) };
      // Tanggal ditulis sebagai sel tanggal Excel asli (bukan teks) supaya bisa
      // diurutkan & difilter; formatnya hidup di `z`, bukan di gaya.
      if (align === 'date' && v instanceof Date) sel.z = FORMAT_TANGGAL;
      return sel;
    })),
  ];

  // Tabel tanpa isi tetap diberi satu baris keterangan agar tidak terkesan rusak
  if (!data.length) baris.push(Array.from({ length: n }, (_, i) => ({ v: i === 0 ? TEKS_KOSONG : '', s: G.kosong })));

  const ws = buatSheet(baris);
  const AWAL_TABEL = 4; // baris ke-5: judul kolom
  if (n > 1) ws['!merges'] = [0, 1, 2].map((r) => ({ s: { r, c: 0 }, e: { r, c: n - 1 } }));
  if (!data.length && n > 1) ws['!merges'].push({ s: { r: 5, c: 0 }, e: { r: 5, c: n - 1 } });
  ws['!cols'] = kolom.map(([label, lebar]) => ({ wch: lebar || lebarOtomatis(label, data) }));
  ws['!rows'] = [{ hpt: 30 }, { hpt: 20 }, { hpt: 17 }, { hpt: 7 }, { hpt: 30 }];
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: AWAL_TABEL, c: 0 },
      e: { r: AWAL_TABEL + Math.max(1, data.length), c: n - 1 },
    }),
  };
  return { name, ws };
}

/**
 * Lembar ringkasan: kop + angka kunci + beberapa blok rekap + kolom tanda tangan.
 *
 * @param {Array} angka [[label, nilai], …]
 * @param {Array} blok  [{ judul, headers, rows }] — rows = larik larik nilai
 * @param {boolean} ttd Sertakan blok tanda tangan di bawah
 */
export function sheetRingkasan({ name, judul, meta, angka = [], blok = [], ttd = true }) {
  const N = 4;
  const baris = [];
  const merges = [];
  const tinggi = [];

  const tambah = (row, h) => {
    baris.push(row);
    if (h) tinggi[baris.length - 1] = { hpt: h };
    return baris.length - 1;
  };
  const membentang = (v, gaya, h) => {
    const r = tambah(Array.from({ length: N }, (_, i) => ({ v: i === 0 ? v : '', s: gaya })), h);
    merges.push({ s: { r, c: 0 }, e: { r, c: N - 1 } });
    return r;
  };

  membentang(SEKOLAH.toUpperCase(), G.kop, 30);
  membentang(judul, G.judul, 20);
  membentang(meta, G.meta, 17);
  tambah([], 7);

  if (angka.length) {
    membentang('ANGKA KUNCI', G.seksi, 20);
    angka.forEach(([label, nilai]) => {
      const r = tambah([
        { v: label, s: G.statLabel }, { v: '', s: G.statLabel }, { v: '', s: G.statLabel },
        { v: nilai ?? 0, s: G.statNilai },
      ], 19);
      merges.push({ s: { r, c: 0 }, e: { r, c: 2 } }); // label melebar, nilai di kolom terakhir
    });
  }

  // Blok rekap. Bila kolomnya kurang dari N, kolom pertama dilebarkan sampai
  // sisa ruang terpakai — jadi kolom angka selalu rata di tepi kanan dan tidak
  // ada judul kolom kosong yang menggantung.
  blok.forEach(({ judul: jb, headers, rows }) => {
    tambah([], 7);
    membentang(jb, G.seksi, 20);
    const lebar0 = Math.max(1, N - headers.length + 1);
    const susun = (nilai, gaya0, gayaLain, h) => {
      const row = Array.from({ length: N }, () => null);
      row[0] = { v: nilai[0] ?? '', s: gaya0 };
      for (let i = 1; i < lebar0; i++) row[i] = { v: '', s: gaya0 };
      nilai.slice(1).forEach((v, i) => { row[lebar0 + i] = { v: v ?? '', s: gayaLain(i) }; });
      const r = tambah(row, h);
      if (lebar0 > 1) merges.push({ s: { r, c: 0 }, e: { r, c: lebar0 - 1 } });
    };
    susun(headers, G.thead, () => G.thead, 24);
    if (!rows.length) {
      const r = tambah(Array.from({ length: N }, (_, i) => ({ v: i === 0 ? TEKS_KOSONG : '', s: G.kosong })));
      merges.push({ s: { r, c: 0 }, e: { r, c: N - 1 } });
    }
    rows.forEach((r, i) => susun(r, gayaSel('left', i % 2 === 1), () => gayaSel('right', i % 2 === 1)));
  });

  if (ttd) {
    tambah([], 12);
    tambah([]);
    const tgl = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    // Kolom kiri (A:B) dan kanan (C:D) supaya kolom tanda tangan lebar & rapi
    const duaKolom = (kiri, kanan) => {
      const r = tambah([{ v: kiri, s: G.ttd }, { v: '', s: G.ttd }, { v: kanan, s: G.ttd }, { v: '', s: G.ttd }], 18);
      merges.push({ s: { r, c: 0 }, e: { r, c: 1 } }, { s: { r, c: 2 }, e: { r, c: 3 } });
    };
    duaKolom('', tgl);
    duaKolom('Mengetahui,', 'Petugas Laboratorium,');
    duaKolom('Kepala Sekolah', '');
    tambah([], 18); tambah([], 18); tambah([], 18);
    duaKolom('(……………………………………)', '(……………………………………)');
  }

  const ws = buatSheet(baris);
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 38 }, { wch: 20 }, { wch: 20 }, { wch: 18 }];
  ws['!rows'] = tinggi;
  return { name, ws };
}

// ---- Tulis workbook --------------------------------------------------------
/** Gabungkan lembar-lembar hasil sheetLaporan/sheetRingkasan lalu unduh. */
export function exportToExcel(sheets, filename) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, ws }) => XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)));
  XLSX.writeFile(wb, filename, { cellDates: true });
}

// ---- Template import -------------------------------------------------------
/**
 * Bangun berkas template .xlsx berisi 2 lembar:
 *   1. lembar data    → baris judul kolom + contoh isian (dicetak miring)
 *   2. lembar Petunjuk → cara pakai, arti tiap kolom, dan catatan
 *
 * Lembar data WAJIB jadi lembar pertama dan judul kolomnya WAJIB di baris 1,
 * karena proses import membaca lembar pertama dan memakai baris 1 sebagai kunci.
 */
export function downloadTemplate({ judul, sheetName, filename, columns, examples = [], catatan = [] }) {
  const keys = columns.map((c) => c.key);

  // -- Lembar data ------------------------------------------------------------
  const barisData = [
    keys.map((k) => ({ v: k, s: G.thead })),
    ...examples.map((row) => keys.map((k) => ({ v: row[k] ?? '', s: G.contoh }))),
  ];
  const wsData = buatSheet(barisData);
  wsData['!cols'] = keys.map((k) => ({
    wch: Math.min(34, Math.max(13, Math.max(k.length, ...examples.map((e) => String(e[k] ?? '').length), 0) + 4)),
  }));
  wsData['!rows'] = [{ hpt: 26 }];

  // -- Lembar petunjuk --------------------------------------------------------
  const N = 4;
  const baris = [];
  const merges = [];
  const tinggi = [];
  const tambah = (row, h) => { baris.push(row); if (h) tinggi[baris.length - 1] = { hpt: h }; return baris.length - 1; };
  const membentang = (v, gaya, h) => {
    const r = tambah(Array.from({ length: N }, (_, i) => ({ v: i === 0 ? v : '', s: gaya })), h);
    merges.push({ s: { r, c: 0 }, e: { r, c: N - 1 } });
    return r;
  };

  membentang(SEKOLAH.toUpperCase(), G.kop, 30);
  membentang(judul, G.judul, 20);
  membentang('Template Import Data — isi lembar "' + sheetName + '", lalu unggah lewat tombol Import Excel/CSV', G.meta, 17);
  tambah([], 7);

  membentang('CARA PAKAI', G.seksi, 20);
  [
    `1. Buka lembar "${sheetName}" pada berkas ini.`,
    '2. Hapus baris contoh (yang dicetak miring), lalu isi data Anda mulai baris ke-2.',
    '3. Jangan mengubah, menghapus, atau menukar urutan baris judul kolom di baris ke-1.',
    '4. Simpan berkas (.xlsx atau .csv), lalu unggah lewat tombol "Import Excel/CSV".',
  ].forEach((t) => membentang(t, G.langkah));
  tambah([], 7);

  membentang('ARTI KOLOM', G.seksi, 20);
  tambah(['Kolom', 'Wajib', 'Keterangan', 'Contoh'].map((h) => ({ v: h, s: G.thead })), 24);
  columns.forEach((c, i) => tambah([
    { v: c.key, s: gayaSel('left', i % 2 === 1) },
    { v: c.wajib ? 'WAJIB' : 'Opsional', s: c.wajib ? G.wajib : G.opsional },
    { v: c.keterangan, s: gayaSel('wrap', i % 2 === 1) },
    { v: String(c.contoh ?? ''), s: gayaSel('left', i % 2 === 1) },
  ]));

  if (catatan.length) {
    tambah([], 7);
    membentang('CATATAN', G.seksi, 20);
    catatan.forEach((c) => membentang('•  ' + c, G.catatan));
  }

  const wsPetunjuk = buatSheet(baris);
  wsPetunjuk['!merges'] = merges;
  wsPetunjuk['!cols'] = [{ wch: 22 }, { wch: 11 }, { wch: 64 }, { wch: 26 }];
  wsPetunjuk['!rows'] = tinggi;

  exportToExcel([{ name: sheetName, ws: wsData }, { name: 'Petunjuk', ws: wsPetunjuk }], filename);
}

// ---- Baca berkas import ----------------------------------------------------
/** Buka dialog pilih berkas, parse lembar pertama, panggil onRows(barisObjek). */
export function pickAndParse(onRows, onError) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,.xlsx,.xls';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      onRows(XLSX.utils.sheet_to_json(ws, { defval: '' }));
    } catch (e) {
      onError?.('Gagal membaca file: ' + e.message);
    }
  };
  input.click();
}

/** Samakan nama kolom: buang spasi tepi, huruf kecil, spasi → garis bawah. */
export const normKeys = (o) =>
  Object.fromEntries(
    Object.entries(o).map(([k, v]) => [String(k).trim().toLowerCase().replace(/\s+/g, '_'), v]),
  );

/** Sisipkan bertahap 500 baris agar tidak menabrak batas payload Supabase. */
export async function chunkInsert(rows, fn) {
  let ok = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const slice = rows.slice(i, i + 500);
    const { error } = await fn(slice);
    if (error) throw new Error(`${error.message} (setelah ${ok} baris)`);
    ok += slice.length;
  }
  return ok;
}
