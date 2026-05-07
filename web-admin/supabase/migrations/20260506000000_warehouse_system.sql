-- ============================================================
-- Warehouse System Migration (DB2 - Secondary Database)
-- Target: Sistem Pengelolaan Gudang Peralatan
-- ============================================================

-- 1. Kategori Barang (Dynamic Categories)
CREATE TABLE IF NOT EXISTS warehouse_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO warehouse_categories (name, description) VALUES
    ('Sparepart', 'Suku cadang alat berat'),
    ('Barang Habis Pakai', 'Barang yang langsung terpakai (oli, grease, filter, dll)'),
    ('Alat Bantu', 'Peralatan tangan dan alat bantu kerja')
ON CONFLICT DO NOTHING;

-- 2. Master Stok Barang
CREATE TABLE IF NOT EXISTS warehouse_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES warehouse_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    current_stock NUMERIC DEFAULT 0 CHECK (current_stock >= 0),
    unit TEXT NOT NULL,  -- Pail, Pcs, Liter, Kg, dll
    min_stock NUMERIC DEFAULT 0,  -- Minimum stock warning
    price_per_unit NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Permintaan Barang (dari Operator/Mekanik)
CREATE TABLE IF NOT EXISTS warehouse_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type TEXT NOT NULL CHECK (request_type IN ('operator_grease', 'mekanik_pemeriksaan', 'manual')),
    item_id UUID REFERENCES warehouse_items(id) ON DELETE SET NULL,
    requested_qty NUMERIC NOT NULL CHECK (requested_qty > 0),
    approved_qty NUMERIC,  -- Qty yang disetujui (bisa berbeda dari requested)
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled')),
    requested_by TEXT,  -- Nama peminta
    requester_role TEXT,  -- 'operator' / 'mekanik'
    equipment_id TEXT,  -- Reference ke DB1.heavy_equipment (store as TEXT for cross-DB)
    equipment_name TEXT,  -- Nama alat (cached for display)
    notes TEXT,
    approved_by TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    fulfilled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Histori Transaksi (Masuk/Keluar)
CREATE TABLE IF NOT EXISTS warehouse_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES warehouse_items(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('masuk', 'keluar', 'adjustment')),
    qty NUMERIC NOT NULL CHECK (qty > 0),
    qty_before NUMERIC DEFAULT 0,
    qty_after NUMERIC DEFAULT 0,
    reference_id UUID,  -- Reference ke request_id jika dari permintaan
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. APK Password Config (untuk mobile app authentication)
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default APK passwords
INSERT INTO app_settings (config_key, config_value, description) VALUES
    ('apk_password_mekanik', 'mekanik2024', 'Password untuk akses halaman Mekanik di APK'),
    ('apk_password_gudang', 'gudang2024', 'Password untuk akses halaman Gudang di APK')
ON CONFLICT DO NOTHING;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_warehouse_items_category ON warehouse_items(category_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_requests_status ON warehouse_requests(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_requests_type ON warehouse_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_warehouse_requests_created ON warehouse_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_transactions_item ON warehouse_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transactions_type ON warehouse_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_warehouse_transactions_date ON warehouse_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(config_key);

-- ============================================================
-- FUNCTION: Auto update stock after transaction
-- ============================================================
CREATE OR REPLACE FUNCTION update_item_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.transaction_type = 'masuk' THEN
            UPDATE warehouse_items SET current_stock = current_stock + NEW.qty, updated_at = NOW() WHERE id = NEW.item_id;
        ELSIF NEW.transaction_type = 'keluar' THEN
            UPDATE warehouse_items SET current_stock = current_stock - NEW.qty, updated_at = NOW() WHERE id = NEW.item_id;
        ELSIF NEW.transaction_type = 'adjustment' THEN
            UPDATE warehouse_items SET current_stock = NEW.qty_after, updated_at = NOW() WHERE id = NEW.item_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stock ON warehouse_transactions;
CREATE TRIGGER trigger_update_stock
    AFTER INSERT ON warehouse_transactions
    FOR EACH ROW EXECUTE FUNCTION update_item_stock();

-- ============================================================
-- FUNCTION: Update request status on fulfillment
-- ============================================================
CREATE OR REPLACE FUNCTION fulfill_warehouse_request()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'fulfilled' AND OLD.status != 'fulfilled' THEN
        NEW.fulfilled_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_fulfill_request ON warehouse_requests;
CREATE TRIGGER trigger_fulfill_request
    BEFORE UPDATE ON warehouse_requests
    FOR EACH ROW EXECUTE FUNCTION fulfill_warehouse_request();