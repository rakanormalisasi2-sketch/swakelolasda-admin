import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/rap/realisasi?project_id=UUID
 * Ambil semua data realization harian
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    let query = supabase
      .from('rap_realisasi_harian')
      .select('*')
      .order('tanggal', { ascending: true });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/rap/realisasi
 * Tambah data realization harian
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      project_id,
      tanggal,
      jam_kerja = 8,
      galian = 0,
      bbm_harian = 0,
      diterima = 0,
      assignment_id
    } = body;

    if (!project_id || !tanggal) {
      return NextResponse.json(
        { error: 'project_id and tanggal required' },
        { status: 400 }
      );
    }

    // Calculate running balance: ambil sisa terakhir + harian BBM - penggunaan
    const { data: prevData } = await supabase
      .from('rap_realisasi_harian')
      .select('sisa')
      .eq('project_id', project_id)
      .order('tanggal', { ascending: false })
      .limit(1);

    const prevSisa = prevData?.[0]?.sisa || 0;
    const bbmJam = jam_kerja > 0 ? bbm_harian / jam_kerja : 0;
    const q1 = jam_kerja > 0 ? galian / jam_kerja : 0;
    const sisa = prevSisa + diterima - bbm_harian;

    const { data, error } = await supabase
      .from('rap_realisasi_harian')
      .insert({
        project_id,
        tanggal,
        jam_kerja,
        q1,
        galian,
        bbm_jam: bbmJam,
        bbm_harian,
        diterima,
        sisa,
        assignment_id
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/rap/realisasi?id=UUID
 * Hapus data realization
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('rap_realisasi_harian')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
