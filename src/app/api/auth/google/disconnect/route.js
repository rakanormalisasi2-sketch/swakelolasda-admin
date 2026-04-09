import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
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
