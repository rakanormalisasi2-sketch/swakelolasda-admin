import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Dynamic import xlsx
    const XLSX = await import('xlsx');

    // Definisi kolom template
    const headers = [
      'Tanggal (YYYY-MM-DD)',
      'Nama Operator',
      'Jenis Alat',
      'Kecamatan',
      'Desa',
      'Progress Pekerjaan',
      'HM Awal',
      'HM Akhir',
      'Jam Kerja',
      'Panjang Pekerjaan',
      'Keterangan Tambahan',
      'Custom Nama Pekerjaan',
    ];

    // Contoh data (baris 2)
    const exampleRow = [
      '2026-01-15',
      'Budi Santoso',
      'Excavator PC200',
      'Kapas',
      'Sukowati',
      'Galian tanah 50%',
      '1200',
      '1208',
      '8',
      '150 m',
      'Cuaca cerah',
      'NORMALISASI SUNGAI',
    ];

    // Buat worksheet
    const wsData = [headers, exampleRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set lebar kolom
    ws['!cols'] = [
      { wch: 22 }, // Tanggal
      { wch: 25 }, // Nama Operator
      { wch: 25 }, // Jenis Alat
      { wch: 18 }, // Kecamatan
      { wch: 18 }, // Desa
      { wch: 30 }, // Progress
      { wch: 12 }, // HM Awal
      { wch: 12 }, // HM Akhir
      { wch: 12 }, // Jam Kerja
      { wch: 18 }, // Panjang Pekerjaan
      { wch: 30 }, // Keterangan
      { wch: 30 }, // Custom Pekerjaan
    ];

    // Buat workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Laporan');

    // Sheet kedua: Petunjuk pengisian
    const guideData = [
      ['PETUNJUK PENGISIAN TEMPLATE LAPORAN PELAKSANAAN'],
      [''],
      ['Kolom', 'Keterangan', 'Wajib?'],
      ['Tanggal (YYYY-MM-DD)', 'Format: 2026-01-15 (tahun-bulan-tanggal)', 'YA ✅'],
      ['Nama Operator', 'Nama lengkap operator yang bertugas', 'Tidak'],
      ['Jenis Alat', 'Contoh: Excavator PC200, Bulldozer D85', 'Tidak'],
      ['Kecamatan', 'Nama kecamatan lokasi pekerjaan', 'Tidak'],
      ['Desa', 'Nama desa lokasi pekerjaan', 'Tidak'],
      ['Progress Pekerjaan', 'Deskripsi progress (misal: Galian 50%)', 'Tidak'],
      ['HM Awal', 'Angka Hour Meter awal (contoh: 1200)', 'Tidak'],
      ['HM Akhir', 'Angka Hour Meter akhir (contoh: 1208)', 'Tidak'],
      ['Jam Kerja', 'Jumlah jam kerja (angka, contoh: 8)', 'Tidak'],
      ['Panjang Pekerjaan', 'Panjang pekerjaan (contoh: 150 m)', 'Tidak'],
      ['Keterangan Tambahan', 'Catatan tambahan', 'Tidak'],
      ['Custom Nama Pekerjaan', 'Override nama pekerjaan (contoh: NORMALISASI SUNGAI)', 'Tidak'],
      [''],
      ['CATATAN PENTING:'],
      ['1. Baris pertama (header) JANGAN dihapus atau diubah.'],
      ['2. Baris kedua berisi contoh data — boleh dihapus atau ditimpa.'],
      ['3. Isi data mulai dari baris kedua ke bawah.'],
      ['4. Kolom Tanggal WAJIB diisi dengan format YYYY-MM-DD.'],
      ['5. Simpan file dalam format .xlsx sebelum mengupload.'],
    ];
    const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
    wsGuide['!cols'] = [{ wch: 30 }, { wch: 55 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk');

    // Generate buffer
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Template_Laporan_Pelaksanaan.xlsx"`,
      },
    });
  } catch (err) {
    console.error('Error generating template:', err);
    return NextResponse.json({ error: 'Gagal membuat template: ' + err.message }, { status: 500 });
  }
}
