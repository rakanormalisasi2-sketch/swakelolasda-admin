'use client';
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const initialDone = useRef(false);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    // Safety timeout: if initial load takes > 8s, stop loading and go to login
    const safetyTimer = setTimeout(() => {
      if (!initialDone.current) {
        initialDone.current = true;
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Handle ALL events (INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
        if (session?.user) {
          const prof = await fetchProfile(session.user.id);
          setUser(session.user);
          setProfile(prof);
        } else {
          setUser(null);
          setProfile(null);
        }

        // Mark initial load complete (first event received)
        if (!initialDone.current) {
          initialDone.current = true;
          setLoading(false);
          clearTimeout(safetyTimer);
        }
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
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
