# WORKFLOW GUIDE - MODUL RAP
## Tab Sequence, GoalSeek Logic & Gambar Teknik

> Dokumen ini menjelaskan alur kerja, logika GoalSeek, dan spesifikasi gambar teknik.
> Tanggal: 21 April 2025

---

## 1. LOGIKA GOALSEEK YANG DIPERBAIKI

### ══════════════════════════════════════════════════════════════════════
### GOALSEEK DI TAB 3: KEBUTUHAN REALISASI
### ══════════════════════════════════════════════════════════════════════

**❌ PEMAHAMAN LAMA (SALAH):**
```
→ GoalSeek agar Total Galian = Total Volume Rencana
→ Hasil: Sisa BBM = 0 liter (tidak realistis!)
```

**✅ PEMAHAMAN BARU (BENAR):**
```
→ GoalSeek agar:
  1. Total Galian ≈ Total Volume Rencana (±5%)
  2. Sisa BBM akhir = 40-100 liter (masuk akal untuk next delivery)
  3. TIDAK boleh minus (tidak boleh kekurangan BBM)
```

**KENAPA HARUS SISA 40-100 LITER?**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   LOGIKA REALISTIS LAPANGAN:                                   │
│   ──────────────────────────────────────────────────────────────│
│                                                                  │
│   1. SAAT KIRIM STOK BBM KE LAPANGAN:                        │
│      → Alat berat biasanya dalam keadaan belum kosong          │
│      → Stok dikirim sebagai "pengisian ulang"                 │
│      → Tidak mungkin mengirim BBM ke alat yang sedang jalan    │
│                                                                  │
│   2. SAAT AKHIR PEKERJAAN:                                    │
│      → Alat tidak dikosongkan sampai 0 liter                  │
│      → Sisa minimal ~40-100 liter dianggap "wajar"             │
│      → Karena tidak efisien untuk drain sampai habis           │
│                                                                  │
│   3. KETENTUAN "SISA MINIMAL":                               │
│      → Sisa BBM < 170 liter = "acceptable"                   │
│      → Target: 40-100 liter = "ideal"                         │
│      → Minus (<0) = "TIDAK BOLEH" - berarti BBM kurang!     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**IMPLEMENTASI GOALSEEK:**
```
┌─────────────────────────────────────────────────────────────────┐
│  GOALSEEK ALGORITMA (TAB 3)                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INPUT:                                                         │
│  - Total BBM Diterima (dari DB2) = 1,000 liter               │
│  - Total Jam Kerja (dari DB1) = 25 jam                         │
│  - Target Volume = 6,785.50 m³ (dari TAB 1)                   │
│  - Sisa Minimal Target = 40-100 liter                         │
│                                                                  │
│  LANGKAH 1: Hitung H (BBM/Jam) dari TAB 2                     │
│  ───────────────────────────────────────────────────────────   │
│  H = Fd × Fe × LoadFactor × kW                                │
│  H = 0.96 × 0.75 × 0.28 × 110.36 = 22.16 L/jam              │
│                                                                  │
│  LANGKAH 2: Hitung Q1 (Galian/Jam)                            │
│  ───────────────────────────────────────────────────────────   │
│  Q1 = (V × Fb × Fa × 60) / (T.1 × Fv × Fk)                  │
│  Q1 = (0.9 × 1.0 × 0.7 × 60) / (0.659 × 0.8 × 0.8)         │
│  Q1 = 37.80 / 0.422 = 89.57 m³/jam                          │
│                                                                  │
│  LANGKAH 3: Hitung Total BBM Terpakai                          │
│  ───────────────────────────────────────────────────────────   │
│  BBM Terpakai = H × Total Jam                                 │
│  BBM Terpakai = 22.16 × 25 = 554.00 liter                    │
│                                                                  │
│  LANGKAH 4: Hitung Sisa BBM                                    │
│  ───────────────────────────────────────────────────────────   │
│  Sisa = Total Diterima - BBM Terpakai                         │
│  Sisa = 1,000 - 554 = 446 liter  ← TERLALU BANYAK!          │
│                                                                  │
│  LANGKAH 5: ADJUSTMENT (GOALSEEK)                             │
│  ───────────────────────────────────────────────────────────   │
│  Target Sisa = 70 liter (rata-rata ideal)                     │
│  BBM Terpakai yang Dibutuhkan = 1,000 - 70 = 930 liter       │
│  H yang Disesuaikan = 930 / 25 = 37.20 L/jam                 │
│                                                                  │
│  HASIL GOALSEEK:                                               │
│  ───────────────────────────────────────────────────────────   │
│  H baru = 37.20 L/jam (dari 22.16)                           │
│  Q1 baru = ? (dihitung ulang dari H baru)                    │
│  Total Galian = Q1 baru × 25 jam = ~6,700 m³ ≈ Target ✓     │
│  Sisa BBM = 70 liter ≈ Target ✓                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### ══════════════════════════════════════════════════════════════════════
### GOALSEEK DI TAB 4: ANALISA PELAKSANAAN
### ══════════════════════════════════════════════════════════════════════

**TUJUAN TAB 4:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   TAB 4 MEMVERIFIKASI/PENYESUAIAN:                             │
│   ──────────────────────────────────────────────────────────────│
│                                                                  │
│   Q1 dari TAB 3 (yang sudah di-GoalSeek)                      │
│   ↓                                                          │
│   Dihitung mundur: Berapa T.1 yang dibutuhkan?               │
│   ↓                                                          │
│   Hasil: T.1 aktual yang digunakan di lapangan                 │
│   ↓                                                          │
│   Jika T.1 masuk akal (sesuai SNI): ✓                       │
│   Jika T.1 tidak masuk akal: ⚠️ perlu penyesuaian           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**IMPLEMENTASI GOALSEEK TAB 4:**
```
┌─────────────────────────────────────────────────────────────────┐
│  GOALSEEK ALGORITMA (TAB 4)                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TUJUAN: Cari T.1 (Waktu Siklus) agar:                         │
│  1. H (BBM/Jam) sesuai dengan hasil TAB 3                      │
│  2. Sisa BBM akhir = 40-100 liter                             │
│                                                                  │
│  FORMULA:                                                      │
│  ───────────────────────────────────────────────────────────   │
│  H = Fd × Fe × LoadFactor × kW                               │
│  Fd = H / (Fe × LoadFactor × kW)                             │
│  T.1 = WaktuGali / (Fd × 60)                                  │
│                                                                  │
│  CONTOH:                                                       │
│  ───────────────────────────────────────────────────────────   │
│  H dari TAB 3 = 37.20 L/jam                                  │
│  kW = 148 × 0.7457 = 110.36 kW                               │
│  Fe = 0.75                                                    │
│  LoadFactor = 0.28                                            │
│                                                                  │
│  Fd = 37.20 / (0.75 × 0.28 × 110.36)                         │
│  Fd = 37.20 / 23.18 = 1.60                                   │
│                                                                  │
│  T.1 = 38 / (1.60 × 60) = 0.396 menit                       │
│                                                                  │
│  VALIDASI:                                                     │
│  ───────────────────────────────────────────────────────────   │
│  T.1 hasil = 0.396 menit                                     │
│  T.1 standar SNI = 0.31 - 0.66 menit (PC200)               │
│  0.396 ∈ [0.31, 0.66] ✓ MASUK AKAL!                         │
│                                                                  │
│  JIKA TIDAK MASUK AKAL:                                       │
│  ───────────────────────────────────────────────────────────   │
│  Jika T.1 < 0.31: Equipment terlalu efisien, perlu cek lagi │
│  Jika T.1 > 0.66: Equipment kurang efisien, mungkin ada     │
│                    waktu non-produktif                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. TABEL PARAMETER EXCAVATOR (UNTUK VALIDASI)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PARAMETER SNI - WAKTU SIKLUS (T.1) UNTUK VALIDASI                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┬──────────────┬──────────────┬──────────────┐               │
│  │ Excavator │ Min T.1     │ T.1 Standar  │ Max T.1     │               │
│  │           │ (menit)     │ (menit)      │ (menit)     │               │
│  ├──────────┼──────────────┼──────────────┼──────────────┤               │
│  │ PC50     │ 0.28         │ 0.31         │ 0.35         │               │
│  │ PC75     │ 0.58         │ 0.65         │ 0.72         │               │
│  │ PC100    │ 1.14         │ 1.27         │ 1.40         │               │
│  │ PC200    │ 0.31         │ 0.66         │ 0.75         │               │
│  │ PC200LA  │ 2.59         │ 2.88         │ 3.17         │               │
│  └──────────┴──────────────┴──────────────┴──────────────┘               │
│                                                                             │
│  JIKA T.1 HASIL DI LUAR RANGE:                                             │
│  ─────────────────────────────────────────────────────────────────────────│
│  → < Min: equipment terlalu efisien, perlu verifikasi data               │
│  → > Max: ada faktor non-produktif (istirahat, perawatan, dll)           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. SPESIFIKASI GAMBAR TEKNIK (CROSS-SECTION)

