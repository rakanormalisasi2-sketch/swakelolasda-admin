const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.rpggkbkmowdbxtgfgbop:Rakaganteng@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function testConnection() {
  try {
    await client.connect();
    console.log('Connected natively to DB2 using IPv4 Pooler!');
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
