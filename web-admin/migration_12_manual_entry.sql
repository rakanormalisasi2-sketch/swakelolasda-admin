-- ============================================================
-- Migration 12: Support Manual Entry di Laporan Pelaksanaan
-- Tambah kolom is_manual, created_by_role pada operator_logs
-- Buat assignment_id nullable agar baris manual bisa tanpa assignment
-- ============================================================

-- 1. Tandai apakah baris ini diinput manual oleh admin (bukan dari APK)
ALTER TABLE operator_logs
ADD COLUMN IF NOT EXISTS is_manual boolean DEFAULT false;

-- 2. Siapa yang membuat baris manual ini (role admin)
ALTER TABLE operator_logs
ADD COLUMN IF NOT EXISTS created_by_role text;

-- 3. Buat assignment_id nullable (FK constraint sudah ON DELETE CASCADE)
ALTER TABLE operator_logs
ALTER COLUMN assignment_id DROP NOT NULL;
