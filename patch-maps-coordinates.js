const https = require('https');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => { const m = env.match(new RegExp(key + '=(.+)')); return m ? m[1].trim() : null; };

const SUPABASE_URL  = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_KEY   = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const PROJECT_REF   = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

const SQL = `ALTER TABLE assignments ADD COLUMN IF NOT EXISTS latitude numeric DEFAULT NULL, ADD COLUMN IF NOT EXISTS longitude numeric DEFAULT NULL;`;

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
  console.log('Selesai update tabel assignments');
}

run();
