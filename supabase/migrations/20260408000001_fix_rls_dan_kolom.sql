-- ============================================================
-- Migration 8: Fix RLS Policies + Kolom operator_id & equipment_id
-- Jalankan di Supabase SQL Editor
-- https://supabase.com/dashboard/project/ratmptlcrjifuplokask/sql/new
-- ============================================================

-- ─── 1. OPERATOR_LOGS: Tambah kolom yang dibutuhkan APK ───────────────

-- Kolom operator_id (relasi ke user_profiles → untuk nama operator di web)
ALTER TABLE public.operator_logs
ADD COLUMN IF NOT EXISTS operator_id uuid REFERENCES auth.users(id);

-- Kolom equipment_id (relasi ke heavy_equipment → untuk nama alat di web)
ALTER TABLE public.operator_logs
ADD COLUMN IF NOT EXISTS equipment_id uuid REFERENCES public.heavy_equipment(id);

-- Kolom override_alat (fallback nama alat jika equipment_id null)
ALTER TABLE public.operator_logs
ADD COLUMN IF NOT EXISTS override_alat text;

-- ─── 2. RLS POLICIES: operator_logs ──────────────────────────────────

-- Izinkan anon INSERT (APK operator submit tanpa login)
DROP POLICY IF EXISTS "Allow anon insert operator_logs" ON public.operator_logs;
CREATE POLICY "Allow anon insert operator_logs"
ON public.operator_logs
FOR INSERT
TO anon
WITH CHECK (true);

-- Izinkan anon SELECT (jika diperlukan di APK)
DROP POLICY IF EXISTS "Allow anon select operator_logs" ON public.operator_logs;
CREATE POLICY "Allow anon select operator_logs"
ON public.operator_logs
FOR SELECT
TO anon
USING (true);

-- Izinkan authenticated SELECT (web admin)
DROP POLICY IF EXISTS "Allow authenticated select operator_logs" ON public.operator_logs;
CREATE POLICY "Allow authenticated select operator_logs"
ON public.operator_logs
FOR SELECT
TO authenticated
USING (true);

-- ─── 3. RLS POLICIES: maintenance_logs ───────────────────────────────

-- Izinkan anon INSERT (APK mekanik submit tanpa login)
DROP POLICY IF EXISTS "Allow anon insert maintenance_logs" ON public.maintenance_logs;
CREATE POLICY "Allow anon insert maintenance_logs"
ON public.maintenance_logs
FOR INSERT
TO anon
WITH CHECK (true);

-- Izinkan anon SELECT
DROP POLICY IF EXISTS "Allow anon select maintenance_logs" ON public.maintenance_logs;
CREATE POLICY "Allow anon select maintenance_logs"
ON public.maintenance_logs
FOR SELECT
TO anon
USING (true);

-- Izinkan anon UPDATE (APK mekanik update log yang ada)
DROP POLICY IF EXISTS "Allow anon update maintenance_logs" ON public.maintenance_logs;
CREATE POLICY "Allow anon update maintenance_logs"
ON public.maintenance_logs
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Izinkan authenticated FULL ACCESS (web admin)
DROP POLICY IF EXISTS "Allow authenticated all maintenance_logs" ON public.maintenance_logs;
CREATE POLICY "Allow authenticated all maintenance_logs"
ON public.maintenance_logs
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ─── 4. Index untuk performa ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_operator_logs_operator_id ON public.operator_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_logs_equipment_id ON public.operator_logs(equipment_id);
