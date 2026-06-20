import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request) {
  try {
    const dataList = await request.json();
    
    if (!Array.isArray(dataList) || dataList.length === 0) {
      return NextResponse.json({ error: 'Data must be a non-empty array' }, { status: 400 });
    }

    const tahun = dataList[0].tahun || new Date().getFullYear();
    const role = dataList[0].created_by_role;

    let q = supabaseAdmin.from('proposals').select('nomor_urut').eq('tahun', tahun);
    if (role) q = q.eq('created_by_role', role);

    const { data: existingData, error: err } = await q;
    if (err) throw err;

    let maxUrut = 0;
    if (existingData && existingData.length > 0) {
      maxUrut = Math.max(...existingData.map(d => d.nomor_urut || 0));
    }

    const toInsert = dataList.map((item, idx) => ({
      ...item,
      nomor_urut: maxUrut + idx + 1
    }));

    const { data, error } = await supabaseAdmin
      .from('proposals')
      .insert(toInsert)
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, count: data.length, data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
