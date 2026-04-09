'use client';
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

// Maximum time (ms) to wait for auth before giving up
const AUTH_TIMEOUT = 5000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const resolved = useRef(false);

  // Helper: mark loading as done (only once)
  const finishLoading = () => {
    if (!resolved.current) {
      resolved.current = true;
      setLoading(false);
    }
  };

  // Helper: fetch user profile from DB
  const fetchProfile = async (userId) => {
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
  };

  useEffect(() => {
    // SAFETY NET: If auth takes too long, force-finish loading.
    // This guarantees the app NEVER stays stuck on "Memuat sistem..."
    const safetyTimer = setTimeout(() => {
      if (!resolved.current) {
        console.warn('[Auth] Safety timeout reached – forcing loading to finish');
        finishLoading();
      }
    }, AUTH_TIMEOUT);

    // Use ONLY onAuthStateChange – this is Supabase's recommended approach.
    // It fires INITIAL_SESSION on mount with the cached session (or null).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          const prof = await fetchProfile(session.user.id);
          setProfile(prof);
          finishLoading();
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
