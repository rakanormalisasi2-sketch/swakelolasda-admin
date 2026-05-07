-- Migration 7: Tambah support foto per-field mekanik + Google Drive tim_peralatan
-- Jalankan di Supabase SQL Editor

-- 1. Pastikan row tim_peralatan ada di section_settings
INSERT INTO section_settings (role)
VALUES ('tim_peralatan')
ON CONFLICT (role) DO NOTHING;

-- 2. Tambah kolom foto_urls di maintenance_logs untuk foto per field
ALTER TABLE maintenance_logs
ADD COLUMN IF NOT EXISTS foto_report_at TIMESTAMPTZ DEFAULT NOW();
-- Foto sudah tersimpan di mechanic_details JSONB (tidak perlu kolom baru, sudah flexible)
-- Hanya pastikan index ada
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_equipment_id ON maintenance_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_progress ON maintenance_logs(progress_status);
