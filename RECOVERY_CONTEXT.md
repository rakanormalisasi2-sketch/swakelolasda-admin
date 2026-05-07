# RECOVERY CONTEXT: SWAKELOLASDA (Sistem Swakelola Pengelolaan Sumber Daya Air)

**Gunakan prompt "lanjutkan" di awal percakapan untuk me-restore konteks progress ini.**

## 1. Status Proyek Terkini (Last Updated: 9 April 2026)
- **Web Admin (Next.js)**: 
  - Auth Stable (Supabase + Context API).
  - Google Drive Integrasi (OAuth2) Selesai.
  - CRUD Admin (Seksi Normalisasi, Embung, Tim Peralatan) Selesai.
- **Mobile App (Expo)**: 
  - Project Initialized.
  - `.env` configured with Supabase keys.
- **Database (Supabase)**: 
  - Migration 1-8 applied.
  - Support for GDrive tokens and Section Settings.

## 2. Pencapaian di Sesi Terakhir (9 April)
1.  **Stabilitas Auth**: Menghilangkan glitch loading yang sering membuat dashboard macet.
2.  **Sistem Upload Foto Terpusat**: API route `/api/upload/photo` siap digunakan Mobile App untuk sinkronisasi otomatis ke Google Drive seksi masing-masing.
3.  **Workflow Tim Peralatan**: Penambahan akses khusus mekanik untuk mengelola log pemeliharaan alat secara mandiri.

## 3. Langkah Berikutnya (Untuk Sesi "Lanjutkan")
1.  **Mobile Implementation**: Membangun UI Form Laporan Harian di Mobile App.
2.  **Photo Handling**: Implementasi kompresi foto di sisi mobile menggunakan `expo-image-manipulator` sebelum dikirim ke server.
3.  **Location Tracking**: Integrasi koordinat GPS dalam laporan harian mobile.
4.  **Verification**: Uji coba alur dari Mobile -> Web API -> Google Drive.

## 4. Konfigurasi Sistem Penting
- **Web Admin env (`.env.local`)**:
  - `NEXT_PUBLIC_SUPABASE_URL`: `https://ratmptlcrjifuplokask.supabase.co`
  - `GOOGLE_CLIENT_ID`: `587229169069-0sh864vluv8frf41lobj2l47jrodu918.apps.googleusercontent.com`
  - `GOOGLE_CLIENT_SECRET`: `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` *(baru, di-generate 9 April 2026)*
- **Mobile env (`.env`)**:
  - `EXPO_PUBLIC_SUPABASE_URL`: `https://ratmptlcrjifuplokask.supabase.co`
- **File Referensi Kunci**:
  - API Upload: `web-admin/src/app/api/upload/photo/route.js`
  - OAuth Login: `web-admin/src/app/api/auth/google/login/route.js`
  - Mobile Root: `mobile-app/`

> [!CAUTION]
> Refresh Token Google Drive disimpan di database. Saat berpindah akun, pastikan `GOOGLE_CLIENT_ID` dan `SECRET` tetap konsisten agar token yang sudah ada tidak invalid.
