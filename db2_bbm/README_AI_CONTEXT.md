# KONTEKS AI: MULTI-DATABASE SUPABASE CLI

Proyek ini menggunakan **2 proyek Supabase secara bersamaan**. 
Mulai sekarang, SETIAP AI (Claude Code, Antigravity, OpenClaude, dsb) harus membaca file ini sebelum menggunakan Supabase CLI.

## 1. Database UTAMA (DB1)
- **URL / Ref ID**: `ratmptlcrjifuplokask`
- **Fungsi**: Auto-login, Auth, Manajemen User, Penugasan Operator, Status Operasional, dsb.
- **Direktori CLI**: Root `/supabase`
- **Akun Login**: Akun email utama
- **Cara Penggunaan**: Jalankan `supabase` command di ROOT direktori. (Sudah ter-link ke project r...).

## 2. Database KEDUA (DB2 - BBM & Fitur Baru)
- **URL / Ref ID**: `rpggkbkmowdbxtgfgbop`
- **Fungsi**: Fitur Manajemen BBM, dan semua fitur baru di masa depan yang butuh storage data masif.
- **Direktori CLI**: `/db2_bbm/supabase`
- **Akun Login**: `raka.pustk@gmail.com`
- **Connection String**: `postgresql://postgres:Rakaganteng@db.rpggkbkmowdbxtgfgbop.supabase.co:5432/postgres`
- **Cara Penggunaan**: 
  1. Anda HARUS mask ke direktori `db2_bbm` (`cd db2_bbm`) sebelum menjalankan Supabase CLI untuk DB2.
  2. Karena perbedaan akun login di environment lokal, Anda PASTI akan kena error jika memaksakan `supabase link` menggunakan shell/CLI yang terlogin ke akun utama. 
  3. **Solusi untuk AI**: Gunakan `pg` (Node.js script eksekusi PostgreSQL direct) menggunakan connection string (`postgresql://postgres:Rakaganteng@...`) untuk push / mengubah / migrasi schema DB2 secara otomatis dari terminal lokal **tanpa butuh akses token CLI Personal**.
