import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin environment variables are missing.');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin();

  const { role } = await request.json();

  if (!role) {
    return NextResponse.json({ error: 'Missing role' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('section_settings')
    .update({
      google_refresh_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq('role', role);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
