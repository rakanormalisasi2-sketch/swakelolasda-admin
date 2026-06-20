import { createClient } from '@supabase/supabase-js';

const bbmUrl = process.env.SUPABASE_BBM_URL;
const bbmKey = process.env.SUPABASE_BBM_SERVICE_KEY;

if (typeof window !== 'undefined') {
  throw new Error('supabase-bbm hanya boleh digunakan di server-side (API Routes)');
}

export const supabaseBBM = createClient(bbmUrl, bbmKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
