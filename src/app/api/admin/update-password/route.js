export const dynamic = 'force-dynamic';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req) {
  const { userId, password } = await req.json();
  const admin = getAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return Response.json({ success: false, error: error.message }, { status: 400 });

  await admin.from('user_profiles').update({ raw_password: password }).eq('id', userId);

  return Response.json({ success: true });
}
