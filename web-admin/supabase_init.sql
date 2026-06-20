-- === SUPABASE SQL INIT SCRIPT - SWAKELOLASDA ===
-- Jalankan di: https://supabase.com/dashboard/project/ratmptlcrjifuplokask/sql/new

-- 1. Tabel Profil Pengguna
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'peralatan', 'seksi_embung', 'seksi_normalisasi', 'operator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel Pengaturan Global
CREATE TABLE IF NOT EXISTS public.app_settings (
  id SERIAL PRIMARY KEY,
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.app_settings (config_key, config_value)
VALUES 
  ('google_drive_folder_id', 'KOSONG'),
  ('google_spreadsheet_embung_id', 'KOSONG'),
  ('google_spreadsheet_normalisasi_id', 'KOSONG'),
  ('google_proposal_embung_id', 'KOSONG'),
  ('google_proposal_normalisasi_id', 'KOSONG')
ON CONFLICT (config_key) DO NOTHING;

-- 3. Tabel Alat Berat
CREATE TABLE IF NOT EXISTS public.heavy_equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  merk_type TEXT,
  status TEXT DEFAULT 'ready' CHECK (status IN ('ready', 'operating', 'maintenance')),
  condition_percentage INT DEFAULT 100 CHECK (condition_percentage >= 0 AND condition_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabel Penugasan
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID REFERENCES public.user_profiles(id),
  helper_id UUID REFERENCES public.user_profiles(id),
  equipment_id UUID REFERENCES public.heavy_equipment(id),
  job_type TEXT NOT NULL CHECK (job_type IN ('normalisasi', 'embung', 'lainnya')),
  custom_job_description TEXT,
  location_district TEXT NOT NULL,
  location_village TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'finished')),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE
);

-- 5. Tabel Log Kerusakan
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID REFERENCES public.heavy_equipment(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES public.user_profiles(id),
  damage_description TEXT NOT NULL,
  progress_status TEXT DEFAULT 'pelaporan' CHECK (progress_status IN ('pelaporan', 'diterima', 'pengerjaan', 'selesai')),
  repair_notes TEXT,
  mechanic_report_url TEXT,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- 6. Tabel Laporan Harian
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES public.assignments(id),
  tanggal_laporan DATE NOT NULL,
  progress_pekerjaan TEXT,
  panjang_pekerjaan TEXT,
  hm_awal NUMERIC,
  hm_akhir NUMERIC,
  keterangan_tambahan TEXT,
  foto_urls TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heavy_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_profiles' AND policyname='Allow All') THEN
    CREATE POLICY "Allow All" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_settings' AND policyname='Allow All') THEN
    CREATE POLICY "Allow All" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='heavy_equipment' AND policyname='Allow All') THEN
    CREATE POLICY "Allow All" ON public.heavy_equipment FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='assignments' AND policyname='Allow All') THEN
    CREATE POLICY "Allow All" ON public.assignments FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='maintenance_logs' AND policyname='Allow All') THEN
    CREATE POLICY "Allow All" ON public.maintenance_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_reports' AND policyname='Allow All') THEN
    CREATE POLICY "Allow All" ON public.daily_reports FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Insert profil untuk akun yang sudah dibuat lewat script
-- (Akan otomatis skip jika profil sudah ada)
INSERT INTO public.user_profiles (id, full_name, role)
SELECT id, 'Super Admin', 'superadmin'
FROM auth.users WHERE email = 'rakanormalisasi2@gmail.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, full_name, role)
SELECT id, 'Admin Normalisasi', 'seksi_normalisasi'
FROM auth.users WHERE email = 'normalisasi@test.local'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, full_name, role)
SELECT id, 'Admin Embung', 'seksi_embung'
FROM auth.users WHERE email = 'embung@test.local'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, full_name, role)
SELECT id, 'Tim Peralatan', 'peralatan'
FROM auth.users WHERE email = 'peralatan@test.local'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_profiles (id, full_name, role)
SELECT id, 'Budi Operator', 'operator'
FROM auth.users WHERE email = 'operator@test.local'
ON CONFLICT (id) DO NOTHING;

SELECT 'Setup selesai! Semua tabel dan profil telah dibuat.' as status;

/*
  MIGRASI FASE 1.5: LAPORAN OPERATOR & PENGATURAN SEKSI
*/

-- TABEL PENGATURAN SISTEM PER SEKSI
CREATE TABLE IF NOT EXISTS public.section_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    role character varying(50) UNIQUE NOT NULL,
    spreadsheet_id text,
    gdrive_folder_id text,
    updated_at timestamp with time zone DEFAULT now()
);

-- TABEL LAPORAN HARIAN (DATA DARI APK OPERATOR)
CREATE TABLE IF NOT EXISTS public.operator_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE,
    operator_id uuid REFERENCES public.user_profiles(id),
    equipment_id uuid REFERENCES public.heavy_equipment(id),
    reported_at timestamp with time zone DEFAULT now(),
    tanggal date NOT NULL,
    hm_awal numeric(10,2),
    hm_akhir numeric(10,2),
    jam_kerja numeric(10,2),
    progress_pekerjaan text,
    panjang_pekerjaan text,
    keterangan_tambahan text,
    foto_lapangan_urls text,
    foto_hourmeter_urls text
);

-- Kebijakan Akses (Security)
ALTER TABLE public.section_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable Read settings for authenticated users" ON public.section_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable Insert/Update settings for admins" ON public.section_settings FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE public.operator_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable Read operator logs for authenticated users" ON public.operator_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable Insert operator logs for operators" ON public.operator_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable Update operator logs for operators and admins" ON public.operator_logs FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable Delete operator logs for admins" ON public.operator_logs FOR DELETE USING (auth.role() = 'authenticated');
