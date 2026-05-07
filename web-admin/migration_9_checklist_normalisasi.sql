-- Migration: Create checklist_normalisasi and target_tahunan for DB2
-- NOTE: Please run this script in the SQL Editor of DB2 (rpggkbkmowdbxtgfgbop)

-- Tabel utama checklist
CREATE TABLE IF NOT EXISTS checklist_normalisasi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  kegiatan TEXT NOT NULL,
  jam_total NUMERIC(10,2) DEFAULT 0,
  desa TEXT,
  solar NUMERIC(10,2) DEFAULT 0,
  panjang NUMERIC(10,2) DEFAULT 0,       -- dalam meter
  -- Checkbox columns
  chk_proposal BOOLEAN DEFAULT FALSE,
  chk_kak BOOLEAN DEFAULT FALSE,
  chk_spek BOOLEAN DEFAULT FALSE,
  chk_rptdb BOOLEAN DEFAULT FALSE,
  chk_peta_sit BOOLEAN DEFAULT FALSE,
  chk_lp BOOLEAN DEFAULT FALSE,
  chk_fodok BOOLEAN DEFAULT FALSE,
  -- Tanggal pekerjaan
  tanggal_mulai DATE,
  tanggal_selesai DATE,
  -- Metadata
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE checklist_normalisasi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_full_access_checklist" ON checklist_normalisasi FOR ALL USING (true) WITH CHECK (true);

-- Tabel target tahunan
CREATE TABLE IF NOT EXISTS target_tahunan (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun INTEGER NOT NULL UNIQUE,
  target_panjang_normalisasi NUMERIC(10,2) DEFAULT 0,  -- meter
  target_lokasi_embung INTEGER DEFAULT 0,               -- placeholder untuk embung
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE target_tahunan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_full_access_target" ON target_tahunan FOR ALL USING (true) WITH CHECK (true);
