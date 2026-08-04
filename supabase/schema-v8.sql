-- ============================================================================
-- Schema v8: Tambah kolom `satuan` pada tabel equipment
-- ============================================================================

-- Kolom satuan untuk jenis unit alat/bahan (pcs, liter, kg, pack, botol, dsb.)
alter table equipment add column if not exists satuan text not null default 'pcs';

-- Selesai. Kolom baru langsung terisi 'pcs' untuk data lama.
