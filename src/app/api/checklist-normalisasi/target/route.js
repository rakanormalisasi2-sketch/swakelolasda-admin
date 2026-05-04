import { NextResponse } from 'next/server';
import { supabaseBBM } from '@/lib/supabase-bbm';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get('tahun') || new Date().getFullYear();

    const { data, error } = await supabaseBBM
      .from('target_tahunan')
      .select('*')
      .eq('tahun', tahun)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json(data || null);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { tahun, target_panjang_normalisasi, target_lokasi_embung } = body;
    
    if (!tahun) return NextResponse.json({ error: 'Tahun is required' }, { status: 400 });

    // Check if exists
    const { data: existing } = await supabaseBBM
      .from('target_tahunan')
      .select('id')
      .eq('tahun', tahun)
      .maybeSingle();

    let result;
    if (existing) {
      result = await supabaseBBM
        .from('target_tahunan')
        .update({ 
          target_panjang_normalisasi: target_panjang_normalisasi ?? undefined,
          target_lokasi_embung: target_lokasi_embung ?? undefined,
          updated_at: new Date().toISOString() 
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabaseBBM
        .from('target_tahunan')
        .insert({ tahun, target_panjang_normalisasi, target_lokasi_embung })
        .select()
        .single();
    }

    if (result.error) throw result.error;
    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
