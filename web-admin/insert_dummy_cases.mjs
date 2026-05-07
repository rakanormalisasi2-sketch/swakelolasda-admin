import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ratmptlcrjifuplokask.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_f-edKVAdh1oC22Bo_Q9jNw_WsbXT8YL';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Bersihkan data lama...');
  await supabase.from('daily_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('maintenance_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Ambil alat berat
  const { data: alat } = await supabase.from('heavy_equipment').select('*').limit(4);
  if (alat.length < 4) {
    console.log('Tidak cukup alat berat di database.'); return;
  }
  
  // Ambil user profil (Tim Peralatan dan Operator)
  const { data: timAlt } = await supabase.from('user_profiles').select('*').eq('role', 'peralatan').limit(1);
  const { data: operators } = await supabase.from('user_profiles').select('*').eq('role', 'operator').limit(2);
  const peralatanId = timAlt[0]?.id;
  const op1 = operators[0]?.id;
  const op2 = operators[1]?.id; // Jika op2 undefined, kita pakai op1 lagi atau null

  if(!op1) {
     console.log('Tidak ada akun operator di DB. Tolong daftar minimal 1 akun operator.');
     return;
  }

  // --- KASUS 1: Maintenance saat sedang Beroperasi/Ditugaskan ---
  console.log('Kasus 1: Maintenance di tengah pekerjaan...');
  const a1 = alat[0];
  await supabase.from('assignments').insert({
    operator_id: op1,
    equipment_id: a1.id,
    job_type: 'normalisasi',
    location_district: 'Tambakrejo',
    location_village: 'Sukorejo',
    status: 'active',
  });
  await supabase.from('heavy_equipment').update({ status: 'maintenance', condition_percentage: 45 }).eq('id', a1.id);
  await supabase.from('maintenance_logs').insert({
    equipment_id: a1.id,
    reported_by: peralatanId,
    damage_description: 'Trek rantai putus saat sedang mengeruk lumpur. Sedang dilas oleh mekanik di area lapangan, operator menunggu perbaikan selesai.',
    progress_status: 'pengerjaan',
    repair_notes: 'Mekanik sedang di lokasi membawa las portabel.'
  });

  // --- KASUS 2: Rusak parah di Pool / Standby ---
  console.log('Kasus 2: Rusak Parah di Pool...');
  const a2 = alat[1];
  await supabase.from('heavy_equipment').update({ status: 'maintenance', condition_percentage: 15 }).eq('id', a2.id);
  await supabase.from('maintenance_logs').insert({
    equipment_id: a2.id,
    reported_by: peralatanId,
    damage_description: 'Turun mesin total. Indikator air radiator bocor dan mesin tidak bisa distarter di pool garasi.',
    progress_status: 'diterima',
    repair_notes: 'Menunggu kiriman sparepart silinder blok dari pabrik.'
  });

  // --- KASUS 3: Beroperasi Lancer (Tanpa Masalah) ---
  console.log('Kasus 3: Beroperasi Normal...');
  const a3 = alat[2];
  if (op2) {
      await supabase.from('assignments').insert({
        operator_id: op2,
        equipment_id: a3.id,
        job_type: 'embung',
        location_district: 'Baureno',
        location_village: 'Bumiayu',
        status: 'active',
      });
  }
  await supabase.from('heavy_equipment').update({ status: 'operating', condition_percentage: 85 }).eq('id', a3.id);

  // --- KASUS 4: Ready (Sehat wal afiat di Pool) ---
  console.log('Kasus 4: Ready & Sehat...');
  const a4 = alat[3];
  await supabase.from('heavy_equipment').update({ status: 'ready', condition_percentage: 95 }).eq('id', a4.id);

  console.log('Berhasil menginjeksikan data contoh ke database!');
}

run();
