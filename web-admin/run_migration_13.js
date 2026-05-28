const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const SUPABASE_URL = 'https://ratmptlcrjifuplokask.supabase.co';
const SERVICE_KEY = 'sb_secret_f-edKVAdh1oC22Bo_Q9jNw_WsbXT8YL';

async function runMigration() {
  console.log('=== Migration 13: Sistem Perencanaan Proposal v4 ===\n');
  
  const sqlFile = path.join(__dirname, 'migration_13_proposal_planning.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  
  console.log('Attempting direct Postgres connection...');
  try {
    const connectionStrings = [
      `postgresql://postgres.ratmptlcrjifuplokask:${SERVICE_KEY}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
      `postgresql://postgres.ratmptlcrjifuplokask:${SERVICE_KEY}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
      `postgresql://postgres:${SERVICE_KEY}@db.ratmptlcrjifuplokask.supabase.co:5432/postgres`,
    ];
    
    let connected = false;
    for (const connStr of connectionStrings) {
      try {
        console.log(`Trying: ${connStr.substring(0, 40)}...`);
        const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
        await client.connect();
        console.log('✅ Connected!');
        
        console.log(`Executing SQL from migration_13_proposal_planning.sql...`);
        await client.query(sql);
        console.log('✅ Migration 13 Executed Successfully!');
        
        await client.end();
        connected = true;
        break;
      } catch (err) {
        console.log(`  ❌ Failed: ${err.message.substring(0, 80)}`);
      }
    }
    
    if (!connected) {
      console.log('\n❌ Could not connect directly to Postgres.');
      console.log('Please run the following SQL manually in Supabase SQL Editor:');
      console.log('URL: https://supabase.com/dashboard/project/ratmptlcrjifuplokask/sql/new\n');
    }
  } catch (err) {
    console.log('Error:', err.message);
  }
}

runMigration().catch(err => console.error('Fatal:', err));
