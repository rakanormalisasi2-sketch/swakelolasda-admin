-- Tambah kolom helper_name yang kurang ke tabel operator_logs
ALTER TABLE public.operator_logs 
ADD COLUMN IF NOT EXISTS helper_name TEXT;
