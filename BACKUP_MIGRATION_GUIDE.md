# ============================================
# BACKUP & MIGRATION GUIDE
# ============================================
# Untuk Swakelola SDA - Supabase Database
# ============================================

## ⚠️ SEGERA BACKUP SEBELUM STORAGE PENUH!

---

## 📋 METODE 1: Manual via Supabase Dashboard (Paling Mudah)

### Langkah:
1. Buka https://supabase.com/dashboard/project/ratmptlcrjifuplokask
2. Menu **SQL Editor**
3. Run query ini untuk export data:

```sql
-- Export semua tabel ke CSV (jalankan satu per satu)
COPY user_profiles TO '/tmp/user_profiles.csv' WITH (FORMAT CSV, HEADER);
COPY alat_berat TO '/tmp/alat_berat.csv' WITH (FORMAT CSV, HEADER);
COPY assignments TO '/tmp/assignments.csv' WITH (FORMAT CSV, HEADER);
COPY absensi TO '/tmp/absensi.csv' WITH (FORMAT CSV, HEADER);
COPY progress_laporan TO '/tmp/progress_laporan.csv' WITH (FORMAT CSV, HEADER);
COPY user_work_logs TO '/tmp/user_work_logs.csv' WITH (FORMAT CSV, HEADER);
```

4. Download dari **File Manager** (jika tersedia) atau via SQL Editor

---

## 📋 METODE 2: Install PostgreSQL Lokal

### Download:
https://www.postgresql.org/download/windows/

### Install:
1. Download PostgreSQL 16 Windows x86-64
2. Install dengan default options
3. **Ingat password** yang di-set!

### Setup PATH:
```
C:\Program Files\PostgreSQL\16\bin
```

### Backup Database:
```powershell
# Set password
$env:PGPASSWORD = "YOUR_PASSWORD"

# Backup
pg_dump -h db.ratmptlcrjifuplokask.supabase.co -U postgres -d postgres -p 5432 -f "backup.sql"
```

---

## 📋 METODE 3: Neon PostgreSQL (Recommended - 3GB Free)

### Kelebihan:
- ✅ 3GB Storage (vs 500MB Supabase Free)
- ✅ Easy fork dari Supabase
- ✅ Global CDN
- ✅ Branching (like Git)
- ✅ Point-in-time restore

### Langkah:

#### 1. Daftar Neon:
```
https://neon.tech
```

#### 2. Fork dari Supabase (Recommended):
Di Neon Dashboard → **Create Project** → **Fork from Supabase**

#### 3. Atau Export Manual:
```powershell
# Export dari Supabase
pg_dump -h db.ratmptlcrjifuplokask.supabase.co \
        -U postgres \
        -d postgres \
        -f "swakelola_backup.sql"

# Import ke Neon
psql "postgresql://user:password@ep-xxx-xxx-123456.singapore.aws.neon.tech/neondb?sslmode=require" < swakelola_backup.sql
```

---

## 📋 METODE 4: Railway PostgreSQL (500MB Free)

### Daftar:
```
https://railway.app
```

### Kelebihan:
- ✅ 500MB Storage
- ✅ Easy setup
- ✅ Free tier cukup untuk development

### Langkah:
1. Create New Project → PostgreSQL
2. Get connection string
3. Fork/import data dari Supabase

---

## 📋 METODE 5: Local Docker PostgreSQL (Unlimited!)

### Install Docker:
https://docs.docker.com/desktop/install/windows-install/

### Jalankan:
```powershell
docker run -d `
  --name swakelola-postgres `
  -e POSTGRES_PASSWORD=swakelola123 `
  -e POSTGRES_DB=swakelola `
  -p 5432:5432 `
  -v swakelola_data:/var/lib/postgresql/data `
  postgres:15
```

### Backup/Restore:
```powershell
# Backup dari Supabase
pg_dump -h db.ratmptlcrjifuplokask.supabase.co -U postgres -d postgres > backup.sql

# Restore ke local
psql -h localhost -U postgres -d swakelola < backup.sql
```

---

## 🚀 STRATEGI RECOMMENDED:

### Phase 1: Backup Sekarang
```powershell
# Jalankan script backup
.\backup.ps1
```

### Phase 2: Setup Neon (Backup)
1. Daftar di https://neon.tech
2. Create project, pilih region **Singapore**
3. Set sebagai **secondary/failover**

### Phase 3: Automate Backup
Buat cron job mingguan:
```bash
# Setiap minggu Sunday 2 AM
0 2 * * 0 pg_dump -h db.ratmptlcrjifuplokask.supabase.co -U postgres -d postgres > /backup/swakelola_$(date +\%Y\%m\%d).sql
```

---

## 📊 PERBANDINGAN:

| Provider | Free Storage | PostgreSQL | notes |
|----------|-------------|-----------|-------|
| Supabase | 500MB | ✅ | Batas cepat penuh |
| **Neon** | **3GB** | ✅ | **Recommended!** |
| Railway | 500MB | ✅ | Easy setup |
| Render | 250MB | ✅ | Wait time lama |
| local Docker | Unlimited | ✅ | Butuh Docker |
| local PC | Unlimited | ✅ | Butuh pg_dump |

---

## ⚡ QUICK START - NEON (Recommended):

1. Buka https://neon.tech
2. Sign in dengan GitHub
3. Klik **Create Project**
4. Nama: `swakelola-backup`
5. Region: Singapore
6. Klik **Create**

7. Copy connection string:
```
postgresql://user:password@ep-xxx-xxx-xxx.singapore.aws.neon.tech/neondb?sslmode=require
```

8. Update environment variables:
```
DATABASE_URL=postgresql://user:password@ep-xxx-xxx-xxx.singapore.aws.neon.tech/neondb
```

---

## 📞 BUTUH BANTUAN?

Jika stuck, saya bisa bantu:
1. Setup Neon step-by-step
2. Buat script restore/backup
3. Configure connection string
4. Test connectivity
