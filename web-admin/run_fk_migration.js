const token = 'sbp_3f4bd5a5b63cdfa5d3b5309e6d9a7c3c9f1fbbd1';
const sql = `
  ALTER TABLE public.operator_logs DROP CONSTRAINT IF EXISTS operator_logs_assignment_id_fkey;
  ALTER TABLE public.operator_logs ADD CONSTRAINT operator_logs_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE SET NULL;
`;
fetch('https://api.supabase.com/v1/projects/ratmptlcrjifuplokask/database/query', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql })
}).then(r => r.text()).then(t => console.log('SQL Response:', t)).catch(e => console.error(e));
