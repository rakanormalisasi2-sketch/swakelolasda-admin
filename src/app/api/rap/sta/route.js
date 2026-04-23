import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/rap/sta?project_id=UUID&type=perencanaan
 * Ambil STA data by project_id and type
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const type = searchParams.get('type') || 'perencanaan';

    if (!projectId) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 });
    }

    const table = type === 'pelaksanaan'
      ? 'rap_sta_pelaksanaan'
      : 'rap_sta_perencanaan';

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('project_id', projectId)
      .order('sta_index', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/rap/sta
 * Batch insert/update STA data
 * Body: { project_id, type, stas: Array<STA data> }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { project_id, type = 'perencanaan', stas } = body;

    if (!project_id || !stas || !Array.isArray(stas)) {
      return NextResponse.json(
        { error: 'project_id and stas array required' },
        { status: 400 }
      );
    }

    const table = type === 'pelaksanaan'
      ? 'rap_sta_pelaksanaan'
      : 'rap_sta_perencanaan';

    // Delete existing STA data
    await supabase
      .from(table)
      .delete()
      .eq('project_id', project_id);

    // Insert new STA data
    const insertRows = stas.map((sta, idx) => ({
      project_id,
      sta_index: idx,
      sta_label: sta.sta,
      b1: sta.b1,
      b2: sta.b2,
      b3: sta.b3,
      h: sta.h,
      h_prime: sta.hPrime,
      luas: sta.luas,
      volume: sta.volume || 0,
      jarak: sta.jarak || 0,
      is_sta0: idx === 0
    }));

    const { data, error } = await supabase
      .from(table)
      .insert(insertRows)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
