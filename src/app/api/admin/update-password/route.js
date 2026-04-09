export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(req) {
  const { userId, password } = await req.json();
  const admin = getAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return Response.json({ success: false, error: error.message }, { status: 400 });

  await admin.from('user_profiles').update({ raw_password: password }).eq('id', userId);

  return Response.json({ success: true });
}
