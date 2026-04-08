'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return; }
      supabase.from('user_profiles').select('role').eq('id', session.user.id).single().then(({ data }) => {
        const role = data?.role;
        if (role === 'superadmin') router.replace('/dashboard/superadmin');
        else if (role === 'peralatan') router.replace('/dashboard/peralatan');
        else if (role === 'operator') router.replace('/dashboard/operator');
        else router.replace('/dashboard/seksi');
      });
    });
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#1a56db', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}
