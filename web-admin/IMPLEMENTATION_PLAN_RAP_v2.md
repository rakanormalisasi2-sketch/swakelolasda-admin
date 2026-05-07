# IMPLEMENTATION PLAN RAP v2.0
## Modul Perhitungan Rencana Anggaran Biaya (RAP)
### Normalisasi Sungai - Swakelola SDA

---

**Versi:** 2.0  
**Tanggal:** 21 April 2026  
**Status:** Development Ready  
**Project:** web-admin (Next.js + Tailwind CSS)

---

## 1. EXECUTIVE SUMMARY

### 1.1 Apa yang Sudah Dibangun

Modul RAP telah di-deploy di: **https://swakelolasda.vercel.app/dashboard/seksi/perhitungan-rap**

### 1.2 Kondisi Saat Ini vs Reference Gambar

**TABLE FORMAT (BACK UP VOLUME RENCANA PEKERJAAN):**
- Header: Sudah menggunakan `#1E3A5F` (dark blue) untuk row header
- Header text: Sudah white bold
- Data rows: Sudah menggunakan alternate `#F2F8FF` / white
- Total row: Sudah dark blue dengan white text
- Number formatting: Sudah 3 decimal places
- Column widths: Perlu disesuaikan (lebih compact)

### 1.3 Yang Still Perlu Disempurnakan

1. **Table styling** - column widths perlu lebih compact (8-20 chars)
2. **Cross-section hatching** - pattern vertikal perlu diperbaiki (lebih rapat)
3. **Excel sheet 16** - RINGKASAN sheet sudah ditambahkan

---

## 2. BAGIAN YANG SUDAH DIPERBAIKI

### CrossSectionSVG.js ✅
- Cubic Bezier curves untuk kontur eksisting
- Vertical hatching pattern (`│ │ │ │`) - garis tegak 7x10px
- KOP di KIRI (sesuai referensi asli user)
- 3-item legend (KONTUR EKSISTING | RENCANA GALIAN | AREA GALIAN)
- Thick border SVG area
- Improved dimension labels
- Scale bar fix

### rapExport.js ✅
- **16 sheets** (sudah ditambah sheet RINGKASAN sebagai sheet #16)
- **Thick borders** pada tabel utama (Backup Galian, backup volume rencana)
- **Cell coloring ANALISA**: RED (#FFCCCC) = INPUT, YELLOW (#FFFF99) = OUTPUT (GoalSeek T.1)
- Header styling tetap #1E3A5F dark blue
- Accounting format untuk cell Rp

---

## 3. PRIORITY TASKS

### Phase 1: Critical Fixes

| # | Task | Status | Catatan |
|---|------|--------|---------|
| 1.1 | Fix cross-section hatching pattern | ✅ DONE | Pattern 7x10px vertical |
| 1.2 | Fix Excel column widths (compact) | 🔄 IN PROGRESS | Perlu fine-tune |
| 1.3 | RINGKASAN sheet #16 | ✅ DONE | Sudah diimplementasi |
| 1.4 | Make b2 read-only (calculated) | 🔄 IN PROGRESS | Perlu di page.js |
| 1.5 | Red/Yellow cell coloring ANALISA | ✅ DONE | Input=red, Output=yellow |

### Phase 2: Important Enhancements

| # | Task | Priority |
|---|------|----------|
| 2.1 | Add SNI table reference in Tab 2 | HIGH |
| 2.2 | Update print function with SVG | MEDIUM |
| 2.3 | Add localStorage save/load | MEDIUM |

---

## 4. CROSS SECTION TECHNICAL DRAWING SPECIFICATION

### Key Specifications

**Canvas:** 720x460px
**Padding:** top:30, right:30, bottom:35, left:150
**Hatching:** width=7, height=10, stroke=0.9px, vertical lines
**KOP:** LEFT side, vertical layout

### Drawing Layers (in order)

1. Background grid
2. Area Galian (arsiran VERTIKAL)
3. Kontur Eksisting (Cubic Bezier, navy blue)
4. Rencana Galian (trapezium, dark blue)
5. Dimension lines (b1, b2, b3, h, h', slope)
6. Luas label
7. Skala bar
8. Legenda (3 items)
9. KOP Government (LEFT)

---

## 5. EXCEL 16 SHEETS

| # | Sheet Name | Status |
|---|------------|--------|
| 1 | Backup Galian (2) | ✅ Thick borders |
| 2 | Bahan Upah | ✅ |
| 3 | backup volume rencana | ✅ Thick borders |
| 4 | ANALISA perencanaan | ✅ Red/yellow cells |
| 5 | PERSONIL | ✅ |
| 6 | RAB PERSONIL | ✅ |
| 7 | RAB PEKERJAAN | ✅ |
| 8 | ANALISA pelaksanaan | ✅ |
| 9 | Kebutuhan realistis | ✅ |
| 10 | backup volume Pelaksanaan | ✅ |
| 11 | PERSONIL pelaksanaan | ✅ |
| 12 | RAB PERSONIL PELAKSANAAN | ✅ |
| 13 | RAB PELAKSANAAN | ✅ |
| 14 | Backup Galian | ✅ |
| 15 | ELEVASI | ✅ |
| 16 | RINGKASAN | ✅ NEW |

---

## 6. CELL COLORING SPECIFICATION

| Color | Hex | Usage |
|-------|-----|-------|
| RED | #FFCCCC | INPUT fields (user enters) |
| YELLOW | #FFFF99 | OUTPUT fields (GoalSeek/T.1 result) |
| DARK BLUE | #1E3A5F | Header bars |
| GREEN | #0D6E3F | Grand Total row |
| AMBER | #FFB300 | PPN row |

---

**Document Version:** 2.0  
**Last Updated:** 21 April 2026  
**Authors:** Claude Code + Antigravity (Collaborative)
