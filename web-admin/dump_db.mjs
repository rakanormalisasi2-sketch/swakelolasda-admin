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
  const { data: assignments, error: err1 } = await supabase
    .from('assignments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  const { data: equip, error: err2 } = await supabase.from('heavy_equipment').select('*').eq('status', 'operating');

  const { data: activeAsgns, error: err3 } = await supabase.from('assignments').select('*').eq('status', 'active');

  const out = JSON.stringify({
    assignmentsError: err1,
    assignments,
    equipError: err2,
    operatingEquip: equip,
    activeAsgnsError: err3,
    activeAsgns
  }, null, 2);

  fs.writeFileSync('db_dump.json', out);
}
check();
