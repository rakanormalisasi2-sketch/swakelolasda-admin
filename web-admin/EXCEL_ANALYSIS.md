# Analisis Raw Data Excel Master RAP — Untuk Referensi Claude Code

File sumber: `D:\DATA\GAWEAN 2025\laporan normalisasi\Laporan RAB normalisasi 2025\master\pc 200.xlsx`

## Sheet Names (Urutan Asli)
```json
["RAB PELAKSANAAN","Sheet1","Backup Galian","ELEVASI","ANALISA perencanaan","Analisa Pelaksanaan","Kebutuhan  realisasi","backup volume Pelaksanaan","PERSONIL pelaksanaan","RAB PERSONIL PELAKSANAAN"]
```

## Sheet: ANALISA perencanaan (Key Formulas)

### Bagian III — Parameter Alat (Cell Merah)
- Pw (Tenaga) = 145 HP
- V (Bucket) = 0.9 m³  
- Fb (Faktor Bucket) = 0.8
- Fa (Efisiensi Alat) = 0.8
- Fv (Faktor Konversi) = 0.8
- Fk (Pengembangan Material) = 0.8
- Tk (Jam Kerja/Hari) = 7

### Cell Kuning (GoalSeek Target)
- T1 (Waktu Siklus) = 0.6594 menit

### Formula Utama
```
Q1 = (V × Fb × Fa × 60) / (T1 × Fv × Fk) = 89.57 m³/jam
Q2 = Q1 × Tk = 716.60 m³/hari
```

### Bagian IV — BBM
```
kW = HP × 0.7457 = 110.36 kW
Fe = 0.75 (45 menit efektif dari 60)
Fd = waktu_gali_detik / waktu_siklus_detik = 38/39.56 = 0.988
H (L/jam) = Fd × Fe × kW × LoadFactor(L/kWh)
  = 0.988 × 0.75 × 110.36 × 0.28 = 22.90 L/jam
h2 (L/hari) = H × Tk = 22.90 × 8 = 183.21 L/hari
```

## Sheet: Kebutuhan realisasi (Struktur Data)

```
Kolom: No | Tgl | Bln | Thn | Jam_Kerja | Q1_PerJam | Galian_PerHari | BBM_PerJam | BBM_PerHari | BBM_Diterima | Sisa_BBM
Row 1:  1 | 16  | Jan | 2025| 3.8       | 89.57     | 340.38         | 22.90      | 87.03       | (kosong)     | 55
Row 2:  2 | 17  | Jan | 2025| 6.3       | 89.57     | 564.32         | 22.90      | 144.28      | 600          | 510.72
...
TOTAL:                                               | 2015.43 m³     |            | 515.29 L    | 600 L
```

Catatan: Galian_PerHari = Q1 × Jam_Kerja; BBM_PerHari = H × Jam_Kerja

## Sheet: backup volume Pelaksanaan (5 STA)

Jarak Total: 540m. STA: 0, 135, 270, 405, 540

Per STA:
```
STA 0+000: b3=6.857, h'=2.5, b1=4.0, b2=2.857, h=1.0
STA 0+135: b3=6.172, h'=2.5, b1=3.600, b2=2.572, h=1.0
STA 0+270: b3=7.029, h'=2.5, b1=4.1, b2=2.929, h=1.0
STA 0+405: b3=7.200, h'=2.5, b1=4.2, b2=3.0, h=1.0
STA 0+540: b3=6.686, h'=2.5, b1=3.9, b2=2.786, h=1.0
```

REALISASI total = 2015.4318
BACKUP total = 2015.4318 (harus cocok)

Setiap STA juga punya Stripping: lebar 3m × kedalaman 0.1m = vol_strip per segment.

## Sheet: PERSONIL pelaksanaan

```
Volume: 2015.4318 m³
Durasi: 8 Hari

A. TENAGA KERJA:
  1. Penjaga Malam 1: 8 hari
  2. Penjaga Malam 2: 8 hari

B. BAHAN:
  Excavator koef: 716.5979 (= Q2)
  Solar: 515.292 liter (pembulatan dari hitungan)
```

## Sheet: RAB PERSONIL PELAKSANAAN

```
A. TENAGA:
  Penjaga Malam ×2: 8 Hari × Rp 75.000 = Rp 600.000 each
B. BAHAN:
  Solar: 515.29 Ltr × Rp 22.300 × PPN 12% = ~Rp 12.870.000

SUB TOTAL: Rp 14.069.924
PEMBULATAN: Rp 14.069.000
PAGU: Rp 3.600.000.000
```

## Sheet: RAB PELAKSANAAN

```
A. PEKERJAAN TANAH:
  1. Galian+Timbun Excavator: 2015.43 m³ × Rp 5.701.51/m³ (+ PPN → 6385.69) = Rp 12.870.000
  2. Jasa Keamanan: 16 OH × Rp 75.000 = Rp 1.200.000

TOTAL: Rp 14.069.924 → dibulatkan Rp 14.069.000

TTD: KPA (JAFAR SODIQ, ST, MM / NIP.19760818) + PPTK (GALUH SETIAWAN ROSMI, ST / NIP.19790511)
```

## Tabel Referensi SNI (Tertanam di Sheet Analisa)

### Kapasitas Bucket (Fb) — Tabel 4.1
| Jenis Material | Range | Kesulitan |
|---------------|-------|-----------|
| Pasir, Tanah Berpasir | 1.0 - 0.8 | Mudah |
| Tanah Biasa Kering | 0.8 - 0.6 | Sedang |
| Tanah Biasa Berbatu | 0.6 - 0.5 | Agak Sulit |
| Tanah Berbatu | 0.5 - 0.4 | Sulit |

### Efisiensi Alat (Fa) — Tabel 4
| Kondisi Operasi | Pemeliharaan Mesin |
|----------------|-------------------|
| Baik Sekali | 0.83 — 0.81 — 0.76 |
| Baik | 0.78 — 0.75 — 0.71 |
| Sedang | 0.72 — 0.69 — 0.65 |

### Waktu Menggali (detik)
| Kedalaman | Ringan | Sedang | Agak Sulit |
|-----------|--------|--------|------------|
| >4m | 8 | 13 | 19 |
| 2-4m | 7 | 11 | 17 |
| 0-2m | 6 | 9 | 15 |

### Waktu Swing (detik)
| Sudut | Range |
|-------|-------|
| 45°-90° | 4-7 detik |
| 90°-180° | 5-8 detik |

### Sumber
- https://www.researchgate.net/publication/296573614_Fuel_consumption_and_engine_load_factors_of_equipment_in_quarrying_of_crushed_stone
- Spek Komatsu PC200 Standard: E=106.64kW, Fb=0.8
- Caterpillar 305.5: E=31.10kW, Fb=0.22
