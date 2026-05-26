import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET - Get schedules for a specific year
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get('tahun') || new Date().getFullYear();
    const role = searchParams.get('role');

    // Join with heavy_equipment, proposals, assignments
    let query = supabaseAdmin
      .from('work_schedules')
      .select(`
        *,
        equipment:equipments (id, nama_alat),
        proposal:proposals (id, nama_usulan, nomor_urut, prioritas:proposal_scores(criteria_id, skor)),
        assignment:assignments (id, status, operator_id)
      `)
      .eq('tahun', tahun)
      .order('equipment_id', { ascending: true })
      .order('minggu_mulai', { ascending: true, nullsFirst: false });

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

// POST - Create schedule (from priority tab or brand new)
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, ...payload } = body;
    
    // Action: carry-forward
    if (action === 'carry-forward') {
      const { id, to_year } = payload;
      // Get existing
      const { data: existing } = await supabaseAdmin.from('work_schedules').select('*').eq('id', id).single();
      if (!existing) throw new Error('Schedule not found');
      
      delete existing.id;
      existing.tahun = to_year;
      existing.carried_from_year = existing.tahun;
      existing.minggu_mulai = null;
      existing.minggu_selesai = null;
      existing.status = 'estimasi_rencana';
      
      const { data, error } = await supabaseAdmin.from('work_schedules').insert(existing).select().single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    // Normal create
    const { data, error } = await supabaseAdmin
      .from('work_schedules')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update schedule weeks/status
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('work_schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('work_schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
