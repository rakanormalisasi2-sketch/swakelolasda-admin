-- ============================================
-- MIGRASI 13: SISTEM PERENCANAAN PROPOSAL v4
-- Tabel: proposals, priority_criteria, proposal_scores, work_schedules
-- ============================================

-- 1. Tabel Rekapitulasi Proposal Masuk
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  nomor_urut INTEGER,                -- Fleksibel: user input / auto MAX+1
  nama_usulan TEXT NOT NULL,
  tanggal_usulan DATE,
  desa TEXT,
  kecamatan TEXT,
  kabupaten TEXT DEFAULT 'Bojonegoro',
  panjang_lokasi TEXT,
  usulan_desa TEXT,
  realisasi_pekerjaan TEXT,
  tahun_pelaksanaan INTEGER,
  keterangan TEXT,
  link_proposal TEXT,
  sudah_survey BOOLEAN DEFAULT false,
  tanggal_survey DATE,
  created_by_role TEXT,              -- 'seksi_normalisasi' / 'seksi_embung'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Kriteria Prioritas Dinamis
CREATE TABLE IF NOT EXISTS public.priority_criteria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_kriteria TEXT NOT NULL,
  bobot NUMERIC(5,2) NOT NULL,       -- Persen, total semua aktif <= 100
  opsi JSONB NOT NULL,               -- [{"label":"Kekeringan","skor":1}, ...]
  skor_maksimal INTEGER NOT NULL,
  urutan INTEGER DEFAULT 0,
  role_scope TEXT,                   -- null=semua, 'seksi_normalisasi', 'seksi_embung'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert 5 kriteria default jika belum ada
INSERT INTO public.priority_criteria (nama_kriteria, bobot, skor_maksimal, urutan, opsi) 
SELECT 'Kerawanan Bencana', 30, 4, 1, '[{"label":"Kekeringan","skor":1}, {"label":"Banjir Luapan","skor":2}, {"label":"Longsor","skor":3}, {"label":"Banjir Bandang","skor":4}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.priority_criteria WHERE nama_kriteria = 'Kerawanan Bencana');

INSERT INTO public.priority_criteria (nama_kriteria, bobot, skor_maksimal, urutan, opsi) 
SELECT 'Dampak Kerusakan', 25, 4, 2, '[{"label":"Lahan Non Produktif","skor":1}, {"label":"Lahan Produktif","skor":2}, {"label":"Sarana Umum","skor":3}, {"label":"Permukiman","skor":4}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.priority_criteria WHERE nama_kriteria = 'Dampak Kerusakan');

INSERT INTO public.priority_criteria (nama_kriteria, bobot, skor_maksimal, urutan, opsi) 
SELECT 'Kelas Bahaya Kerusakan', 20, 3, 3, '[{"label":"Kecil","skor":1}, {"label":"Sedang","skor":2}, {"label":"Tinggi","skor":3}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.priority_criteria WHERE nama_kriteria = 'Kelas Bahaya Kerusakan');

INSERT INTO public.priority_criteria (nama_kriteria, bobot, skor_maksimal, urutan, opsi) 
SELECT 'Bentuk Kegiatan', 15, 4, 4, '[{"label":"Pembangunan bangunan baru","skor":1}, {"label":"Perbaikan Bangunan","skor":2}, {"label":"Penggalian/Penimbunan","skor":3}, {"label":"Mitigasi Sementara","skor":4}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.priority_criteria WHERE nama_kriteria = 'Bentuk Kegiatan');

INSERT INTO public.priority_criteria (nama_kriteria, bobot, skor_maksimal, urutan, opsi) 
SELECT 'Jarak Lokasi dan Akses', 10, 9, 5, '[{"label":"Jarak Jauh Akses sulit","skor":1}, {"label":"Jarak jauh akses sedang","skor":2}, {"label":"Jarak jauh akses mudah","skor":3}, {"label":"Jarak menengah akses sulit","skor":4}, {"label":"Jarak menengah akses sedang","skor":5}, {"label":"Jarak menengah akses mudah","skor":6}, {"label":"Jarak dekat akses sulit","skor":7}, {"label":"Jarak dekat akses sedang","skor":8}, {"label":"Jarak dekat akses mudah","skor":9}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.priority_criteria WHERE nama_kriteria = 'Jarak Lokasi dan Akses');


-- 3. Tabel Skor per Proposal per Kriteria
CREATE TABLE IF NOT EXISTS public.proposal_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE,
  criteria_id UUID REFERENCES public.priority_criteria(id) ON DELETE CASCADE,
  pilihan_label TEXT,
  skor INTEGER,
  UNIQUE(proposal_id, criteria_id)
);

-- 4. Tabel Schedule Pekerjaan (Updated v4)
CREATE TABLE IF NOT EXISTS public.work_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tahun INTEGER NOT NULL,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  nama_desa TEXT NOT NULL,
  kecamatan TEXT,
  equipment_id UUID REFERENCES public.heavy_equipment(id) ON DELETE SET NULL,
  
  -- Rencana (dari klik user)
  minggu_mulai INTEGER,
  minggu_selesai INTEGER,
  durasi_rencana_minggu INTEGER,
  
  -- Real (dari laporan)
  tanggal_mulai_real DATE,
  tanggal_selesai_real DATE,
  durasi_real_hari INTEGER,
  
  status TEXT DEFAULT 'estimasi_rencana'
    CHECK (status IN ('estimasi_rencana', 'sedang_berjalan', 'selesai')),
  carried_from_year INTEGER,
  keterangan TEXT,
  created_by_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposals_tahun_role ON public.proposals(tahun, created_by_role);
CREATE INDEX IF NOT EXISTS idx_proposals_survey ON public.proposals(tahun, sudah_survey);
CREATE INDEX IF NOT EXISTS idx_proposal_scores_prop ON public.proposal_scores(proposal_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_tahun ON public.work_schedules(tahun);
CREATE INDEX IF NOT EXISTS idx_work_schedules_equipment ON public.work_schedules(equipment_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_assign ON public.work_schedules(assignment_id);

-- RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.priority_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='proposals' AND policyname='Allow All') THEN
    CREATE POLICY "Allow All" ON public.proposals FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='priority_criteria' AND policyname='Allow All') THEN
    CREATE POLICY "Allow All" ON public.priority_criteria FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='proposal_scores' AND policyname='Allow All') THEN
    CREATE POLICY "Allow All" ON public.proposal_scores FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='work_schedules' AND policyname='Allow All') THEN
    CREATE POLICY "Allow All" ON public.work_schedules FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
