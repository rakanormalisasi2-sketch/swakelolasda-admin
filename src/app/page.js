'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RootPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  
  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      router.replace('/login');
      return;
    }
    
    const role = profile?.role;
    if (role === 'superadmin') router.replace('/dashboard/superadmin');
    else if (role === 'peralatan') router.replace('/dashboard/peralatan');
    else if (role === 'operator') router.replace('/dashboard/operator');
    else router.replace('/dashboard/seksi');
  }, [user, profile, loading, router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="spinner-border" style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#1a56db', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}
