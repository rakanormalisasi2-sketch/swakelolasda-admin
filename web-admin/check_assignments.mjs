import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2].trim();
  return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: assignments, error } = await supabase
    .from('assignments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) console.error("Error fetching assignments:", error);
  else console.log("Recent assignments:", assignments);

  const { data: equip } = await supabase.from('heavy_equipment').select('id, name, status').eq('status', 'operating');
  console.log("Operating equipment:", equip);
}
check();
