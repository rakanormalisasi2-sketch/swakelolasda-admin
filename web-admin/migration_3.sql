-- Eksekusi file SQL ini di halaman SQL Editor Supabase
ALTER TABLE public.heavy_equipment 
ADD COLUMN IF NOT EXISTS nomor_lambung TEXT;
