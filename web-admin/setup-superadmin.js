// Setup semua akun test - menggunakan fetch built-in Node.js 18+
const SUPABASE_URL = 'https://ratmptlcrjifuplokask.supabase.co';
const SERVICE_KEY = 'sb_secret_f-edKVAdh1oC22Bo_Q9jNw_WsbXT8YL';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'apikey': SERVICE_KEY,
};

async function createUser(email, password, full_name, role) {
  // 1. Create auth user
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const data = await res.json();

  if (data.error) {
    if (data.msg?.includes('already') || data.error?.includes('already')) {
      console.log(`  ℹ️  ${email} sudah terdaftar, update profil...`);
      // List users to find existing
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=100`, { headers });
      const listData = await listRes.json();
      const existing = (listData.users || []).find(u => u.email === email);
      if (existing) {
        await upsertProfile(existing.id, full_name, role);
        console.log(`  ✅ ${full_name} (${role}) - ID: ${existing.id.slice(0,8)}...`);
      }
      return;
    }
    console.error(`  ❌ Gagal buat ${email}: ${JSON.stringify(data)}`);
    return;
  }

  const userId = data.id;
  await upsertProfile(userId, full_name, role);
  console.log(`  ✅ ${full_name} (${role}) - ${email}`);
}

async function upsertProfile(id, full_name, role) {
  await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ id, full_name, role }),
  });
}

async function main() {
  console.log('=== SWAKELOLASDA - Setup Akun Test ===\n');

  // Buat semua akun sekaligus
  const accounts = [
    { email: 'rakanormalisasi2@gmail.com', password: 'rakaganteng', name: 'Super Admin', role: 'superadmin' },
    { email: 'normalisasi@swakelolasda.test', password: 'test1234', name: 'Admin Normalisasi', role: 'seksi_normalisasi' },
    { email: 'embung@swakelolasda.test', password: 'test1234', name: 'Admin Embung', role: 'seksi_embung' },
    { email: 'peralatan@swakelolasda.test', password: 'test1234', name: 'Tim Peralatan', role: 'peralatan' },
    { email: 'operator@swakelolasda.test', password: 'test1234', name: 'Operator Test', role: 'operator' },
  ];

  for (const acc of accounts) {
    process.stdout.write(`Membuat akun ${acc.role}... `);
    await createUser(acc.email, acc.password, acc.name, acc.role);
  }

  console.log('\n=== AKUN SIAP DIGUNAKAN ===');
  console.log('┌─────────────────────────────────────────────────────┐');
  console.log('│ SUPERADMIN                                          │');
  console.log('│  Email   : rakanormalisasi2@gmail.com               │');
  console.log('│  Password: rakaganteng                              │');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log('│ SEKSI NORMALISASI                                   │');
  console.log('│  Email   : normalisasi@swakelolasda.test            │');
  console.log('│  Password: test1234                                 │');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log('│ SEKSI EMBUNG                                        │');
  console.log('│  Email   : embung@swakelolasda.test                 │');
  console.log('│  Password: test1234                                 │');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log('│ TIM PERALATAN                                       │');
  console.log('│  Email   : peralatan@swakelolasda.test              │');
  console.log('│  Password: test1234                                 │');
  console.log('└─────────────────────────────────────────────────────┘');
}

main().catch(console.error);
