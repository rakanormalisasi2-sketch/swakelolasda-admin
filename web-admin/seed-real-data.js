const SUPABASE_URL = 'https://ratmptlcrjifuplokask.supabase.co';
const SERVICE_KEY = 'sb_secret_f-edKVAdh1oC22Bo_Q9jNw_WsbXT8YL';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'apikey': SERVICE_KEY,
};

async function createUser(email, full_name, role) {
  const password = 'operator123';
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const data = await res.json();

  if (data.error) {
    if (data.msg?.includes('already') || data.error?.includes('already')) {
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, { headers });
      const listData = await listRes.json();
      const existing = (listData.users || []).find(u => u.email === email);
      if (existing) {
        await upsertProfile(existing.id, full_name, role);
      }
      return;
    }
    console.error(`  ❌ Gagal buat ${email}: ${JSON.stringify(data)}`);
    return;
  }
  await upsertProfile(data.id, full_name, role);
}

async function upsertProfile(id, full_name, role) {
  await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
    body: JSON.stringify({ id, full_name, role }),
  });
}

function normalizeToEmail(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '') + '@operator.local';
}

async function seedHeavyEquipment(equipments) {
  console.log('\n--- Seeding Heavy Equipment ---');
  for (const name of equipments) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/heavy_equipment?name=eq.${encodeURIComponent(name)}`, { headers });
    const existing = await res.json();
    if (existing && existing.length > 0) {
      console.log(`✅ Alat sudah ada: ${name}`);
      continue;
    }
    await fetch(`${SUPABASE_URL}/rest/v1/heavy_equipment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: name, status: 'ready', condition_percentage: 100 }),
    });
    console.log(`➕ Menambahkan Alat: ${name}`);
  }
}

async function main() {
  const operators = [
    "HUDIONO", "MOCHAMAD WAHYUDI", "SHOLIHUL HAMIM", "HERU PRASETYO", "NUR SAFI'I",
    "RUDIYANTO", "FATKUR ROHMAN", "ANDRIK AGUS SUBANDRIO", "MUHAMMAD YUSUF", "DEVI LINA NOVITA",
    "AHMAD SAMZUL DHUKA", "PARDIONO", "MAHMUDI", "SUPRIYADI", "DIKY ANDIKA PUTRA",
    "MUHAMMAD ABDUL MAJID", "KHOIRUL FAWAID", "MOHAMAD SYAIFUDIN", "YUNANDA SEKTI TUNGGAL ADITYA",
    "IWAN NASRUDIN", "M. ARDI SUSANTO", "ARIS ROHMADI", "DWI PRIYO YULIANTO", "SUMINTO", "BADUK ARIFIN"
  ];

  const equipments = [
    "Excavator 5 Ton (PC 50)",
    "Excavator 7,5 Ton (PC 75)",
    "Excavator 13 Ton (313D / PC 100)",
    "Excavator 20 Ton Standard (PC 200)",
    "Excavator 20 Ton Long Arm",
    "Bulldozer",
    "Wheel Excavator"
  ];

  console.log('=== SEEDING DATA SWAKELOLASDA ===\n');

  console.log('--- Seeding Operator Profiles ---');
  for (const name of operators) {
    const email = normalizeToEmail(name);
    process.stdout.write(`Membuat operator ${name}... `);
    await createUser(email, name, 'operator');
    console.log(`(Email: ${email})`);
  }

  await seedHeavyEquipment(equipments);
  
  console.log('\n=== SEEDING SELESAI ===');
}

main().catch(console.error);
