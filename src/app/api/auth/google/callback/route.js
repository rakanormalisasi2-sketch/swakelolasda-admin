import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // role seksi, dikirim dari /login
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectBase = `${baseUrl}/dashboard/seksi/pengaturan`;

  if (error) {
    return NextResponse.redirect(`${redirectBase}?gdrive_status=cancelled`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}?gdrive_status=error&msg=missing_params`);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl}/api/auth/google/callback`
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      // Ini terjadi jika user sudah pernah authorize tapi tidak memilih "consent" ulang
      // Seharusnya tidak terjadi karena kita set prompt: 'consent', tapi jaga-jaga
      return NextResponse.redirect(`${redirectBase}?gdrive_status=error&msg=no_refresh_token`);
    }

    // Simpan refresh_token ke database berdasarkan role seksi
    const { error: dbError } = await supabaseAdmin
      .from('section_settings')
      .upsert(
        {
          role: state,
          google_refresh_token: tokens.refresh_token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'role' }
      );

    if (dbError) {
      console.error('DB Error saving token:', dbError.message);
      return NextResponse.redirect(`${redirectBase}?gdrive_status=error&msg=db_error`);
    }

    return NextResponse.redirect(`${redirectBase}?gdrive_status=success`);
  } catch (err) {
    console.error('OAuth exchange error:', err.message);
    return NextResponse.redirect(`${redirectBase}?gdrive_status=error&msg=exchange_failed`);
  }
}
