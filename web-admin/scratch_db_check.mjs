import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(l => {
  if (l.includes('=')) {
    const [k, ...v] = l.split('=');
    process.env[k.trim()] = v.join('=').trim().replace(/['"]/g, '');
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking priority_criteria...');
  const { data: criteria, error: err1 } = await supabase.from('priority_criteria').select('*');
  console.log(err1 ? 'Error: ' + err1.message : `Criteria count: ${criteria?.length}`);

  console.log('\nChecking proposal_scores...');
  const { data: scores, error: err2 } = await supabase.from('proposal_scores').select('*').limit(10);
  console.log(err2 ? 'Error: ' + err2.message : `Scores:`, scores);

  console.log('\nChecking work_schedules...');
  const { data: ws, error: err3 } = await supabase.from('work_schedules').select('*, equipment:heavy_equipment(id)').limit(1);
  console.log('heavy_equipment join error?', err3?.message || 'Success');

  const { data: ws2, error: err4 } = await supabase.from('work_schedules').select('*, equipment:equipments(id)').limit(1);
  console.log('equipments join error?', err4?.message || 'Success');
}

check();
