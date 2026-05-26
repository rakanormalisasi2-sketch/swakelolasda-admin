import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const kecamatan = searchParams.get('kecamatan');
    const desa = searchParams.get('desa');
    const nama = searchParams.get('nama_usulan');
    
    let query = supabaseAdmin
      .from('proposals')
      .select('*')
      .or('is_rejected_priority.eq.false,is_rejected_priority.is.null')
      .order('created_at', { ascending: false });

    if (role) query = query.eq('created_by_role', role);
    if (kecamatan) query = query.eq('kecamatan', kecamatan);
    if (desa) query = query.eq('desa', desa);
    if (nama) query = query.ilike('nama_usulan', `%${nama}%`);

    const { data, error } = await query.limit(50);
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
