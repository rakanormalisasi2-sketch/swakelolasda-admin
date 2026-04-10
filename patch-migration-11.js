// Migration 11: Tambah kolom custom_pekerjaan via Supabase service role
// Cara: gunakan Supabase REST API dengan service_role key

const https = require('https');
const fs = require('fs');

// Baca credentials dari .env.local
const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => { const m = env.match(new RegExp(key + '=(.+)')); return m ? m[1].trim() : null; };

const SUPABASE_URL  = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_KEY   = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const PROJECT_REF   = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!PROJECT_REF || !SERVICE_KEY) {
  console.error('Gagal baca .env.local'); process.exit(1);
}

const SQL = `ALTER TABLE operator_logs ADD COLUMN IF NOT EXISTS custom_pekerjaan text DEFAULT NULL;`;

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  console.log('Project:', PROJECT_REF);
  console.log('SQL:', SQL);
  console.log('');

  // Coba via Supabase Management API
  const bodyStr = JSON.stringify({ query: SQL });
  const res = await request({
    hostname: 'api.supabase.com',
    path: `/v1/projects/${PROJECT_REF}/database/query`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Length': Buffer.byteLength(bodyStr),
    }
  }, bodyStr);

  console.log('Status:', res.status);
  console.log('Response:', res.body);

  if (res.status === 200 || res.status === 201) {
    console.log('\n✅ Migration berhasil! Kolom custom_pekerjaan ditambahkan.');
  } else {
    console.log('\n⚠️  Coba verifikasi via select apakah kolom sudah ada...');
    // Cek kolom sudah ada lewat REST
    const checkRes = await request({
      hostname: `${PROJECT_REF}.supabase.co`,
      path: '/rest/v1/operator_logs?select=custom_pekerjaan&limit=1',
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    });
    console.log('Check status:', checkRes.status);
    if (checkRes.status === 200) {
      console.log('✅ Kolom custom_pekerjaan sudah ada di database!');
    } else {
      console.log('❌ Kolom belum ada. Response:', checkRes.body.substring(0, 300));
    }
  }
}

run().catch(e => { console.error('Error:', e.message); });
