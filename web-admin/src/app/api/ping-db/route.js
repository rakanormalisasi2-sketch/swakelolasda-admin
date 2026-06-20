import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseBBM } from '@/lib/supabase-bbm'; // DB2

export async function GET() {
  try {
    // Ping DB1
    const { error: err1 } = await supabase.from('section_settings').select('id').limit(1);
    if (err1) throw err1;

    // Ping DB2
    const { error: err2 } = await supabaseBBM.from('bbm_penerimaan').select('id').limit(1);
    if (err2) throw err2;

    return NextResponse.json({ 
      status: 'ok', 
      message: 'DB1 & DB2 pinged successfully',
      time: new Date().toISOString() 
    });
  } catch (error) {
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
