# Script untuk push ke GitHub dan deploy ke Vercel

Write-Host "Menambahkan perubahan ke Git..." -ForegroundColor Cyan
git add .

Write-Host "Menyimpan perubahan (commit)..." -ForegroundColor Cyan
git commit -m "fix: active assignments not showing for normalisasi and embung due to wrong sort column"

Write-Host "Push ke GitHub..." -ForegroundColor Cyan
git push origin main

Write-Host "Deploy ke Vercel (Production)..." -ForegroundColor Cyan
vercel --prod

Write-Host "Selesai!" -ForegroundColor Green
