#!/bin/bash
# Script deploy ke Vercel dengan environment variables

echo "Menambahkan environment variables..."

# Add NEXT_PUBLIC_SUPABASE_URL
echo "https://ratmptlcrjifuplokask.supabase.co" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production

# Add NEXT_PUBLIC_SUPABASE_ANON_KEY
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdG1wdGxjcmppZnVwbG9rYXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MzA0OTksImV4cCI6MjA5MTEwNjQ5OX0.2hdwAtm3zEkvfjDeQroCJBN1ooGCqBePhk9R6g0zT18" | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

# Add SUPABASE_SERVICE_ROLE_KEY
echo "sb_secret_f-edKVAdh1oC22Bo_Q9jNw_WsbXT8YL" | npx vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Add GOOGLE_CLIENT_ID
echo "587229169069-0sh864vluv8frf41lobj2l47jrodu918.apps.googleusercontent.com" | npx vercel env add GOOGLE_CLIENT_ID production

# Add GOOGLE_CLIENT_SECRET
echo "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" | npx vercel env add GOOGLE_CLIENT_SECRET production

# Add NEXT_PUBLIC_APP_URL
echo "https://swakelolasda.vercel.app" | npx vercel env add NEXT_PUBLIC_APP_URL production

echo "Environment variables ditambahkan. Deploying..."

# Deploy to production
npx vercel --prod
