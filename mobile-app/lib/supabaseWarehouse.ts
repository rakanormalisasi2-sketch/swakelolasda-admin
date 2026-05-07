import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_WAREHOUSE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_WAREHOUSE_ANON_KEY || '';

export const supabaseWarehouse = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});
