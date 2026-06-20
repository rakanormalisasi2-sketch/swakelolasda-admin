import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role'); // e.g. 'seksi_normalisasi'

    let query = supabaseAdmin
      .from('proposals')
      .select('id, nama_usulan, desa, kecamatan, kabupaten, tahun, tanggal_usulan, created_by_role, keterangan')
      .eq('sudah_survey', false)
      .order('created_at', { ascending: false });

    if (role) {
      query = query.eq('created_by_role', role);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Fetch un-surveyed proposals error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
