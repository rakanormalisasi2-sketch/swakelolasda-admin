const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:2uk2xvH5kF4j8U9F@db.ratmptlcrjifuplokask.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  try {
    await client.query('ALTER TABLE proposals ADD COLUMN IF NOT EXISTS link_ba_survey TEXT;');
    console.log('Column link_ba_survey added successfully');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
run();
