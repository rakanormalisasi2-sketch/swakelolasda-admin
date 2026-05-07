-- =====================================================
-- MIGRASI: Tambahkan kolom latitude & longitude
-- untuk input koordinat manual pada penugasan
-- =====================================================
-- Jalankan di Supabase Dashboard > SQL Editor
-- =====================================================

ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS latitude numeric DEFAULT NULL, 
ADD COLUMN IF NOT EXISTS longitude numeric DEFAULT NULL;

-- Buat index untuk performa query
CREATE INDEX IF NOT EXISTS idx_assignments_latitude ON assignments(latitude);
CREATE INDEX IF NOT EXISTS idx_assignments_longitude ON assignments(longitude);

-- Tampilkan konfirmasi
SELECT 
    'Migrasi berhasil!' AS status,
    COUNT(*) AS total_kolom,
    string_agg(column_name, ', ') AS kolom_baru
FROM information_schema.columns 
WHERE table_name = 'assignments' 
AND column_name IN ('latitude', 'longitude');
