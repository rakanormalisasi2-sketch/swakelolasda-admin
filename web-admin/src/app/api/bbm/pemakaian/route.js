import { NextResponse } from 'next/server';
import { supabaseBBM } from '@/lib/supabase-bbm';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const seksi = searchParams.get('seksi');
    const tahun = searchParams.get('tahun');

    let query = supabaseBBM
      .from('bbm_pemakaian')
      .select('*')
      .order('tanggal_kirim', { ascending: false });

    if (seksi) {
      query = query.eq('seksi', seksi);
    }

    if (tahun) {
      const startDate = `${tahun}-01-01`;
      const endDate = `${tahun}-12-31`;
      query = query.gte('tanggal_kirim', startDate).lte('tanggal_kirim', endDate);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { seksi, assignment_id, kegiatan, tipe_alat, desa, kecamatan, tanggal_kirim, jumlah_liter, keterangan } = body;

    if (!seksi || !assignment_id || !tanggal_kirim || jumlah_liter === undefined) {
      return NextResponse.json({ error: 'Field wajib: seksi, assignment_id, tanggal_kirim, jumlah_liter' }, { status: 400 });
    }

    const { error } = await supabaseBBM.from('bbm_pemakaian').insert({
      seksi,
      assignment_id,
      kegiatan,
      tipe_alat,
      desa,
      kecamatan,
      tanggal_kirim,
      jumlah_liter,
      keterangan
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Param id wajib' }, { status: 400 });
    }

    const { error } = await supabaseBBM.from('bbm_pemakaian').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
