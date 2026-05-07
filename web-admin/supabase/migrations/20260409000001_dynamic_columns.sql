-- ============================================================
-- Migration 9: Dynamic Columns untuk Laporan Pelaksanaan
-- Jalankan di: https://supabase.com/dashboard/project/ratmptlcrjifuplokask/sql/new
-- ============================================================

-- ─── 1. Tabel konfigurasi kolom per seksi ────────────────────────────
CREATE TABLE IF NOT EXISTS public.section_column_configs (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role         text NOT NULL,              -- 'seksi_normalisasi' | 'seksi_embung'
  column_key   text NOT NULL,              -- key unik snake_case, e.g. 'volume_tanah'
  column_label text NOT NULL,             -- label tampil, e.g. 'Volume Tanah (m³)'
  column_type  text DEFAULT 'text',       -- 'text' | 'number' | 'dropdown' | 'formula' | 'checkbox'
  dropdown_options text[],               -- untuk tipe dropdown: ['Cerah','Mendung','Hujan']
  formula      text,                      -- untuk tipe formula: '{hm_akhir} - {hm_awal}'
  position     integer NOT NULL DEFAULT 0, -- urutan kolom custom (0 = pertama)
  is_required  boolean DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(role, column_key)
);

-- ─── 2. Kolom custom_fields di operator_logs ─────────────────────────
ALTER TABLE public.operator_logs
ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}';
-- Contoh isi: {"volume_tanah": "150", "kondisi_cuaca": "Cerah"}

-- ─── 3. RLS untuk section_column_configs ─────────────────────────────
ALTER TABLE public.section_column_configs ENABLE ROW LEVEL SECURITY;

-- Anon bisa baca (APK fetch konfigurasi)
DROP POLICY IF EXISTS "Allow anon select section_column_configs" ON public.section_column_configs;
CREATE POLICY "Allow anon select section_column_configs"
ON public.section_column_configs FOR SELECT TO anon USING (true);

-- Authenticated bisa semua (web admin kelola)
DROP POLICY IF EXISTS "Allow authenticated all section_column_configs" ON public.section_column_configs;
CREATE POLICY "Allow authenticated all section_column_configs"
ON public.section_column_configs FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- ─── 4. Seed kolom default untuk seksi normalisasi ───────────────────
-- (Bisa dihapus/diubah dari UI nanti)
INSERT INTO public.section_column_configs (role, column_key, column_label, column_type, position)
VALUES
  ('seksi_normalisasi', 'panjang_normalisasi', 'Panjang Normalisasi (m)', 'number', 0),
  ('seksi_normalisasi', 'volume_galian',       'Volume Galian (m³)',      'number', 1)
ON CONFLICT (role, column_key) DO NOTHING;

INSERT INTO public.section_column_configs (role, column_key, column_label, column_type, position)
VALUES
  ('seksi_embung', 'elevasi_air',    'Elevasi Air (m)',    'number', 0),
  ('seksi_embung', 'kondisi_embung', 'Kondisi Embung',     'dropdown', 1)
ON CONFLICT (role, column_key) DO NOTHING;

-- Update dropdown_options untuk kondisi_embung
UPDATE public.section_column_configs
SET dropdown_options = ARRAY['Baik', 'Cukup', 'Rusak Ringan', 'Rusak Berat']
WHERE role = 'seksi_embung' AND column_key = 'kondisi_embung';

-- ─── 5. Index performa ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_section_col_configs_role ON public.section_column_configs(role);
