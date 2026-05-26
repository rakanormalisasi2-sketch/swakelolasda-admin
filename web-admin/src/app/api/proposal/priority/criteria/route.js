import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET all criteria
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let query = supabaseAdmin
      .from('priority_criteria')
      .select('*')
      .eq('is_active', true)
      .order('urutan', { ascending: true });
      
    if (role) {
      query = query.or(`role_scope.is.null,role_scope.eq.${role}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create criteria
export async function POST(request) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabaseAdmin
      .from('priority_criteria')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update criteria
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('priority_criteria')
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
