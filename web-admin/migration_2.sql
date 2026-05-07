-- Eksekusi kode ini di Supabase SQL Editor
ALTER TABLE public.operator_logs
ADD COLUMN override_operator TEXT,
ADD COLUMN override_alat TEXT,
ADD COLUMN override_kecamatan TEXT,
ADD COLUMN override_desa TEXT;
