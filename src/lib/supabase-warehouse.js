import { createClient } from '@supabase/supabase-js';

const warehouseUrl = process.env.SUPABASE_BBM_URL;
const warehouseKey = process.env.SUPABASE_BBM_SERVICE_KEY;

if (typeof window !== 'undefined') {
  throw new Error('supabase-warehouse hanya boleh digunakan di server-side (API Routes)');
}

export const supabaseWarehouse = createClient(warehouseUrl, warehouseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});