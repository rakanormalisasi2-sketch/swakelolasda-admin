-- ============================================================
-- Migration 10: Tambah kolom teks fallback operator_name & jenis_alat
-- Untuk menampilkan data lama (sebelum migration 8) yang tidak punya FK
-- Jalankan di: https://supabase.com/dashboard/project/ratmptlcrjifuplokask/sql/new
-- ============================================================

-- Kolom teks nama operator (diisi APK jika relasi uuid belum ada / gagal)
ALTER TABLE public.operator_logs
ADD COLUMN IF NOT EXISTS operator_name text;

-- Kolom teks jenis alat berat (diisi APK sebagai teks fallback)
ALTER TABLE public.operator_logs
ADD COLUMN IF NOT EXISTS jenis_alat text;

-- Isi otomatis dari override_alat yang sudah ada (untuk data lama)
UPDATE public.operator_logs
SET jenis_alat = override_alat
WHERE jenis_alat IS NULL AND override_alat IS NOT NULL;

-- ─── Update kolom custom_fields jika belum ada (dari migration 9) ──────
ALTER TABLE public.operator_logs
ADD COLUMN IF NOT EXISTS custom_fields jsonb;

-- ─── Tabel section_column_configs (dari migration 9) ───────────────────
CREATE TABLE IF NOT EXISTS public.section_column_configs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role          text NOT NULL,
  column_key    text NOT NULL,
  column_label  text NOT NULL,
  column_type   text NOT NULL DEFAULT 'text', -- 'text','number','dropdown','formula','checkbox'
  dropdown_options text[],
  formula       text,
  position      integer NOT NULL DEFAULT 0,
  is_required   boolean NOT NULL DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(role, column_key)
);

-- RLS untuk section_column_configs
ALTER TABLE public.section_column_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read section_column_configs" ON public.section_column_configs;
CREATE POLICY "Allow public read section_column_configs"
ON public.section_column_configs FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage section_column_configs" ON public.section_column_configs;
CREATE POLICY "Allow authenticated manage section_column_configs"
ON public.section_column_configs FOR ALL TO authenticated
USING (true) WITH CHECK (true);
