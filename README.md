# Swakelola SDA Admin — Project Overview

Sistem manajemen administrasi Swakelola Sumber Daya Air (SDA) yang terdiri dari dua platform:

## 📁 Struktur Project

```
├── web-admin/       → Website Admin Dashboard (Next.js + Supabase)
└── mobile-app/      → Aplikasi Mobile Petugas Lapangan (Expo / React Native)
```

---

## 🌐 Web Admin (`web-admin/`)

**Tech Stack:** Next.js 16, React 19, Supabase, Leaflet Maps, Vercel

Dashboard admin untuk mengelola:
- Laporan harian & dokumentasi lapangan
- Manajemen peralatan & alat berat
- Sistem BBM (pengadaan & pemakaian)
- Checklist normalisasi sungai
- Proposal & survey
- Perhitungan RAP (Rencana Anggaran Pelaksanaan)
- Sistem gudang/warehouse
- Peta sebaran peralatan
- Manajemen pengguna & penugasan

### Menjalankan Lokal
```bash
cd web-admin
npm install
cp env.example .env.local   # Isi credential Supabase
npm run dev
```

---

## 📱 Mobile App (`mobile-app/`)

**Tech Stack:** Expo SDK 54, React Native, Expo Router, Supabase

Aplikasi mobile untuk petugas lapangan:
- Laporan harian operator alat berat
- Dokumentasi foto lapangan
- Formulir checklist normalisasi
- Laporan kerusakan peralatan
- Scan dokumen
- Tanda tangan digital

### Menjalankan Lokal
```bash
cd mobile-app
npm install
npx expo start
```

### Build APK
```bash
eas build --platform android --profile preview
```

---

## 🗄️ Database

- **Backend:** Supabase (PostgreSQL)
- **Migrasi:** File `migration_*.sql` di `web-admin/` dan `web-admin/supabase/migrations/`
- **Inisialisasi:** `web-admin/supabase_init.sql`

---

## 🚀 Deployment

| Platform | Service | Branch |
|----------|---------|--------|
| Web Admin | Vercel | `master` |
| Mobile App | EAS Build | `master` |
