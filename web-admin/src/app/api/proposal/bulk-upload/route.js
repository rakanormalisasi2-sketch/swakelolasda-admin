import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import * as xlsx from 'xlsx';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const excelFile = formData.get('file'); // File object
    const sectionRole = formData.get('section_role');

    if (!excelFile || typeof excelFile === 'string') {
      return NextResponse.json({ error: 'File Excel tidak ditemukan' }, { status: 400 });
    }

    if (!sectionRole) {
      return NextResponse.json({ error: 'Role tidak ditemukan' }, { status: 400 });
    }

    const buffer = Buffer.from(await excelFile.arrayBuffer());
    
    // Parse Excel
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet);

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'File Excel kosong atau format salah' }, { status: 400 });
    }

    const inserts = jsonData.map(row => {
      // Handle various column name casing possibilities from the template
      const getVal = (key) => {
        const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase());
        return foundKey ? row[foundKey] : null;
      };

      return {
        nama_usulan: getVal('nama usulan') || getVal('nama') || 'Tanpa Nama',
        desa: getVal('desa') || '',
        kecamatan: getVal('kecamatan') || '',
        kabupaten: getVal('kabupaten') || 'Bojonegoro',
        panjang_lokasi: getVal('panjang lokasi') || getVal('panjang') || '',
        usulan_desa: getVal('usulan desa') || '',
        tahun_pelaksanaan: getVal('tahun pelaksanaan') || new Date().getFullYear(),
        keterangan: getVal('keterangan') || '',
        tahun: new Date().getFullYear(),
        created_by_role: sectionRole,
        sudah_survey: false
      };
    });

    const { error } = await supabaseAdmin
      .from('proposals')
      .insert(inserts);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, count: inserts.length });
  } catch (error) {
    console.error('Bulk Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
