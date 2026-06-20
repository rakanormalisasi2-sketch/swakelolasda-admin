import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request) {

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // role seksi, dikirim dari /login
  const error = searchParams.get('error');

  // Derive baseUrl from the actual request URL — this is the ONLY way to guarantee
  // the redirect_uri will exactly match what was sent in the login step.
  // Using process.env.NEXT_PUBLIC_APP_URL is unreliable on Vercel runtime for server routes.
  const requestUrl = new URL(request.url);
  const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

  // Tentukan halaman redirect berdasarkan role yang dikirim di state
  // Tim Peralatan punya path dashboard berbeda dari Seksi
  const getRedirectBase = (role) => {
    if (role === 'tim_peralatan') {
      return `${baseUrl}/dashboard/peralatan/pengaturan`;
    }
    return `${baseUrl}/dashboard/seksi/pengaturan`;
  };

  const redirectBase = getRedirectBase(state);

  if (error) {
    // Saat error, state mungkin belum ada — gunakan fallback seksi
    const safeRedirect = state ? getRedirectBase(state) : `${baseUrl}/dashboard/seksi/pengaturan`;
    return NextResponse.redirect(`${safeRedirect}?gdrive_status=cancelled`);
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
    // Expose the actual Google error code so it's easier to diagnose
    const googleErrCode = err?.response?.data?.error || err?.code || err?.message || 'exchange_failed';
    console.error('OAuth exchange error:', googleErrCode, err.message);
    return NextResponse.redirect(`${redirectBase}?gdrive_status=error&msg=${encodeURIComponent(googleErrCode)}`);
  }
}
