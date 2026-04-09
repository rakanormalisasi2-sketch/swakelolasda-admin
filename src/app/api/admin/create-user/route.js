// API Route: Membuat user baru via Supabase Admin (Service Role Key)
export const dynamic = 'force-dynamic';

import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(req) {
  const { username, password, full_name, role } = await req.json();

  if (!username || !password || !full_name || !role) {
    return Response.json({ success: false, error: 'Semua field wajib diisi.' }, { status: 400 });
  }

  const supabaseAdmin = getAdmin();
  const email = `${username.toLowerCase().trim()}@swakelolasda.com`;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) return Response.json({ success: false, error: error.message }, { status: 400 });

  // Insert profile
  const { error: profErr } = await supabaseAdmin.from('user_profiles').insert({
    id: data.user.id,
    full_name,
    role,
    username: username.toLowerCase().trim(),
    raw_password: password
  });

  if (profErr) return Response.json({ success: false, error: profErr.message }, { status: 400 });

  return Response.json({ success: true, userId: data.user.id });
}