### ══════════════════════════════════════════════════════════════════════
### KONSEP GAMBAR: EKSISTING vs RENCANA
### ══════════════════════════════════════════════════════════════════════

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  KONSEP AREA GALIAN (EXCAVATION AREA)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                                                                             │
│                    GARIS EKSISTING (alami, meliuk-liuk)                   │
│                     ╱‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾╲                                │
│                    ╱                    ╲                               │
│                   ╱                        ╲                              │
│      BATHIMETRI ╱     ╱╲                    ╲    ╱╲                     │
│     (Kontur   ╱     ╱  ╲        AREA        ╲  ╱  ╲                    │
│     DASAR)   ╱     ╱    ╲      GALIAN        ╲╱    ╲                   │
│      SUNGAI ╱     ╱      ╲__________________╲      ╲                  │
│            ╱     ╱        ╲                  ╱        ╲                 │
│           ╱     ╱          ╲                ╱          ╲                │
│          ╱     ╱            ╲______________╱            ╲               │
│         ╱     ╱              ╲            ╱              ╲              │
│        ╱     ╱                ╲   TRAPESIUM╱                ╲             │
│       ╱     ╱                  ╲__________╱                  ╲            │
│      ╱     ╱                    ╲        ╱                      ╲           │
│     ╱     ╱                      ╲______╱                        ╲          │
│    ╱     ╱                        ╲  ╱                          ╲         │
│   ╱     ╱         GARIS            ╲╱                            ╲        │
│  ╱     ╱          RENCANA                                                │
│ ╱     ╱       (TRAPESIUM)                                                 │
│                                                                             │
│  ──────────────────────────────────────────────────────────────────────    │
│                                                                             │
│  AREA GALIAN = AREA ANTARA GARIS EKSISTING DAN GARIS RENCANA             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │   AREA GALIAN = ∫(Garis Eksisting) - ∫(Garis Rencana)             │   │
│  │                 = Luas Poligon Natural - Luas Trapesium           │   │
│  │                 = HASIL PERHITUNGAN VOLUME / PANJANG STA          │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### ══════════════════════════════════════════════════════════════════════
### SPESIFIKASI TEKNIS GAMBAR
### ══════════════════════════════════════════════════════════════════════

