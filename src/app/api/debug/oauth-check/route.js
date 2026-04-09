import { NextResponse } from 'next/server';

// ENDPOINT DIAGNOSTIK SEMENTARA — hapus setelah OAuth berhasil
// Mengecek apakah env vars Google terseting dengan benar di Vercel
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

  // Mask values untuk keamanan — hanya tampilkan awal dan akhir
  const maskStr = (s) => {
    if (!s) return '[TIDAK ADA / KOSONG]';
    if (s.length <= 8) return '***';
    return `${s.slice(0, 6)}...${s.slice(-4)} (panjang: ${s.length} karakter)`;
  };

  return NextResponse.json({
    status: 'diagnostic',
    GOOGLE_CLIENT_ID: maskStr(clientId),
    GOOGLE_CLIENT_SECRET: maskStr(clientSecret),
    // Verifikasi quick: client ID Google selalu diawali dengan angka dan diakhiri .apps.googleusercontent.com
    client_id_valid_format: clientId.endsWith('.apps.googleusercontent.com'),
    // Client secret Google selalu diawali GOCSPX-
    client_secret_valid_format: clientSecret.startsWith('GOCSPX-'),
    // URL yang digunakan saat ini
    note: 'Hapus endpoint ini setelah OAuth berfungsi',
  });
}
