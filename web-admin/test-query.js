const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ratmptlcrjifuplokask.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // or ANON_KEY

if (!supabaseKey) {
  console.error("No service role key provided in env, please set SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('work_schedules')
    .select(`
      id,
      assignment:assignments (
        id, 
        operator_logs(tanggal)
      )
    `)
    .limit(5);

  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

test();