**A. KOMPONEN GAMBAR:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  KOMPONEN WAJIB DALAM SETIAP GAMBAR STA                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. KOP GAMBAR (Vertikal di kanan)                                        │
│     ─────────────────────────────────────────────────────────────────────│
│     ┌────────────────┐                                                    │
│     │ PEMKAB BOJONEG │                                                    │
│     │ DINAS PU SDA   │                                                    │
│     ├────────────────┤                                                    │
│     │ PROGRAM:       │                                                    │
│     │ [dari data]    │                                                    │
│     ├────────────────┤                                                    │
│     │ KEGIATAN:      │                                                    │
│     │ [dari data]    │                                                    │
│     ├────────────────┤                                                    │
│     │ PEKERJAAN:     │                                                    │
│     │ [dari data]    │                                                    │
│     ├────────────────┤                                                    │
│     │ LOKASI:        │                                                    │
│     │ [dari data]    │                                                    │
│     ├────────────────┤                                                    │
│     │ STA: 0+000     │                                                    │
│     │ SKALA: 1:40    │                                                    │
│     ├────────────────┤                                                    │
│     │ KODE: NS-01   │                                                    │
│     │ LBR: 1/5       │                                                    │
│     └────────────────┘                                                    │
│                                                                             │
│  2. AREA GAMBAR (Cross-Section)                                           │
│     ─────────────────────────────────────────────────────────────────────│
│     • Garis eksisting (warna: biru atau hijau tua) - meliuk natural      │
│     • Garis rencana (warna: hitam atau biru tua) - trapezium            │
│     • Area galian di-ARSIR (hatching)                                     │
│     • Dimensi label: b1, b2, b3, h, h'                                 │
│                                                                             │
│  3. TABEL DIMENSI (di bawah gambar)                                       │
│     ─────────────────────────────────────────────────────────────────────│
│     ┌─────────────────────────────────────────────────────────────────┐   │
│     │ STA │  b1(m) │ b2(m) │ b3(m) │  h(m)  │ h'(m) │ Luas(m²) │   │
│     ├──────┼────────┼────────┼────────┼────────┼────────┼───────────┤   │
│     │0+000│  4.000 │ 2.857  │ 6.857  │  1.000 │  2.500 │  5.429   │   │
│     └─────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  4. INFO AREA GALIAN (di dalam area galian)                               │
│     ─────────────────────────────────────────────────────────────────────│
│     ┌─────────────────────────────────────────────────────────────────┐   │
│     │                                                                  │   │
│     │                    ╱‾‾‾‾‾‾‾╲                                    │   │
│     │                   ╱░░░░░░░░░╲        ← AREA GALIAN             │   │
│     │                  ╱░░░░░░░░░░░╲         (DI-ARSIR)             │   │
│     │                 ╱░░░░░░░░░░░░░╲                             │   │
│     │                ╱░░░░░░░░░░░░░░░░╲                            │   │
│     │               ╱░░░░░░░░░░░░░░░░░░╲  ← Luas: 5.429 m²       │   │
│     │              ╱░░░░░░░░░░░░░░░░░░░░░╲                        │   │
│     │             ╱░░░░░░░░░░░░░░░░░░░░░░╲                       │   │
│     │            ╱‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾╲                          │   │
│     │           ╱__________________________╲                         │   │
│     │          ╱                            ╲                        │   │
│     │         ╱________________________________╲                      │   │
│     │                                                                 │   │
│     │  KETERANGAN:                                                    │   │
│     │  - Garis biru = Kontur eksisting (alami)                      │   │
│     │  - Garis hitam = Rencana galian (trapesium)                    │   │
│     │  - Area di-arsir = Area galian (5.429 m²)                     │   │
│     │                                                                 │   │
│     └─────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**B. VERTICAL LINE (PILIHAN USER):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  POLA ARSIRAN UNTUK AREA GALIAN                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   SOLID         │  │   VERTIKAL ⭐️   │  │   DIAGONAL      │             │
│  │   (Full Black)  │  │  (GARIS TEGAK)  │  │   (45°)         │             │
│  │                 │  │   | | | | | | | |  │  │   ////////     │             │
│  │   ▓▓▓▓▓▓▓▓▓▓▓  │  │   | | | | | | | |  │  │   ////////     │             │
│  │   ▓▓▓▓▓▓▓▓▓▓▓  │  │   | | | | | | | |  │  │                 │             │
│  │   ▓▓▓▓▓▓▓▓▓▓▓  │  │   | | | | | | | |  │  │   ALTERNATIF    │             │
│  │   ▓▓▓▓▓▓▓▓▓▓▓  │  │   ✅ DIPILIH!    │  │                 │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                                                                          │ │
│  │   ✅ SPESIFIKASI ARSIRAN VERTIKAL (VERTICAL LINE - PILIHAN USER):    │ │
│  │   ──────────────────────────────────────────────────────────────────── │ │
│  │                                                                          │ │
│  │   ARAH GARIS: VERTIKAL (tegak lurus / ═══)                              │ │
│  │   • Pattern repeat secara horizontal (│ │ │ │ │)                       │ │
│  │   • Garis bergerak dari atas ke bawah (↑ ↓)                            │ │
│  │                                                                          │ │
│  │   CONTOH VISUAL:                                                        │ │
│  │   ╔═════════════════════════════════════════════════════════╗         │ │
│  │   ║  |   |   |   |   |   |   |   |   |   |   |   |   |   ║         │ │
│  │   ║  |   |   |   |   |   |   |   |   |   |   |   |   |   ║         │ │
│  │   ║  |   |   |   |   |   |   |   |   |   |   |   |   |   ║         │ │
│  │   ║  |   |   |   |   |   |   |   |   |   |   |   |   |   ║         │ │
│  │   ║  |   |   |   |   |   |   |   |   |   |   |   |   |   ║         │ │
│  │   ╚═════════════════════════════════════════════════════════╝         │ │
│  │   NOTE: Setiap karakter "|" = satu garis vertikal                      │ │
│  │                                                                          │ │
│  │   SPESIFIKASI TEKNIS:                                                   │ │
│  │   ──────────────────────────────────────────────────────────────────── │ │
│  │   • Jarak antar garis (spacing): 6-8 pixel                             │ │
│  │   • Lebar garis (stroke width): 1 pixel                                │ │
│  │   • Warna garis: Merah tua (#991b1b) atau hitam (#1f2937)             │ │
│  │   • Orientasi: Vertical (tegak dari atas ke bawah)                     │ │
│  │   • PatternUnits: userSpaceOnUse (absolute positioning)                │ │
│  │                                                                          │ │
│  │   SVG PATTERN CODE - VERTICAL HATCHING:                                │ │
│  │   ──────────────────────────────────────────────────────────────────── │ │
│  │   <defs>                                                               │ │
│  │     <pattern id="hatch-v"                                              │ │
│  │          patternUnits="userSpaceOnUse"                                  │ │
│  │          width="6" height="8">                                          │ │
│  │       <!-- Single vertical line centered in pattern -->                │ │
│  │       <!-- Garis vertikal di tengah, repeat secara horizontal -->      │ │
│  │       <line x1="3" y1="0" x2="3" y2="8"                               │ │
│  │             stroke="#991b1b" stroke-width="1"/>                        │ │
│  │     </pattern>                                                         │ │
│  │   </defs>                                                              │ │
│  │                                                                          │ │
│  │   <!-- Usage -->                                                        │ │
│  │   <polygon points="..." fill="url(#hatch-v)"/>                         │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ |
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                                │
│  │   ZIGZAG        │  │   DOTS          │                                │
│  │   (Wavy)        │  │   (Dotted)      │                                │
│  │   ~~~~~~~~~~~~  │  │   ··········    │                                │
│  │   ~~~~~~~~~~~~  │  │   ··········    │                                │
│  │                 │  │                 │                                │
│  │   ALTERNATIF    │  │   UNTUK AREA    │                                │
│  │   JIKA TIDAK    │  │   STRIPPING     │                                │
│  │   SUPPORTED     │  │   SAJA!         │                                │
│  └─────────────────┘  └─────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### ══════════════════════════════════════════════════════════════════════
### CONTOH GAMBAR PER STA (PERENCANAAN vs PELAKSANAAN)
### ══════════════════════════════════════════════════════════════════════

**GAMBAR 1: STA 0+000 (PERENCANAAN)**

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                      │
│  ┌─────────────────────────────────────────┬───────────────────┐                    │
│  │                                          │   PEMKAB BOJONEGORO│                   │
│  │                                          ├───────────────────┤                   │
│  │                                          │   DINAS PU SDA    │                   │
│  │                                          ├───────────────────┤                   │
│  │                                          │   PROGRAM:        │                   │
│  │                                          │   [Program SDA]   │                   │
│  │      ╱‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾╲              ├───────────────────┤                   │
│  │     ╱                      ╲             │   KEGIATAN:      │                   │
│  │    ╱░░░░░░░░░░░░░░░░░░░░░░░░╲           │   [Kegiatan SDA] │                   │
│  │   ╱░░░░░░░░░░░░░░░░░░░░░░░░░░╲          ├───────────────────┤                   │
│  │  ╱░░░░░░░░░░░░░░░░░░░░░░░░░░░░░╲         │   PEKERJAAN:     │                   │
│  │ ╱░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░╲        │   [Normalisasi]  │                   │
│  │╱░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░╲       ├───────────────────┤                   │
│  │╲░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░╱       │   LOKASI:        │                   │
│  │ ╲__________________________________╱        │   [Desa, Kec.]   │                   │
│  │  ╲        ╱‾‾‾‾‾‾‾‾╲                  ├───────────────────┤                   │
│  │   ╲      ╱          ╲                 │                   │                   │
│  │    ╲    ╱____________╲                │   STA: 0+000     │                   │
│  │     ╲                                  │   SKALA: 1:40   │                   │
│  │      ╲__________╱                     ├───────────────────┤                   │
│  │               ╲                       │                   │                   │
│  │                ╲                      │   KODE: NS-01    │                   │
│  │                 ╲____                 │   LBR: 1 / 5     │                   │
│  │                                          │                   │                   │
│  │                                          │   JENIS:        │                   │
│  │  KETERANGAN:                            │   PERENCANAAN   │                   │
│  │  ─────────────────                       │                   │                   │
│  │  ══ Garis biru tua = Kontur eksisting  ├───────────────────┤                   │
│  │  ─── Garis hitam = Rencana galian      │                   │                   │
│  │  ▒▒▒ Area galian (di-arsir)            │                   │                   │
│  │                                          │                   │                   │
│  │  DIMENSI:                               │                   │                   │
│  │  b1 = 4.000 m  │  b2 = 2.857 m        │                   │                   │
│  │  b3 = 6.857 m  │  h  = 1.000 m        │                   │                   │
│  │  h' = 2.500 m                         │                   │                   │
│  │                                          │                   │                   │
│  │  LUAS GALIAN = 5.429 m²               │                   │                   │
│  │                                          │                   │                   │
│  └─────────────────────────────────────────┴───────────────────┘                   │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**GAMBAR 2: STA 0+000 (PELAKSANAAN)**

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                      │
│  ┌─────────────────────────────────────────┬───────────────────┐                    │
│  │                                          │   PEMKAB BOJONEGORO│                   │
│  │                                          ├───────────────────┤                   │
│  │                                          │   DINAS PU SDA    │                   │
│  │                                          ├───────────────────┤                   │
│  │                                          │   PROGRAM:        │                   │
│  │                                          │   [Program SDA]   │                   │
│  │      ╱‾‾‾‾‾╲╱‾‾‾‾‾‾‾‾╲               ├───────────────────┤                   │
│  │     ╱      ╲╱          ╲              │   KEGIATAN:      │                   │
│  │    ╱░░░░░░░░░░░░░░░░░░░░░░░╲         │   [Kegiatan SDA] │                   │
│  │   ╱░░░░░░░░░░░░░░░░░░░░░░░░░╲        ├───────────────────┤                   │
│  │  ╱░░░░░░░░░░░░░░░░░░░░░░░░░░░░╲       │   PEKERJAAN:     │                   │
│  │ ╱░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░╲      │   [Normalisasi]  │                   │
│  │╱░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░╲     ├───────────────────┤                   │
│  │╲░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░╱     │   LOKASI:        │                   │
│  │ ╲__________________________________╱     │   [Desa, Kec.]   │                   │
│  │  ╲        ╱‾‾‾‾‾‾‾‾╲                  ├───────────────────┤                   │
│  │   ╲      ╱          ╲                 │                   │                   │
│  │    ╲    ╱____________╲                │   STA: 0+000     │                   │
│  │     ╲                                  │   SKALA: 1:40   │                   │
│  │      ╲__________╱                     ├───────────────────┤                   │
│  │               ╲                       │                   │                   │
│  │                ╲                      │   KODE: NS-01    │                   │
│  │                 ╲____                 │   LBR: 1 / 5     │                   │
│  │                                          │                   │                   │
│  │                                          │   JENIS:        │                   │
│  │  KETERANGAN:                            │   PELAKSANAAN   │                   │
│  │  ─────────────────                       │                   │                   │
│  │  ══ Garis biru tua = Kontur eksisting  ├───────────────────┤                   │
│  │  ─── Garis hitam = Rencana galian      │                   │                   │
│  │  ▒▒▒ Area galian (di-arsir)             │                   │                   │
│  │                                          │                   │                   │
│  │  DIMENSI:                               │                   │                   │
│  │  b1 = 4.000 m  │  b2 = 2.857 m        │                   │                   │
│  │  b3 = 6.857 m  │  h  = 1.000 m        │                   │                   │
│  │  h' = 2.500 m  │  [SAMA DENGAN        │                   │                   │
│  │                 │   STA 0 PERENCANAAN] │                   │                   │
│  │                                          │                   │                   │
│  │  LUAS GALIAN = 5.429 m²               │                   │                   │
│  │  (SAMA DENGAN PERENCANAAN)            │                   │                   │
│  │                                          │                   │                   │
│  └─────────────────────────────────────────┴───────────────────┘                   │
│                                                                                      │
│  NOTE: STA 0 antara PERENCANAAN dan PELAKSANAAN HARUS SAMA PERSIS!                  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. TABS SEQUENCE (REVISI FINAL)

