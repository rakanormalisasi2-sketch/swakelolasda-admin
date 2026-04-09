'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            const { data: prof } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            setProfile(prof);
          } else {
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) setLoading(false);
      }
    }
    
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return; // already handled by getSession
      
      if (session?.user) {
        setUser(session.user);
        try {
          const { data: prof } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfile(prof);
        } catch (e) {
          console.error('Error fetching profile:', e);
        }
        setLoading(false);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
