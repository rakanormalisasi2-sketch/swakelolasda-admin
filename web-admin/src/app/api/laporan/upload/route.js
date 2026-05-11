import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const role = formData.get('role');
    const assignmentId = formData.get('assignment_id'); // Optional assignment link

    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }
    if (!role) {
      return NextResponse.json({ error: 'Role tidak ditemukan' }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!jsonData || jsonData.length === 0) {
      return NextResponse.json({ error: 'File Excel kosong atau format tidak sesuai' }, { status: 400 });
    }

    // Map header ke kolom DB
    const HEADER_MAP = {
      'Tanggal (YYYY-MM-DD)': 'tanggal',
      'Nama Operator': 'override_operator',
      'Jenis Alat': 'override_alat',
      'Kecamatan': 'override_kecamatan',
      'Desa': 'override_desa',
      'Progress Pekerjaan': 'progress_pekerjaan',
      'HM Awal': 'hm_awal',
      'HM Akhir': 'hm_akhir',
      'Jam Kerja': 'jam_kerja',
      'Panjang Pekerjaan': 'panjang_pekerjaan',
      'Keterangan Tambahan': 'keterangan_tambahan',
      'Custom Nama Pekerjaan': 'custom_pekerjaan',
    };

    const rows = [];
    const errors = [];

    jsonData.forEach((row, idx) => {
      const mapped = {};

      // Map setiap kolom
      Object.keys(HEADER_MAP).forEach(header => {
        const dbCol = HEADER_MAP[header];
        let val = row[header];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          mapped[dbCol] = String(val).trim();
        }
      });

      // Validasi tanggal wajib
      if (!mapped.tanggal) {
        errors.push(`Baris ${idx + 2}: Tanggal kosong atau tidak valid`);
        return;
      }

      // Parse tanggal — handle berbagai format
      let parsedDate = mapped.tanggal;
      // Jika tanggal berupa angka (Excel serial date)
      if (!isNaN(Number(mapped.tanggal)) && Number(mapped.tanggal) > 40000) {
        const XLSX2 = require('xlsx');
        const dateObj = XLSX2.SSF.parse_date_code(Number(mapped.tanggal));
        parsedDate = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
      }

      // Validasi format tanggal YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(parsedDate)) {
        errors.push(`Baris ${idx + 2}: Format tanggal "${mapped.tanggal}" tidak valid. Gunakan format YYYY-MM-DD`);
        return;
      }

      // Convert numerik
      const numericFields = ['hm_awal', 'hm_akhir', 'jam_kerja'];
      numericFields.forEach(f => {
        if (mapped[f]) {
          const num = parseFloat(mapped[f]);
          if (!isNaN(num)) mapped[f] = num;
          else delete mapped[f]; // hapus jika bukan angka valid
        }
      });

      // Juga set jenis_alat sebagai fallback text
      if (mapped.override_alat) {
        mapped.jenis_alat = mapped.override_alat;
      }
      // Set operator_name sebagai fallback text
      if (mapped.override_operator) {
        mapped.operator_name = mapped.override_operator;
      }

      rows.push({
        ...mapped,
        tanggal: parsedDate,
        is_manual: true,
        created_by_role: role,
        reported_at: new Date().toISOString(),
        assignment_id: assignmentId || null,
      });
    });

    if (rows.length === 0) {
      return NextResponse.json({
        error: 'Tidak ada data valid untuk diimport',
        details: errors,
      }, { status: 400 });
    }

    // Batch insert ke Supabase
    const { data, error } = await supabaseAdmin
      .from('operator_logs')
      .insert(rows)
      .select('id');

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({
        error: 'Gagal menyimpan ke database: ' + error.message,
        details: errors,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengimport ${data.length} baris data`,
      imported: data.length,
      warnings: errors.length > 0 ? errors : undefined,
    });

  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Gagal memproses file: ' + err.message }, { status: 500 });
  }
}