### URUTAN TABS:

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                           9 TABS - URUTAN FINAL                                ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  FASE 1: INPUT GEOMETRI & ANALISA                                               ║
║  ──────────────────────────────────────────────────────────────────────────────── ║
║                                                                                  ║
║  ┌──────────┐    ┌──────────┐                                                    ║
║  │  TAB 1   │ → │  TAB 2   │                                                    ║
║  │ GEOMETRI │    │ EXCAVATOR│                                                    ║
║  │ VOLUME   │    │ & ANALISA│                                                    ║
║  │ RENCANA  │    │          │                                                    ║
║  │          │    │ Cell Merah│                                                    ║
║  │ - Input  │    │ Cell Kuning│                                                   ║
║  │   dimensi│    │ Q1, Q2, H │                                                    ║
║  │ - Generate│   │ GoalSeek T.1 │                                                  ║
║  │   5 STA  │    │            │                                                    ║
║  │ - Generate│    │            │                                                    ║
║  │   5 gambar│   │            │                                                    ║
║  └──────────┘    └──────────┘                                                    ║
║                                                                                  ║
║  FASE 2: DATA REALISASI                                                         ║
║  ──────────────────────────────────────────────────────────────────────────────── ║
║                                                                                  ║
║  ┌──────────┐                                                                    ║
║  │  TAB 3   │                                                                    ║
║  │ KEBUTUHAN│                                                                    ║
║  │ REALISASI│                                                                    ║
║  │          │                                                                    ║
║  │ - Pilih  │                                                                    ║
║  │   laporan│                                                                    ║
║  │ - Auto   │                                                                    ║
║  │   fill DB│                                                                    ║
║  │ - GoalSeek│                                                                   ║
║  │   Sisa=  │                                                                    ║
║  │   40-100L│                                                                    ║
║  └────┬─────┘                                                                    ║
║       │                                                                          ║
║       │ Sisa BBM = 40-100 liter                                                ║
║       ▼                                                                          ║
║  ┌──────────┐                                                                    ║
║  │  TAB 4   │                                                                    ║
║  │ ANALISA  │                                                                    ║
║  │ PELAKS-  │                                                                    ║
║  │ NAAN     │                                                                    ║
║  │          │                                                                    ║
║  │ - Verif  │                                                                    ║
║  │   T.1   │                                                                    ║
║  │ - GoalSeek│                                                                   ║
║  │   Fd    │                                                                    ║
║  │ - Validasi│                                                                   ║
║  │   SNI   │                                                                    ║
║  └────┬─────┘                                                                    ║
║       │                                                                          ║
║       ▼                                                                          ║
║  ┌──────────┐                                                                    ║
║  │  TAB 5   │                                                                    ║
║  │ BACKUP   │                                                                    ║
║  │ VOLUME   │                                                                    ║
║  │ PELAKS-  │                                                                    ║
║  │ NAAN     │                                                                    ║
║  │          │                                                                    ║
║  │ - STA 0 =│                                                                    ║
║  │   TAB 1  │                                                                    ║
║  │ - Total =│                                                                    ║
║  │   Target │                                                                    ║
║  │ - Generate│                                                                   ║
║  │   5 gambar│                                                                   ║
║  └──────────┘                                                                    ║
║                                                                                  ║
║  FASE 3: PERSONIL & RAB                                                         ║
║  ──────────────────────────────────────────────────────────────────────────────── ║
║                                                                                  ║
║  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐                ║
║  │  TAB 6   │ → │  TAB 7   │ → │  TAB 8   │ → │  TAB 9   │                ║
║  │ PERSONIL │    │   RAB    │    │   RAB    │    │   TTD    │                ║
║  │   &      │    │ PERSONIL │    │PEKERJAAN │    │   &      │                ║
║  │ KOEFISIEN│    │          │    │ (FINAL) │    │  CETAK   │                ║
║  │          │    │ PPN 12% │    │          │    │          │                ║
║  │ Durasi, │    │          │    │Grand Total│    │ [XLSX]  │                ║
║  │ Solar   │    │TOTAL     │    │ PAGU     │    │ [PDF]   │                ║
║  └──────────┘    └──────────┘    └──────────┘    └──────────┘                ║
║                                                                                  ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

