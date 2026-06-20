import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role'); // e.g. 'seksi_normalisasi'

    let query = supabaseAdmin
      .from('priority_criteria')
      .select('id, nama_kriteria, bobot, skor_maksimal, opsi, role_scope')
      .eq('is_active', true)
      .order('urutan', { ascending: true });

    const { data, error } = await query;
    
    if (error) throw error;

    // Filter data if a role is provided, otherwise return all
    // If role_scope is null, it means it applies to all roles
    const filteredData = data.filter(item => {
      if (!item.role_scope) return true; // applies to all
      if (role && item.role_scope === role) return true;
      return false;
    });

    return NextResponse.json({ success: true, data: filteredData });
  } catch (error) {
    console.error('Fetch criteria error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
