-- ============================================================
-- SUPABASE MIGRATION: RAP TABLES
-- Modul Perhitungan Rencana Anggaran Biaya (RAP)
-- Normalisasi Sungai — Swakelola SDA
-- Tanggal: 21 April 2026
-- ============================================================

-- 1. Tabel Utama: RAP Project
CREATE TABLE IF NOT EXISTS public.rap_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Kop Data
  program TEXT DEFAULT 'PROGRAM PENGELOLAAN SUMBER DAYA AIR (SDA)',
  kegiatan TEXT DEFAULT 'PENGELOLAAN SDA DAN BANGUNAN PENGAMAN PANTAI PADA WILAYAH SUNGAI',
  pekerjaan TEXT,
  lokasi TEXT,
  tahun_anggaran INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  -- Geometri
  panjang NUMERIC DEFAULT 500,
  b1 NUMERIC DEFAULT 4.0,
  b2 NUMERIC DEFAULT 2.857,
  b3 NUMERIC DEFAULT 6.857,
  h NUMERIC DEFAULT 1.0,
  h_prime NUMERIC DEFAULT 2.5,
  slope NUMERIC DEFAULT 1,
  -- Meta
  assignment_id UUID REFERENCES public.assignments(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_latest BOOLEAN DEFAULT TRUE
);

-- 2. Tabel STA (Station) — 5 STA Perencanaan
CREATE TABLE IF NOT EXISTS public.rap_sta_perencanaan (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.rap_projects(id) ON DELETE CASCADE,
  sta_index INTEGER NOT NULL CHECK (sta_index BETWEEN 0 AND 4),
  sta_label TEXT NOT NULL,  -- e.g. '0+000', '0+125', '0+250', '0+375', '0+500'
  b1 NUMERIC NOT NULL,
  b2 NUMERIC NOT NULL,
  b3 NUMERIC NOT NULL,
  h NUMERIC NOT NULL,
  h_prime NUMERIC NOT NULL,
  luas NUMERIC NOT NULL,    -- m²
  volume NUMERIC NOT NULL,  -- m³
  jarak NUMERIC NOT NULL,    -- m
  is_sta0 BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, sta_index)
);

-- 3. Tabel STA Pelaksanaan (5 STA)
CREATE TABLE IF NOT EXISTS public.rap_sta_pelaksanaan (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.rap_projects(id) ON DELETE CASCADE,
  sta_index INTEGER NOT NULL CHECK (sta_index BETWEEN 0 AND 4),
  sta_label TEXT NOT NULL,
  b1 NUMERIC NOT NULL,
  b2 NUMERIC NOT NULL,
  b3 NUMERIC NOT NULL,
  h NUMERIC NOT NULL,
  h_prime NUMERIC NOT NULL,
  luas NUMERIC NOT NULL,
  volume NUMERIC NOT NULL,
  jarak NUMERIC NOT NULL,
  is_sta0 BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, sta_index)
);

