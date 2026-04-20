CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS bbm_pengadaan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seksi TEXT NOT NULL,
  tanggal_pesan DATE NOT NULL,
  tanggal_terima DATE NOT NULL,
  jumlah_liter NUMERIC(10,2) NOT NULL DEFAULT 0,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bbm_pemakaian (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL,
  seksi TEXT NOT NULL,
  kegiatan TEXT,
  tipe_alat TEXT,
  desa TEXT,
  kecamatan TEXT,
  tanggal_kirim DATE NOT NULL,
  jumlah_liter NUMERIC(10,2) NOT NULL DEFAULT 0,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bbm_pengadaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE bbm_pemakaian ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_all_pengadaan ON bbm_pengadaan;
DROP POLICY IF EXISTS allow_all_pemakaian ON bbm_pemakaian;

CREATE POLICY allow_all_pengadaan ON bbm_pengadaan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_pemakaian ON bbm_pemakaian FOR ALL USING (true) WITH CHECK (true);
