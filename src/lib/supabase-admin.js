import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ratmptlcrjifuplokask.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_f-edKVAdh1oC22Bo_Q9jNw_WsbXT8YL';

if (typeof window !== 'undefined') {
  console.warn('WARNING: supabaseAdmin is being initialized on the client side. This is DANGEROUS and serviceRoleKey should not be exposed.');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
