'use client';
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

const AUTH_TIMEOUT = 8000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const resolved = useRef(false);

  const finishLoading = () => {
    if (!resolved.current) {
      resolved.current = true;
      setLoading(false);
    }
  };

  useEffect(() => {
    // SAFETY: absolute maximum wait, then kick to login
    const safetyTimer = setTimeout(() => {
      if (!resolved.current) {
        console.warn('[Auth] Timeout – redirecting to login');
        setUser(null);
        setProfile(null);
        finishLoading();
      }
    }, AUTH_TIMEOUT);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (resolved.current) return;

        if (session?.user) {
          // Fetch profile FIRST, then set user+profile TOGETHER
          try {
            const { data: prof } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (!resolved.current) {
              setUser(session.user);
              setProfile(prof);
              finishLoading();
            }
          } catch (err) {
            console.error('[Auth] Profile fetch failed:', err);
            if (!resolved.current) {
              setUser(null);
              setProfile(null);
              finishLoading();
            }
          }
        } else {
          setUser(null);
          setProfile(null);
          finishLoading();
        }
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    resolved.current = false;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
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