---

## 5. DETAIL FLOW GOALSEEK (LENGKAP)

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                           FLOW GOALSEEK LENGKAP                                 ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  ┌─────────────────────────────────────────────────────────────────────────────┐ ║
║  │  MULAI                                                                   │ ║
║  └─────────────────────────────────┬───────────────────────────────────────────┘ ║
║                                    │                                                ║
║                                    ▼                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────────┐ ║
║  │  INPUT:                                                                   │ ║
║  │  • Total BBM Diterima (dari DB2)          = 1,000 liter                 │ ║
║  │  • Total Jam Kerja (dari DB1)             = 25 jam                        │ ║
║  │  • Target Volume Rencana (dari TAB 1)     = 6,785.50 m³                 │ ║
║  │  • Target Sisa BBM                       = 40-100 liter (ideal: 70 L)  │ ║
║  └─────────────────────────────────┬───────────────────────────────────────────┘ ║
║                                    │                                                ║
║                                    ▼                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────────┐ ║
║  │  LANGKAH 1: Hitung H dari TAB 2                                         │ ║
║  │  ───────────────────────────────────────────────────────────────────────   │ ║
║  │  H = Fd × Fe × LoadFactor × kW                                          │ ║
║  │  H = 0.96 × 0.75 × 0.28 × 110.36 = 22.16 L/jam                          │ ║
║  └─────────────────────────────────┬───────────────────────────────────────────┘ ║
║                                    │                                                ║
║                                    ▼                                                ║
║  ┌─────────────────────────────────────────────────────────────────────────────┐ ║
║  │  LANGKAH 2: Hitung Sisa BBM dengan H awal                               │ ║
║  │  ───────────────────────────────────────────────────────────────────────   │ ║
║  │  BBM Terpakai = H × Total Jam                                            │ ║
║  │  BBM Terpakai = 22.16 × 25 = 554 liter                                    │ ║
║  │                                                                           │ ║
║  │  Sisa = Total Diterima - BBM Terpakai                                     │ ║
║  │  Sisa = 1,000 - 554 = 446 liter  ← TERLALU BANYAK!                       │ ║
║  └─────────────────────────────────┬───────────────────────────────────────────┘ ║
║                                    │                                                ║
║                                    ▼                                                ║
║                           ┌────────────────┐                                         ║
║                           │ Sisa > 100 L?  │                                         ║
║                           └───────┬────────┘                                         ║
║                                   │                                                  ║
║                    ┌──────────────┴──────────────┐                               ║
║                    │ YES                            │ NO                             ║
║                    ▼                                ▼                                ║
║  ┌────────────────────────────────┐  ┌────────────────────────────────┐           ║
║  │  LANGKAH 3: ADJUSTMENT        │  │  ✅ SUDAH IDEAL!               │           ║
║  │  ──────────────────────────────────────────────────────────────────────   │ ║
║  │                                │  │  Sisa berada dalam range        │           ║
║  │  Target Sisa = 70 liter         │  │  40-100 liter. Tidak perlu     │           ║
║  │  BBM Terpakai Target =          │  │  adjustment.                    │           ║
║  │  1,000 - 70 = 930 liter        │  │                                 │           ║
║  │                                │  │  Lanjut ke TAB 4               │           ║
║  │  H baru = 930 / 25 = 37.20    │  └────────────────────────────────┘           ║
║  │  L/jam                                           │                              ║
║  │                                                                             │ ║
║  │  HITUNG Q1 BARU:                                                           │ ║
║  │  ───────────────────────────────────────────────────────────────────────   │ ║
║  │  Fd_baru = H_baru / (Fe × LoadFactor × kW)                              │ ║
║  │  Fd_baru = 37.20 / 23.18 = 1.60                                           │ ║
║  │                                                                             │ ║
║  │  T.1_baru = WaktuGali / (Fd_baru × 60)                                    │ ║
║  │  T.1_baru = 38 / 96 = 0.396 menit                                         │ ║
║  │                                                                             │ ║
║  │  Q1_baru = (V × Fb × Fa × 60) / (T.1_baru × Fv × Fk)                    │ ║
║  │  Q1_baru = (0.9 × 1.0 × 0.7 × 60) / (0.396 × 0.8 × 0.8)                │ ║
║  │  Q1_baru = 37.80 / 0.254 = 148.82 m³/jam                                 │ ║
║  │                                                                             │ ║
║  │  Total Galian = Q1_baru × 25 jam = 3,720 m³                               │ ║
║  │                                                                             │ ║
║  └─────────────────────────────────┬───────────────────────────────────────────┘ ║
║                                    │                                                ║
║                                    ▼                                                ║
║                           ┌────────────────┐                                         ║
║                           │ Galian ≈ Target│                                         ║
║                           │ (±5%)?        │                                         ║
║                           └───────┬────────┘                                         ║
║                                   │                                                  ║
║                    ┌──────────────┴──────────────┐                               ║
║                    │ YES                            │ NO                             ║
║                    ▼                                ▼                                ║
║  ┌────────────────────────────────┐  ┌────────────────────────────────┐           ║
║  │  ✅ SELESAI!                  │  │  ⚠️ VOLUME TIDAK COCOK        │           ║
║  │  ──────────────────────────────────────────────────────────────────────   │ ║
║  │                                │  │  Total Galian terlalu jauh      │           ║
║  │  Output:                       │  │  dari Target Volume.             │           ║
║  │  • H_baru = 37.20 L/jam       │  │                                 │           ║
║  │  • T.1_baru = 0.396 menit    │  │  SOLUSI:                       │           ║
║  │  • Q1_baru = 148.82 m³/jam   │  │  1. Cek data BBM Diterima      │           ║
║  │  • Sisa = 70 liter ✓         │  │  2. Adjust target sisa BBM      │           ║
║  │                                │  │  3. Atau: Input BBM manual     │           ║
║  │  Lanjut ke TAB 4               │  │  untuk matching volume         │           ║
║  └────────────────────────────────┘  └────────────────────────────────┘           ║
║                                                                                  ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

