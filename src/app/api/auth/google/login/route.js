import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role'); // e.g. seksi_normalisasi / seksi_embung

  if (!role) {
    return NextResponse.json({ error: 'Missing role parameter' }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive',
    ],
    prompt: 'consent select_account', // paksa pilih akun & setujui ulang agar refresh_token selalu muncul
    state: role, // simpan role di state agar callback tahu milik seksi mana
  });

  return NextResponse.redirect(authUrl);
}
