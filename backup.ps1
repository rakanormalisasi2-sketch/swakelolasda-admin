# ============================================
# OTOMATIS BACKUP SCRIPT
# ============================================
# Jalankan dengan: .\backup.ps1
# ============================================

$env:SUPABASE_ACCESS_TOKEN = "sbp_86869e9c8519f28dac821ca9337423ac470d2e03"

$DATE = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_DIR = ".\backups"
$PROJECT_REF = "ratmptlcrjifuplokask"

# Buat folder backup
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  🗄️  SWAKELOLA DATABASE BACKUP" -ForegroundColor Cyan
Write-Host "  📅 Tanggal: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Backup Database
Write-Host "📄 Mengbackup database..." -ForegroundColor Yellow
$DB_BACKUP_FILE = "$BACKUP_DIR\db_backup_$DATE.sql"

try {
    # Export menggunakan Supabase CLI
    $output = npx supabase db dump --project-id $PROJECT_REF -f $DB_BACKUP_FILE 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dbSize = (Get-Item $DB_BACKUP_FILE).Length / 1MB
        Write-Host "✅ Database berhasil dibackup! Size: $([math]::Round($dbSize, 2)) MB" -ForegroundColor Green
        Write-Host "   File: $DB_BACKUP_FILE" -ForegroundColor Gray
    } else {
        Write-Host "❌ Gagal backup database: $output" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host ""

# 2. Backup Storage (Foto/Dokumen)
Write-Host "📁 Mengbackup storage (foto & dokumen)..." -ForegroundColor Yellow
$STORAGE_DIR = "$BACKUP_DIR\storage_$DATE"
New-Item -ItemType Directory -Path $STORAGE_DIR -Force | Out-Null

try {
    # List storage buckets
    Write-Host "   📦 Mendownload storage..." -ForegroundColor Gray
    
    # Download dari Supabase Storage API
    $headers = @{
        "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdG1wdGxjcmppZnVwbG9rYXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MzA0OTksImV4cCI6MjA5MTEwNjQ5OX0.2hdwAtm3zEkvfjDeQroCJBN1ooGCqBePhk9R6g0zT18"
        "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdG1wdGxjcmppZnVwbG9rYXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MzA0OTksImV4cCI6MjA5MTEwNjQ5OX0.2hdwAtm3zEkvfjDeQroCJBN1ooGCqBePhk9R6g0zT18"
    }
    
    $buckets = Invoke-RestMethod -Uri "https://ratmptlcrjifuplokask.supabase.co/storage/v1/bucket" -Method GET -Headers $headers
    
    foreach ($bucket in $buckets) {
        Write-Host "   📂 Bucket: $($bucket.name)" -ForegroundColor Gray
        
        # List files in bucket
        $files = Invoke-RestMethod -Uri "https://ratmptlcrjifuplokask.supabase.co/storage/v1/object/list/$($bucket.name)" -Method POST -Headers $headers -ContentType "application/json" -Body "{}"
        
        foreach ($file in $files) {
            $filePath = "$STORAGE_DIR\$($bucket.name)\$($file.name)"
            $fileDir = Split-Path $filePath -Parent
            if (-not (Test-Path $fileDir)) {
                New-Item -ItemType Directory -Path $fileDir -Force | Out-Null
            }
            
            # Download file
            $downloadUrl = "https://ratmptlcrjifuplokask.supabase.co/storage/v1/object/public/$($bucket.name)/$($file.name)"
            try {
                Invoke-WebRequest -Uri $downloadUrl -OutFile $filePath -Headers $headers -UseBasicParsing
                Write-Host "   ✅ $($file.name)" -ForegroundColor Green
            } catch {
                Write-Host "   ⚠️  Gagal download: $($file.name)" -ForegroundColor Yellow
            }
        }
    }
    
    Write-Host "✅ Storage berhasil dibackup!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Storage backup gagal atau tidak ada file: $_" -ForegroundColor Yellow
}

Write-Host ""

# 3. Create ZIP Archive
Write-Host "📦 Membuat archive..." -ForegroundColor Yellow
$ZIP_FILE = "$BACKUP_DIR\swakelola_backup_$DATE.zip"

try {
    Compress-Archive -Path "$BACKUP_DIR\db_backup_$DATE.sql" -DestinationPath $ZIP_FILE -Force
    $zipSize = (Get-Item $ZIP_FILE).Length / 1MB
    Write-Host "✅ Archive berhasil! Size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Green
} catch {
    Write-Host "❌ Gagal membuat archive: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ✅ BACKUP SELESAI!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Lokasi backup: $BACKUP_DIR" -ForegroundColor White
Write-Host "📄 Database: $BACKUP_DIR\db_backup_$DATE.sql" -ForegroundColor White
Write-Host "📦 Archive: $ZIP_FILE" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tips: Upload file backup ke Google Drive / cloud storage" -ForegroundColor Gray
Write-Host "   untuk keamanan data yang lebih baik." -ForegroundColor Gray
Write-Host ""