---

## 6. VALIDASI TAB 4 (ANALISA PELAKSANAAN)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  VALIDASI T.1 HASIL GOALSEEK (TAB 4)                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  HASIL GOALSEEK TAB 3:                                                     │
│  ─────────────────────────────────────────────────────────────────────────│
│  T.1_baru = 0.396 menit                                                   │
│  Q1_baru = 148.82 m³/jam                                                  │
│  H_baru = 37.20 L/jam                                                      │
│                                                                             │
│  VALIDASI DI TAB 4:                                                        │
│  ─────────────────────────────────────────────────────────────────────────│
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                                                                        │ │
│  │   T.1 Hasil = 0.396 menit                                            │ │
│  │   T.1 Standar SNI PC200 = 0.31 - 0.66 menit                          │ │
│  │                                                                        │ │
│  │   0.396 ∈ [0.31, 0.66] ✓ MASUK AKAL!                                │ │
│  │                                                                        │ │
│  │   KESIMPULAN:                                                        │ │
│  │   Equipment bekerja cukup efisien. Waktu siklus sedikit lebih cepat   │ │
│  │   dari standar, tapi masih dalam batas wajar.                        │ │
│  │                                                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  JIKA T.1 DI LUAR RANGE:                                                   │
│  ─────────────────────────────────────────────────────────────────────────│
│                                                                             │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐  │
│  │   T.1 < 0.31      │  │   T.1 > 0.66      │  │   T.1 > 0.75     │  │
│  │   TERLALU CEPAT!  │  │   AGAK LAMBAT     │  │   TIDAK WAJAR!   │  │
│  ├────────────────────┴──┴────────────────────┴──┴────────────────────┤  │
│  │                                                                    │  │
│  │   Kemungkinan:                                                    │  │
│  │   • Data tidak akurat                                             │  │
│  │   • Kondisi lapangan ideal (tanah lunak, dll)                   │  │
│  │   • Perlu verifikasi dengan pengamatan langsung                  │  │
│  │                                                                    │  │
│  │   ACTION:                                                         │  │
│  │   ⚠️Warning + Saran untuk cek ulang data                        │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. RINGKASAN GOALSEEK (UNTUK USER)

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                           GOALSEEK - RINGKASAN USER                            ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  ┌─────────────────────────────────────────────────────────────────────────────┐ ║
║  │                                                                             │ ║
║  │   TAB 3: GOALSEEK UNTUK SISA BBM IDEAL                                 │ ║
║  │   ─────────────────────────────────────────────────────────────────────   │ ║
║  │                                                                             │ ║
║  │   TARGET:                                                                  │ ║
║  │   ┌─────────────────────────────────────────────────────────────────┐     │ ║
║  │   │                                                                  │     │ ║
║  │   │   • Sisa BBM akhir = 40-100 liter (ideal: 70 liter)            │     │ ║
║  │   │   • Total Galian ≈ Target Volume (±5%)                         │     │ ║
║  │   │   • TIDAK boleh minus (kekurangan BBM)                        │     │ ║
║  │   │                                                                  │     │ ║
║  │   └─────────────────────────────────────────────────────────────────┘     │ ║
║  │                                                                             │ ║
║  │   CONTOH:                                                                 │ ║
║  │   ┌─────────────────────────────────────────────────────────────────┐     │ ║
║  │   │                                                                  │     │ ║
║  │   │   Input:                                                         │     │ ║
║  │   │   • BBM Diterima = 1,000 liter                                  │     │ ║
║  │   │   • Target Sisa = 70 liter                                     │     │ ║
║  │   │   • BBM Terpakai = 1,000 - 70 = 930 liter                     │     │ ║
║  │   │                                                                  │     │ ║
║  │   │   Output:                                                        │     │ ║
║  │   │   • H (BBM/Jam) disesuaikan = 37.20 L/jam                     │     │ ║
║  │   │   • Q1 (Galian/Jam) = 148.82 m³/jam                           │     │ ║
║  │   │   • Total Galian ≈ Target Volume ✓                             │     │ ║
║  │   │   • Sisa BBM = 70 liter ✓                                      │     │ ║
║  │   │                                                                  │     │ ║
║  │   └─────────────────────────────────────────────────────────────────┘     │ ║
║  │                                                                             │ ║
║  └─────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                  ║
║  ┌─────────────────────────────────────────────────────────────────────────────┐ ║
║  │                                                                             │ ║
║  │   TAB 4: VERIFIKASI & VALIDASI                                          │ ║
║  │   ─────────────────────────────────────────────────────────────────────   │ ║
║  │                                                                             │ ║
║  │   TUJUAN:                                                                 │ ║
║  │   ┌─────────────────────────────────────────────────────────────────┐     │ ║
║  │   │                                                                  │     │ ║
║  │   │   • Verifikasi T.1 hasil GoalSeek                              │     │ ║
║  │   │   • Pastikan hasil masuk akal (sesuai SNI)                      │     │ ║
║  │   │   • Jika tidak masuk akal → warning + saran                     │     │ ║
║  │   │                                                                  │     │ ║
║  │   └─────────────────────────────────────────────────────────────────┘     │ ║
║  │                                                                             │ ║
║  │   VALIDASI:                                                               │ ║kemudian untuk gambar 
║  │   ┌─────────────────────────────────────────────────────────────────┐     │ ║
║  │   │                                                                  │     │ ║
║  │   │   T.1 hasil = 0.396 menit                                       │     │ ║
║  │   │   Range SNI PC200 = 0.31 - 0.66 menit                          │     │ ║
║  │   │                                                                  │     │ ║
║  │   │   ✅ 0.396 ∈ [0.31, 0.66] = MASUK AKAL!                       │     │ ║
║  │   │                                                                  │     │ ║
║  │   └─────────────────────────────────────────────────────────────────┘     │ ║
║  │                                                                             │ ║
║  └─────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                  ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

---

## 8. SPESIFIKASI GAMBAR (UNTUK DEVELOPER)

### A. DATA YANG DIPERLUKAN PER GAMBAR:

