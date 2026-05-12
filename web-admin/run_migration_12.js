// Run migration 12 against DB1 using Supabase's SQL execution via fetch
// This uses the service role key as the database password via the pooler connection
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ratmptlcrjifuplokask.supabase.co';
const SERVICE_KEY = 'sb_secret_f-edKVAdh1oC22Bo_Q9jNw_WsbXT8YL';

async function runMigration() {
  console.log('=== Migration 12: Manual Entry Support ===\n');
  
  // Try the /sql endpoint (available on newer Supabase versions)
  const sqlStatements = [
    "ALTER TABLE public.operator_logs ADD COLUMN IF NOT EXISTS is_manual boolean DEFAULT false",
    "ALTER TABLE public.operator_logs ADD COLUMN IF NOT EXISTS created_by_role text",
    "ALTER TABLE public.operator_logs ALTER COLUMN assignment_id DROP NOT NULL"
  ];
  
  for (const sql of sqlStatements) {
    console.log(`Executing: ${sql.substring(0, 70)}...`);
    
    // Try via Supabase's pg_net or direct SQL endpoint
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    });

    if (resp.ok) {
      console.log('  ✅ Success');
    } else {
      const text = await resp.text();
      if (resp.status === 404) {
        // exec_sql function doesn't exist — this is expected
        console.log('  ⚠️ RPC exec_sql not available (expected)');
        break;
      }
      console.log(`  ❌ Failed (${resp.status}): ${text}`);
    }
  }
  
  // Alternative: Create the function first, then use it
  // Since we can't create SQL functions via REST without existing function...
  // Let's try another approach: use pg module directly
  
  console.log('\nAttempting direct Postgres connection...');
  try {
    const { Client } = require('pg');
    
    // Try different connection strings for Supabase
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
        
        for (const sql of sqlStatements) {
          console.log(`  Executing: ${sql.substring(0, 60)}...`);
          await client.query(sql);
          console.log('  ✅ Done');
        }
        
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
      sqlStatements.forEach(s => console.log(s + ';'));
    }
  } catch (err) {
    console.log('pg module error:', err.message);
    console.log('\nPlease run SQL manually in Supabase SQL Editor.');
  }
  
  // Final verification
  console.log('\n--- Verification ---');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  const { data, error } = await supabase
    .from('operator_logs')
    .select('id, is_manual, created_by_role')
    .limit(1);
  
  if (error) {
    console.log('❌ Columns not found:', error.message);
  } else {
    console.log('✅ Columns verified!');
    
    // Test nullable
    const { data: testRow, error: testErr } = await supabase
      .from('operator_logs')
      .insert({
        tanggal: '2026-01-01',
        is_manual: true,
        created_by_role: 'migration_test',
        override_operator: 'MIGRATION_TEST_DELETE',
        reported_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (testErr) {
      console.log('❌ Nullable test failed:', testErr.message);
    } else {
      console.log('✅ Nullable assignment_id works!');
      await supabase.from('operator_logs').delete().eq('id', testRow.id);
      console.log('✅ Cleaned up test row.');
    }
  }
  
  console.log('\n🎉 Done!');
}

runMigration().catch(err => console.error('Fatal:', err));
