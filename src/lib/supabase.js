import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ratmptlcrjifuplokask.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdG1wdGxjcmppZnVwbG9rYXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MzA0OTksImV4cCI6MjA5MTEwNjQ5OX0.2hdwAtm3zEkvfjDeQroCJBN1ooGCqBePhk9R6g0zT18';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
