// Run: node setup-db.mjs
// Requires Node.js 18+

const SUPABASE_URL = 'https://ratmptlcrjifuplokask.supabase.co';
const SERVICE_KEY = 'sb_secret_f-edKVAdh1oC22Bo_Q9jNw_WsbXT8YL';

const H = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'apikey': SERVICE_KEY,
};

async function sql(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ query }),
  });
  return res.json();
}

async function createAuthUser(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const d = await res.json();
  if (d.id) return { id: d.id, new: true };

  // Already exists - find it
  const list = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=200`, { headers: H });
  const listData = await list.json();
  const existing = (listData.users || []).find(u => u.email === email);
  return existing ? { id: existing.id, new: false } : null;
}

async function upsertProfile(id, full_name, role) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
    method: 'POST',
    headers: { ...H, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ id, full_name, role }),
  });
  const text = await res.text();
  return text;
}

async function main() {
  console.log('=== SWAKELOLASDA Setup ===\n');

  // === BUAT AKUN TEST ===
  const accounts = [
    { email: 'rakanormalisasi2@gmail.com', password: 'rakaganteng',   name: 'Super Admin',       role: 'superadmin' },
    { email: 'normalisasi@test.local',      password: 'test1234',       name: 'Admin Normalisasi', role: 'seksi_normalisasi' },
    { email: 'embung@test.local',           password: 'test1234',       name: 'Admin Embung',      role: 'seksi_embung' },
    { email: 'peralatan@test.local',        password: 'test1234',       name: 'Tim Peralatan',     role: 'peralatan' },
    { email: 'operator@test.local',         password: 'test1234',       name: 'Budi Operator',     role: 'operator' },
  ];

  console.log('Membuat akun pengguna...');
  for (const acc of accounts) {
    process.stdout.write(`  ${acc.role.padEnd(20)}: `);
    const user = await createAuthUser(acc.email, acc.password);
    if (!user) { console.log('❌ Gagal'); continue; }
    await upsertProfile(user.id, acc.name, acc.role);
    console.log(`${user.new ? '✅ Baru' : 'ℹ️  Update'} — ${acc.email}`);
  }

  console.log('\n=== SUMMARY AKUN ===');
  console.log('Superadmin  : rakanormalisasi2@gmail.com / rakaganteng');
  console.log('Normalisasi : normalisasi@test.local / test1234');
  console.log('Embung      : embung@test.local / test1234');
  console.log('Peralatan   : peralatan@test.local / test1234');
  console.log('Operator    : operator@test.local / test1234');
  console.log('\n⚠️  PENTING: Tabel SQL harus dijalankan manual di Supabase Dashboard!');
  console.log('   Buka: https://supabase.com/dashboard/project/ratmptlcrjifuplokask/sql/new');
  console.log('   Lalu paste file: supabase_schema.sql yang ada di folder artifacts');
}

main().catch(console.error);