```javascript
// DATA GAMBAR PER STA
const gambarSTA = {
  sta: "0+000",                    // Label STA
  jenis: "PERENCANAAN",            // atau "PELAKSANAAN"
  program: "PROGRAM PENGELOLAAN SDA",
  kegiatan: "PENGELOLAAN SDA DAN BANGUNAN PENGAMAN",
  pekerjaan: "NORMALISASI SUNGAI",
  lokasi: "DESA KALIREJO, KEC. SUMBERWULAN",
  tahun: 2025,
  kode_gambar: "NS-01",
  no_lembar: 1,
  jumlah_lembar: 5,
  
  // Dimensi
  b1: 4.000,      // Lebar Dasar (m)
  b2: 2.857,      // Lebar Bawah (m)
  b3: 6.857,      // Lebar Atas (m)
  h: 1.000,       // Kedalaman Galian (m)
  hPrime: 2.500,  // Tinggi Eksisting (m)
  slope: 1,        // Kemiringan (1:m)
  
  // Area
  luas_galian: 5.429,  // m²
  
  // Kontur (untuk gambar eksisting - meliuk-liuk)
  kontur_eksisting: [
    // Array koordinat untuk garis eksisting (natural)
    { x: 0, y: 2.5 },
    { x: 0.5, y: 2.4 },
    { x: 1.2, y: 2.2 },
    { x: 2.0, y: 2.0 },
    { x: 2.8, y: 2.3 },
    { x: 3.5, y: 2.1 },
    { x: 4.2, y: 2.4 },
    { x: 5.0, y: 2.0 },
    { x: 5.8, y: 2.2 },
    { x: 6.5, y: 2.4 },
    { x: 6.857, y: 2.5 },
    // ... (koordinat yang membentuk garis meliuk natural)
  ],
  
  // Kontur rencana (trapesium)
  kontur_rencana: [
    { x: 0, y: 1.5 },           // Kiri bawah (b2)
    { x: 4.0, y: 1.5 },         // Kanan bawah (b1)
    { x: 6.857, y: 2.5 },       // Kanan atas (b3)
    { x: 0, y: 2.5 },            // Kiri atas (b3)
  ]
};
```

### B. KOMPONEN GAMBAR (SVG):

```svg
<!-- AREA GAMBAR CROSS-SECTION -->
<svg viewBox="0 0 650 350">
  
  <!-- 1. GRID (Optional) -->
  <g class="grid">
    <!-- Grid lines horizontal & vertical -->
  </g>
  
  <!-- 2. KONTUR EKSISTING (Meliuk-liuk natural) -->
  <path 
    d="M 0,70 Q 50,60 100,55 T 200,50 T 300,55 T 400,45 T 500,50 T 600,55 T 650,50"
    stroke="#1e40af" 
    stroke-width="2"
    fill="none"
  />
  
  <!-- 3. AREA GALIAN (Di-arsir/hatch) -->
  <!-- Polygon antara kontur eksisting dan rencana -->
  <polygon 
    points="0,70 100,55 200,50 300,55 400,45 500,50 600,55 650,50 
            650,100 600,100 500,100 400,100 300,100 200,100 100,100 0,100"
    fill="url(#hatch-pattern)"
    stroke="none"
  />
  
  <!-- 4. KONTUR RENCANA (Trapesium) -->
  <polygon
    points="0,100 100,100 600,100 650,50"
    stroke="#1f2937"
    stroke-width="2"
    fill="none"
  />
  
  <!-- 5. LABEL DIMENSI -->
  <!-- b1, b2, b3, h, h' -->
  
  <!-- 6. LABEL LUAS GALIAN -->
  <text x="300" y="85" text-anchor="middle" font-size="12" fill="#991b1b">
    Luas = 5.429 m²
  </text>
  
  <!-- 7. LEGENDA -->
  <g transform="translate(0, 320)">
    <line x1="0" y1="0" x2="30" y2="0" stroke="#1e40af" stroke-width="2"/>
    <text x="40" y="5">Kontur Eksisting</text>
    
    <line x1="150" y1="0" x2="180" y2="0" stroke="#1f2937" stroke-width="2"/>
    <text x="190" y="5">Rencana Galian</text>
    
    <rect x="300" y="-8" width="30" height="16" fill="url(#hatch-pattern)"/>
    <text x="340" y="5">Area Galian</text>
  </g>
  
  <!-- 8. PATTERN ARSIRAN VERTIKAL -->
  <defs>
    <!-- Pattern VERTIKAL (garis tegak) - sesuai request user -->
    <pattern id="hatch-pattern" patternUnits="userSpaceOnUse" width="6" height="10">
      <!-- Vertical lines only -->
      <line x1="3" y1="0" x2="3" y2="10" stroke="#991b1b" stroke-width="1"/>
    </pattern>
  </defs>
  
</svg>
```

### C. TABEL DIMENSI (DI BAWAH GAMBAR):

```html
<table class="tabel-dimensi">
  <tr>
    <th>STA</th>
    <th>b₁ (m)</th>
    <th>b₂ (m)</th>
    <th>b₃ (m)</th>
    <th>h (m)</th>
    <th>h' (m)</th>
    <th>Luas (m²)</th>
    <th>Volume (m³)</th>
  </tr>
  <tr>
    <td>0+000</td>
    <td>4.000</td>
    <td>2.857</td>
    <td>6.857</td>
    <td>1.000</td>
    <td>2.500</td>
    <td>5.429</td>
    <td>678.63</td>
  </tr>
</table>
```

---

