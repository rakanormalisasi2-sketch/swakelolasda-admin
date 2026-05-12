import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://ratmptlcrjifuplokask.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdG1wdGxjcmppZnVwbG9rYXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MzA0OTksImV4cCI6MjA5MTEwNjQ5OX0.2hdwAtm3zEkvfjDeQroCJBN1ooGCqBePhk9R6g0zT18';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const result1 = await supabase.from('assignments').select('*').eq('status', 'active');
  fs.writeFileSync('output.json', JSON.stringify({
    allActive: result1.data,
    error: result1.error
  }, null, 2));
}

checkData();