-- 4. Tabel Perhitungan Analisa (Perencanaan)
CREATE TABLE IF NOT EXISTS public.rap_calculations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.rap_projects(id) ON DELETE CASCADE,
  -- Excavator specs
  excavator_type TEXT DEFAULT 'PC200',
  hp NUMERIC DEFAULT 148,
  bucket NUMERIC DEFAULT 0.9,
  fb NUMERIC DEFAULT 1.0,
  fa NUMERIC DEFAULT 0.7,
  fv NUMERIC DEFAULT 0.8,
  fk NUMERIC DEFAULT 0.8,
  load_factor NUMERIC DEFAULT 0.28,
  waktu_gali NUMERIC DEFAULT 38,   -- detik
  -- Hasil GoalSeek
  t1 NUMERIC,         -- menit (GoalSeek result)
  t1_detik NUMERIC,   -- detik
  q1 NUMERIC,         -- m³/jam
  q2 NUMERIC,         -- m³/hari
  h_liter_jam NUMERIC,-- L/jam
  h2 NUMERIC,         -- L/hari
  koef_bbm NUMERIC,
  estimasi_hari INTEGER,
  total_solar_used NUMERIC,
  sisa_akhir NUMERIC,
  -- GoalSeek metadata
  goalseek_status TEXT CHECK (goalseek_status IN ('OPTIMAL', 'ADJUSTED', 'FAILED')),
  goalseek_converged BOOLEAN DEFAULT FALSE,
  dalam_range_sni BOOLEAN DEFAULT FALSE,
  -- Versions
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabel Personil
CREATE TABLE IF NOT EXISTS public.rap_personil (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.rap_projects(id) ON DELETE CASCADE,
  durasi_hari INTEGER DEFAULT 10,
  penjaga_malam INTEGER DEFAULT 2,
  supir INTEGER DEFAULT 1,
  operator INTEGER DEFAULT 1,
  pekerja INTEGER DEFAULT 4,
  -- Harga satuan (OH)
  harga_pm NUMERIC DEFAULT 75000,
  harga_sp NUMERIC DEFAULT 130000,
  harga_sup NUMERIC DEFAULT 120000,
  harga_op NUMERIC DEFAULT 150000,
  harga_pk NUMERIC DEFAULT 95000,
  -- Kalkulasi
  total_hok NUMERIC,
  kebutuhan_solar NUMERIC,
  subtotal_tenaga NUMERIC,
  subtotal_bahan NUMERIC,
  sebelum_ppn NUMERIC,
  ppn_12 NUMERIC,
  total_rab NUMERIC,
  pembulatan NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabel RAB Final
CREATE TABLE IF NOT EXISTS public.rap_rab_final (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.rap_projects(id) ON DELETE CASCADE,
  total_volume NUMERIC,
  harga_satuan NUMERIC,
  harga_ppn NUMERIC,
  grand_total NUMERIC,
  pagu NUMERIC DEFAULT 3600000000,
  sisa_pagu NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabel TTD
CREATE TABLE IF NOT EXISTS public.rap_ttd (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.rap_projects(id) ON DELETE CASCADE UNIQUE,
  kpa_nama TEXT DEFAULT 'JAFAR SODIQ, ST, MM',
  kpa_nip TEXT DEFAULT '19760818 200312 1 005',
  pptk_nama TEXT DEFAULT 'GALUH SETIAWAN ROSMI, ST',
  pptk_nip TEXT DEFAULT '19790511 200312 1 006',
  pptk_jabatan TEXT DEFAULT 'PPTK',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabel Realisasi Harian (Pelaksanaan)
CREATE TABLE IF NOT EXISTS public.rap_realisasi_harian (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.rap_projects(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  jam_kerja NUMERIC DEFAULT 8,
  q1 NUMERIC,          -- m³/jam (calculated)
  galian NUMERIC,      -- m³ (achieved)
  bbm_jam NUMERIC,     -- L/jam
  bbm_harian NUMERIC,  -- L (daily total)
  diterima NUMERIC,    -- L (refilled)
  sisa NUMERIC,       -- L (running balance)
  accepted BOOLEAN DEFAULT FALSE,
  assignment_id UUID REFERENCES public.assignments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_rap_projects_latest ON public.rap_projects(is_latest) WHERE is_latest = TRUE;
CREATE INDEX IF NOT EXISTS idx_rap_sta_perencanaan_project ON public.rap_sta_perencanaan(project_id);
CREATE INDEX IF NOT EXISTS idx_rap_sta_pelaksanaan_project ON public.rap_sta_pelaksanaan(project_id);
CREATE INDEX IF NOT EXISTS idx_rap_calculations_project ON public.rap_calculations(project_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_rap_realisasi_project ON public.rap_realisasi_harian(project_id);
CREATE INDEX IF NOT EXISTS idx_rap_realisasi_tanggal ON public.rap_realisasi_harian(tanggal);

-- ============================================================
-- RLS POLICIES (Row Level Security)
-- ============================================================

-- Enable RLS
ALTER TABLE public.rap_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rap_sta_perencanaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rap_sta_pelaksanaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rap_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rap_personil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rap_rab_final ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rap_ttd ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rap_realisasi_harian ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read their own data
-- (Admins can manage via service role key)

CREATE POLICY "Authenticated users can view rap_projects"
  ON public.rap_projects FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "Authenticated users can insert rap_projects"
  ON public.rap_projects FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can update rap_projects"
  ON public.rap_projects FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can manage rap_sta_perencanaan"
  ON public.rap_sta_perencanaan FOR ALL
  TO authenticated
  USING ( EXISTS (
    SELECT 1 FROM public.rap_projects
    WHERE id = project_id AND created_by = auth.uid()
  ));

CREATE POLICY "Users can manage rap_sta_pelaksanaan"
  ON public.rap_sta_pelaksanaan FOR ALL
  TO authenticated
  USING ( EXISTS (
    SELECT 1 FROM public.rap_projects
    WHERE id = project_id AND created_by = auth.uid()
  ));

CREATE POLICY "Users can manage rap_calculations"
  ON public.rap_calculations FOR ALL
  TO authenticated
  USING ( EXISTS (
    SELECT 1 FROM public.rap_projects
    WHERE id = project_id AND created_by = auth.uid()
  ));

CREATE POLICY "Users can manage rap_personil"
  ON public.rap_personil FOR ALL
  TO authenticated
  USING ( EXISTS (
    SELECT 1 FROM public.rap_projects
    WHERE id = project_id AND created_by = auth.uid()
  ));

CREATE POLICY "Users can manage rap_rab_final"
  ON public.rap_rab_final FOR ALL
  TO authenticated
  USING ( EXISTS (
    SELECT 1 FROM public.rap_projects
    WHERE id = project_id AND created_by = auth.uid()
  ));

CREATE POLICY "Users can manage rap_ttd"
  ON public.rap_ttd FOR ALL
  TO authenticated
  USING ( EXISTS (
    SELECT 1 FROM public.rap_projects
    WHERE id = project_id AND created_by = auth.uid()
  ));

CREATE POLICY "Users can manage rap_realisasi_harian"
  ON public.rap_realisasi_harian FOR ALL
  TO authenticated
  USING ( EXISTS (
    SELECT 1 FROM public.rap_projects
    WHERE id = project_id AND created_by = auth.uid()
  ));

-- ============================================================
-- TRIGGER: updated_at auto-update
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rap_projects_updated_at
  BEFORE UPDATE ON public.rap_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER rap_calculations_updated_at
  BEFORE UPDATE ON public.rap_calculations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER rap_personil_updated_at
  BEFORE UPDATE ON public.rap_personil
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER rap_rab_final_updated_at
  BEFORE UPDATE ON public.rap_rab_final
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER rap_ttd_updated_at
  BEFORE UPDATE ON public.rap_ttd
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
