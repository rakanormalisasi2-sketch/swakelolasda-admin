-- =====================================================
-- MIGRASI: Update assignments & heavy_equipment untuk
-- fitur lokasi persistence saat maintenance
-- =====================================================

-- 1. Tambah field is_at_job_location di assignments
-- Jika true: alat tetap di lokasi kerja meskipun status maintenance
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS is_at_job_location boolean DEFAULT true;

-- 2. Tambah field condition_notes di heavy_equipment untuk alasan maintenance
ALTER TABLE heavy_equipment
ADD COLUMN IF NOT EXISTS condition_notes text DEFAULT NULL;

-- 3. Tambah index untuk performa
CREATE INDEX IF NOT EXISTS idx_assignments_is_at_job_location ON assignments(is_at_job_location);

-- 4. Update deskripsi
COMMENT ON COLUMN assignments.is_at_job_location IS 'Jika true, alat berat tetap di lokasi kerja meskipun status maintenance';

-- Verifikasi
SELECT 
    'Migrasi berhasil!' AS status,
    column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'assignments' 
AND column_name IN ('latitude', 'longitude', 'is_at_job_location');
