'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RootPage() {
  const router = useRouter();
  useEffect(() => {
    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data?.session) {
          router.replace('/login');
          return;
        }
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', data.session.user.id)
          .single();
          
        const role = profile?.role;
        if (role === 'superadmin') router.replace('/dashboard/superadmin');
        else if (role === 'peralatan') router.replace('/dashboard/peralatan');
        else if (role === 'operator') router.replace('/dashboard/operator');
        else router.replace('/dashboard/seksi');
      } catch (err) {
        console.error('Root initialization error:', err);
        router.replace('/login');
      }
    };
    init();
  }, [router]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#1a56db', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}
