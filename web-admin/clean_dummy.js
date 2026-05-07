const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ratmptlcrjifuplokask.supabase.co',
  'sb_secret_f-edKVAdh1oC22Bo_Q9jNw_WsbXT8YL'
);

async function cleanDummyData() {
  console.log('🧹 Memulai pembersihan data dummy...');

  // 1. Hapus Tabel Laporan (operator_logs & maintenance_logs)
  const { error: err1 } = await supabase.from('operator_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✅ operator_logs dibersihkan:', err1 ? err1.message : 'OK');

  const { error: err2 } = await supabase.from('maintenance_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✅ maintenance_logs dibersihkan:', err2 ? err2.message : 'OK');

  // 2. Hapus Penugasan
  const { error: err3 } = await supabase.from('assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✅ assignments dibersihkan:', err3 ? err3.message : 'OK');

  // 3. Hapus Alat Berat
  const { error: err4 } = await supabase.from('heavy_equipment').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✅ heavy_equipment dibersihkan:', err4 ? err4.message : 'OK');

  // 4. Hapus User "Operator Test" & Supervisor Test (Jika Ada)
  // Menghapus SEMUA role='operator' agar website benar-benar fresh
  const { error: err5 } = await supabase.from('user_profiles').delete().eq('role', 'operator');
  console.log('✅ profil operator dummy dibersihkan:', err5 ? err5.message : 'OK');

  console.log('\n🎉 Selesai! Web Admin kini dalam keadaan kosong dan siap diisi data asli.');
}

cleanDummyData().catch(console.error);
