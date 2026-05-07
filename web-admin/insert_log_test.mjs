import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ratmptlcrjifuplokask.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_f-edKVAdh1oC22Bo_Q9jNw_WsbXT8YL';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // 1. Get a heavy equipment
  const { data: alat } = await supabase.from('heavy_equipment').select('*').limit(1);
  if (!alat || alat.length === 0) {
    console.log('No equipment found');
    return;
  }
  
  const targetAlat = alat[0];

  // 2. Set to maintenance
  await supabase.from('heavy_equipment').update({ status: 'maintenance' }).eq('id', targetAlat.id);

  // 3. Insert a log
  const { data: profile } = await supabase.from('user_profiles').select('id').eq('email', 'rakanormalisasi2@gmail.com').maybeSingle();
  
  const { error } = await supabase.from('maintenance_logs').insert({
    equipment_id: targetAlat.id,
    damage_description: 'Mesin mengalami overheat saat bekerja di lapangan. Butuh penggantian radiator.',
    progress_status: 'diterima',
  });

  if (error) {
    console.error('Error inserting log:', error);
  } else {
    console.log('Successfully added maintenance log for:', targetAlat.name);
  }
}

run();
