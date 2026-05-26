import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET - List proposals by tahun and role
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get('tahun') || new Date().getFullYear();
    const role = searchParams.get('role');

    let query = supabaseAdmin
      .from('proposals')
      .select('*')
      .eq('tahun', tahun)
      .order('nomor_urut', { ascending: true })
      .order('created_at', { ascending: true });

    if (role) {
      query = query.eq('created_by_role', role);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Insert new proposal with auto-increment nomor_urut if missing
export async function POST(request) {
  try {
    const body = await request.json();
    const tahun = body.tahun || new Date().getFullYear();
    const role = body.created_by_role;

    // Auto-generate nomor_urut if not provided
    if (!body.nomor_urut) {
      let q = supabaseAdmin
        .from('proposals')
        .select('nomor_urut')
        .eq('tahun', tahun);
      
      if (role) q = q.eq('created_by_role', role);

      const { data: existingData, error: err } = await q;
      
      if (err) throw err;

      let maxUrut = 0;
      if (existingData && existingData.length > 0) {
        maxUrut = Math.max(...existingData.map(d => d.nomor_urut || 0));
      }
      body.nomor_urut = maxUrut + 1;
    }

    const { data, error } = await supabaseAdmin
      .from('proposals')
      .insert({ ...body, tahun })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update proposal (any field)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // Auto-set tanggal_survey when marking as surveyed
    if (updates.sudah_survey === true && !updates.tanggal_survey) {
      updates.tanggal_survey = new Date().toISOString().split('T')[0];
    }
    if (updates.sudah_survey === false) {
      updates.tanggal_survey = null;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('proposals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    if (updates.is_rejected_priority === true) {
      await supabaseAdmin.from('work_schedules').delete().eq('proposal_id', id);
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove proposal (batch or single)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids'); 

    if (ids) {
      const idList = ids.split(',');
      const { error } = await supabaseAdmin
        .from('proposals')
        .delete()
        .in('id', idList);
      if (error) throw error;
      return NextResponse.json({ success: true, deleted: idList.length });
    }

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('proposals')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
