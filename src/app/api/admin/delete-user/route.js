export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(req) {
  const { userId } = await req.json();
  const admin = getAdmin();
  await admin.from('user_profiles').delete().eq('id', userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return Response.json({ success: false, error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
