import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
// Support both ANON_KEY and ANOn_KEY (Vercel might uppercase it)
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANOn_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
