const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.rpggkbkmowdbxtgfgbop:Rakaganteng@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function run() {
  await client.connect();
  console.log("Connected to DB2");
  await client.query(`ALTER TABLE warehouse_items ADD COLUMN IF NOT EXISTS photo_url TEXT;`);
  console.log("Added photo_url to warehouse_items");
  await client.end();
}

run().catch(console.error);
