// ============================================================================
//  Helper Excel — ekspor laporan, unduh template, dan baca berkas import.
//  Semua yang berkaitan dengan SheetJS (window.XLSX) dikumpulkan di sini agar
//  view tetap ringkas dan format template konsisten di seluruh aplikasi.
// ============================================================================
const XLSX = window.XLSX;

const SEKOLAH = 'SMA Progresif Bumi Shalawat';

// ---- Ekspor ----------------------------------------------------------------
const clampW = (n) => Math.min(46, Math.max(10, n + 2));

/**
 * Tulis workbook lalu unduh.
 * Tiap sheet: { name, data, cols } untuk tabel objek,
 *          atau { name, aoa, widths } untuk lembar bebas (ringkasan/petunjuk).
 */
export function exportToExcel(sheets, filename) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, data, cols, aoa, widths }) => {
    let ws;
    if (aoa) {
      ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = (widths || []).map((w) => ({ wch: w }));
    } else {
      const rows = data || [];
      const headers = cols || (rows.length ? Object.keys(rows[0]) : []);
      ws = XLSX.utils.json_to_sheet(rows, headers.length ? { header: headers } : undefined);
      if (headers.length) {
        ws['!cols'] = headers.map((h) => ({
          wch: clampW(Math.max(String(h).length, ...rows.map((r) => String(r[h] ?? '').length), 0)),
        }));
        ws['!autofilter'] = {
          ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: headers.length - 1 } }),
        };
      }
    }
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}

// ---- Template import -------------------------------------------------------
/**
 * Bangun berkas template .xlsx berisi 2 lembar:
 *   1. "Data …"      → baris header + beberapa contoh isian (tinggal ditimpa)
 *   2. "Petunjuk"    → arti tiap kolom, wajib/opsional, dan contoh nilai
 *
 * @param {object} t
 * @param {string} t.judul     Judul yang tampil di lembar petunjuk
 * @param {string} t.sheetName Nama lembar data (maks 31 karakter)
 * @param {string} t.filename  Nama berkas hasil unduhan
 * @param {Array}  t.columns   [{ key, wajib, keterangan, contoh }]
 * @param {Array}  t.examples  Baris contoh (objek dengan kunci = column.key)
 * @param {Array}  t.catatan   Baris catatan tambahan (string)
 */
export function downloadTemplate({ judul, sheetName, filename, columns, examples = [], catatan = [] }) {
  const keys = columns.map((c) => c.key);

  const petunjuk = [
    [judul],
    [SEKOLAH + ' — Template Import Data'],
    [],
    ['Cara pakai:'],
    ['1. Buka lembar "' + sheetName + '" pada berkas ini.'],
    ['2. Hapus baris contoh, lalu isi data Anda mulai baris ke-2. Jangan mengubah baris judul kolom.'],
    ['3. Simpan berkas (.xlsx atau .csv), lalu unggah lewat tombol "Import Excel/CSV".'],
    [],
    ['Arti kolom:'],
    ['Kolom', 'Wajib', 'Keterangan', 'Contoh'],
    ...columns.map((c) => [c.key, c.wajib ? 'WAJIB' : 'Opsional', c.keterangan, String(c.contoh ?? '')]),
  ];
  if (catatan.length) petunjuk.push([], ['Catatan:'], ...catatan.map((c) => [c]));

  exportToExcel(
    [
      { name: sheetName, data: examples.length ? examples : [Object.fromEntries(keys.map((k) => [k, '']))], cols: keys },
      { name: 'Petunjuk', aoa: petunjuk, widths: [22, 11, 62, 24] },
    ],
    filename,
  );
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
