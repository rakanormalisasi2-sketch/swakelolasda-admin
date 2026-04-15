# ============================================
# DEPLOY KE VERCEL
# ============================================
# Jalankan di terminal PowerShell/CMD
# ============================================

# 1. Pastikan sudah login ke Vercel
#    npx vercel login

# 2. Deploy ke Vercel (Preview)
npx vercel

# 3. Setelah deploy berhasil, set environment variables:
#    npx vercel env add NEXT_PUBLIC_SUPABASE_URL
#    npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
#    npx vercel env add SUPABASE_SERVICE_ROLE_KEY
#    npx vercel env add GOOGLE_CLIENT_ID
#    npx vercel env add GOOGLE_CLIENT_SECRET
#    npx vercel env add NEXT_PUBLIC_APP_URL

# 4. Deploy ulang untuk apply environment variables:
#    npx vercel --prod

# ============================================
# ALTERNATIF: Deploy via GitHub
# ============================================
# 1. Push kode ke GitHub repository
# 2. Buka https://vercel.com/new
# 3. Import repository dari GitHub
# 4. Tambahkan environment variables di Vercel Dashboard
# 5. Deploy!

# ============================================
# ENVIRONMENT VARIABLES YANG DIBUTUHKAN
# ============================================
# NEXT_PUBLIC_SUPABASE_URL = https://ratmptlcrjifuplokask.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# SUPABASE_SERVICE_ROLE_KEY = sb_secret_f-...
# GOOGLE_CLIENT_ID = 587229169069-...apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET = GOCSPX-...
# NEXT_PUBLIC_APP_URL = https://swakelolasda.vercel.app
