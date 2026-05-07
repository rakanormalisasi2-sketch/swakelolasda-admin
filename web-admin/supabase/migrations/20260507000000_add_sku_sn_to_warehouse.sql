-- ============================================================
-- Migration: Add SKU and Serial Number to Warehouse Items
-- ============================================================

ALTER TABLE public.warehouse_items
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS serial_number TEXT;
