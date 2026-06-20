import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/rap/projects
 * Ambil semua RAP project, atau satu project by id
 * Query params: id (optional)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const isLatest = searchParams.get('latest');

    let query = supabase
      .from('rap_projects')
      .select(`
        *,
        rap_sta_perencanaan(*),
        rap_sta_pelaksanaan(*),
        rap_calculations(*),
        rap_personil(*),
        rap_rab_final(*),
        rap_ttd(*)
      `)
      .order('created_at', { ascending: false });

    if (id) {
      query = query.eq('id', id).limit(1);
    }

    if (isLatest === 'true') {
      query = query.eq('is_latest', true).limit(1);
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
 * POST /api/rap/projects
 * Buat RAP project baru
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      program, kegiatan, pekerjaan, lokasi, tahun_anggaran,
      panjang, b1, b2, b3, h, h_prime, slope,
      assignment_id, created_by
    } = body;

    // Mark existing as not latest
    if (created_by) {
      await supabase
        .from('rap_projects')
        .update({ is_latest: false })
        .eq('created_by', created_by)
        .eq('is_latest', true);
    }

    const { data, error } = await supabase
      .from('rap_projects')
      .insert({
        program,
        kegiatan,
        pekerjaan,
        lokasi,
        tahun_anggaran,
        panjang,
        b1,
        b2,
        b3,
        h,
        h_prime,
        slope,
        assignment_id,
        created_by,
        is_latest: true
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
 * PUT /api/rap/projects
 * Update RAP project
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('rap_projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