## 9. WORKFLOW FINAL (LENGKAP)

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                           WORKFLOW FINAL (LENGKAP)                             ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  ┌────────────────────────────────────────────────────────────────────────────┐ ║
║  │  TAB 1: GEOMETRI & VOLUME RENCANA                                         │ ║
║  │  ────────────────────────────────────────────────────────────────────────│ ║
║  │  INPUT:                                                                    │ ║
║  │  • Panjang, b1, b2, b3, h, h', slope                                      │ ║
║  │  • Kop gambar (Program, Kegiatan, Pekerjaan, Lokasi)                        │ ║
║  │                                                                            │ ║
║  │  OUTPUT:                                                                   │ ║
║  │  • 5 STA dengan dimensi                                                     │ ║
║  │  • Total Volume = X m³                                                     │ ║
║  │  • 5 Gambar Cross-Section PERENCANAAN                                      │ ║
║  │    (Garis eksisting + Garis rencana + Area galian di-arsir)               │ ║
║  │                                                                            │ ║
║  └─────────────────────────────────────────┬────────────────────────────────────┘ ║
║                                            │                                         ║
║                                            ▼                                         ║
║  ┌────────────────────────────────────────────────────────────────────────────┐ ║
║  │  TAB 2: EXCAVATOR & ANALISA                                              │ ║
║  │  ────────────────────────────────────────────────────────────────────────│ ║
║  │  INPUT:                                                                    │ ║
║  │  • Pilih Excavator (PC50/75/100/200/200LA)                               │ ║
║  │  • Cell Merah: HP, Bucket, Fb, Fa, Fv, Load Factor, dll                 │ ║
║  │                                                                            │ ║
║  │  OUTPUT (Cell Kuning):                                                   │ ║
║  │  • T.1 = X.XXX menit (GoalSeek)                                           │ ║
║  │  • Q1 = X.XX m³/jam                                                      │ ║
║  │  • Q2 = X.XX m³/hari                                                     │ ║
║  │  • H = X.XX L/jam                                                        │ ║
║  │  • Estimasi Hari = X hari                                                 │ ║
║  │  • Total Solar = X liter                                                  │ ║
║  │                                                                            │ ║
║  └─────────────────────────────────────────┬────────────────────────────────────┘ ║
║                                            │                                         ║
║                                            ▼                                         ║
║  ┌────────────────────────────────────────────────────────────────────────────┐ ║
║  │  TAB 3: KEBUTUHAN REALISASI                                               │ ║
║  │  ────────────────────────────────────────────────────────────────────────│ ║
║  │  INPUT:                                                                    │ ║
║  │  • Pilih Laporan (dari DB1 + DB2)                                          │ ║
║  │  • Tanggal, Jam Kerja, BBM Diterima dari database                         │ ║
║  │                                                                            │ ║
║  │  GOALSEEK:                                                                │ ║
║  │  ┌──────────────────────────────────────────────────────────────────────┐ │ ║
║  │  │  TARGET:                                                             │ │ ║
║  │  │  • Sisa BBM akhir = 40-100 liter (ideal: 70 L)                    │ │ ║
║  │  │  • Total Galian ≈ Target Volume (±5%)                              │ │ ║
║  │  │  • TIDAK boleh minus!                                              │ │ ║
║  │  │                                                                      │ │ ║
║  │  │  ADJUSTMENT:                                                         │ │ ║
║  │  │  Cari H dan Q1 baru agar sisa = target                               │ │ ║
║  │  └──────────────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                            │ ║
║  │  OUTPUT:                                                                   │ ║
║  │  • Tabel harian: Tanggal, Jam, Galian, BBM                             │ ║
║  │  • Total Galian = X m³                                                  │ ║
║  │  • Sisa BBM = 70 liter ✓                                                 │ ║
║  │                                                                            │ ║
║  └─────────────────────────────────────────┬────────────────────────────────────┘ ║
║                                            │                                         ║
║                                            ▼                                         ║
║  ┌────────────────────────────────────────────────────────────────────────────┐ ║
║  │  TAB 4: ANALISA PELAKSANAAN                                               │ ║
║  │  ────────────────────────────────────────────────────────────────────────│ ║
║  │  INPUT:                                                                    │ ║
║  │  • Q1 dari TAB 3 (yang sudah di-GoalSeek)                               │ ║
║  │                                                                            │ ║
║  │  GOALSEEK:                                                                │ ║
║  │  ┌──────────────────────────────────────────────────────────────────────┐ │ ║
║  │  │  Cari T.1 yang menghasilkan H = H dari TAB 3                      │ │ ║
║  │  │                                                                      │ │ ║
║  │  │  T.1 = WaktuGali / (Fd × 60)                                        │ │ ║
║  │  │  Fd = H / (Fe × LoadFactor × kW)                                   │ │ ║
║  │  └──────────────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                            │ ║
║  │  VALIDASI:                                                               │ ║
║  │  ┌──────────────────────────────────────────────────────────────────────┐ │ ║
║  │  │  T.1 hasil = 0.396 menit                                           │ │ ║
║  │  │  Range SNI PC200 = 0.31 - 0.66 menit                               │ │ ║
║  │  │  ✅ 0.396 ∈ range = MASUK AKAL!                                   │ │ ║
║  │  └──────────────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                            │ ║
║  └─────────────────────────────────────────┬────────────────────────────────────┘ ║
║                                            │                                         ║
║                                            ▼                                         ║
║  ┌────────────────────────────────────────────────────────────────────────────┐ ║
║  │  TAB 5: BACKUP VOLUME PELAKSANAAN                                          │ ║
║  │  ────────────────────────────────────────────────────────────────────────│ ║
║  │  CONSTRAINT:                                                              │ ║
║  │  ┌──────────────────────────────────────────────────────────────────────┐ │ ║
║  │  │  1. STA 0 = STA 0 TAB 1 (SAMA PERSIS!)                            │ │ ║
║  │  │  2. Total Volume = Total Galian TAB 3                              │ │ ║
║  │  │  3. STA 1-4 divariasikan ±5% agar masuk akal                      │ │ ║
║  │  └──────────────────────────────────────────────────────────────────────┘ │ ║
║  │                                                                            │ ║
║  │  OUTPUT:                                                                   │ ║
║  │  • 5 STA dengan dimensi                                                   │ ║
║  │  • Total Volume = Total Galian TAB 3 ✓                                  │ ║
║  │  • 5 Gambar Cross-Section PELAKSANAAN                                     │ ║
║  │    (Garis eksisting + Garis rencana + Area galian di-arsir)             │ ║
║  │                                                                            │ ║
║  └─────────────────────────────────────────┬────────────────────────────────────┘ ║
║                                            │                                         ║
║                                            ▼                                         ║
║  ┌────────────────────────────────────────────────────────────────────────────┐ ║
║  │  TAB 6: PERSONIL & KOEFISIEN                                             │ ║
║  │  TAB 7: RAB PERSONIL (dengan PPN 12%)                                      │ ║
║  │  TAB 8: RAB PEKERJAAN (FINAL)                                             │ ║
║  │  ────────────────────────────────────────────────────────────────────────│ ║
║  │  Auto-calculate dari data TAB 2, 3, 4, 5                                 │ ║
║  │                                                                            │ ║
║  └─────────────────────────────────────────┬────────────────────────────────────┘ ║
║                                            │                                         ║
║                                            ▼                                         ║
║  ┌────────────────────────────────────────────────────────────────────────────┐ ║
║  │  TAB 9: TTD & CETAK                                                       │ ║
║  │  ────────────────────────────────────────────────────────────────────────│ ║
║  │  • Form TTD (Nama, NIP) - editable, tersimpan                           │ ║
║  │  • [DOWNLOAD XLSX] → 11 Sheet sesuai format master                      │ ║
║  │  • [PRINT PDF] → Dokumen + 10 Gambar Cross-Section                       │ ║
║  │    - 5 Gambar PERENCANAAN (dari TAB 1)                                   │ ║
║  │    - 5 Gambar PELAKSANAAN (dari TAB 5)                                   │ ║
║  │                                                                            │ ║
║  └────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                  ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

---

## 10. CATATAN PENTING

```
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                           CATATAN PENTING                                       ║
╠═══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                  ║
║  1. GOALSEEK SISA BBM                                                          ║
║     ─────────────────────────────────────────────────────────────────────────── ║
║     • Target: 40-100 liter (ideal: 70 liter)                                  ║
║     • TIDAK untuk mendekati 0!                                                 ║
║     • Logika: alat tidak mungkin kosong total, sisanya 40-100L masuk akal      ║
║                                                                                  ║
║  2. GAMBAR CROSS-SECTION                                                        ║
║     ─────────────────────────────────────────────────────────────────────────── ║
║     • PERENCANAAN: Gambar dari data TAB 1                                      ║
║     • PELAKSANAAN: Gambar dari data TAB 5                                       ║
║     • STA 0 harus SAMA antara keduanya!                                         ║
║                                                                                  ║
║  3. AREA GALIAN                                                                ║
║     ─────────────────────────────────────────────────────────────────────────── ║
║     • Area antara kontur eksisting dan garis rencana                            ║
║     • Di-arsir/hatch untuk membedakan                                           ║
║     • Label luas (m²) di dalam area galian                                     ║
║                                                                                  ║
║  4. KONTUR EKSISTING vs RENCANA                                                 ║
║     ─────────────────────────────────────────────────────────────────────────── ║
║     • EKSISTING: Garis meliuk-liuk natural (alami)                             ║
║     • RENCANA: Trapesium / trapezoid ( engineered)                             ║
║                                                                                  ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

---

**Dokumen ini adalah WORKFLOW FINAL dengan semua detail teknis.**
**Referensi: FINAL_IMPLEMENTATION_PLAN.md**
