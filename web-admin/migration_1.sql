-- === MIGRASI TAHAP 1: PENAMBAHAN FITUR FLEKSIBILITAS OPERATOR ===
-- Jalankan di: https://supabase.com/dashboard/project/ratmptlcrjifuplokask/sql/new

-- 1. Tambah kolom untuk membedakan asal penugasan (Normalisasi vs Embung)
ALTER TABLE public.assignments 
ADD COLUMN IF NOT EXISTS created_by_role TEXT;

-- 2. Tambah kolom untuk menampung perubahan lokasi & helper dari operator di lapangan
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS location_district_override TEXT,
ADD COLUMN IF NOT EXISTS location_village_override TEXT,
ADD COLUMN IF NOT EXISTS helper_override TEXT,
ADD COLUMN IF NOT EXISTS is_modified_by_operator BOOLEAN DEFAULT false;

-- 3. Update data lama agar tidak null
UPDATE public.assignments SET created_by_role = 'superadmin' WHERE created_by_role IS NULL;

SELECT 'Migrasi Tahap 1 Selesai!' as status;
