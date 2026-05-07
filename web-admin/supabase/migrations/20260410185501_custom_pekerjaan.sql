-- Migration: Tambah kolom custom_pekerjaan pada operator_logs (Laporan Pelaksanaan)
ALTER TABLE operator_logs ADD COLUMN IF NOT EXISTS custom_pekerjaan text DEFAULT NULL;
