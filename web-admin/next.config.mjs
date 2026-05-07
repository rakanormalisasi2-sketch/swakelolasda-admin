/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hardcode NEXT_PUBLIC vars as fallback so Vercel build always works.
  // .env.local is gitignored, so these values must be embedded here for
  // production deployments. ANON key is intentionally public (RLS protects data).
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://ratmptlcrjifuplokask.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdG1wdGxjcmppZnVwbG9rYXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MzA0OTksImV4cCI6MjA5MTEwNjQ5OX0.2hdwAtm3zEkvfjDeQroCJBN1ooGCqBePhk9R6g0zT18',
    NEXT_PUBLIC_APP_URL: 'https://swakelolasda.vercel.app',
  },
};

export default nextConfig;

