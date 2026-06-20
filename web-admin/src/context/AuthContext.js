'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ---- Helper: fetch profile from DB ----
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

  // ---- LOGIN: called directly by login page ----
  // This is the ONLY way to log in. AuthContext does NOT listen for SIGNED_IN.
  // This ensures user+profile are set BEFORE any navigation happens.
  const login = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const prof = await fetchProfile(data.user.id);
    setUser(data.user);
    setProfile(prof);
    return prof?.role;
  }, [fetchProfile]);

  // ---- LOGOUT ----
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.replace('/login');
  }, [router]);

  // ---- SESSION RECOVERY (page refresh / first visit) ----
  useEffect(() => {
    let cancelled = false;

    // SPEED: Check if there's ANY supabase token in localStorage.
    // If not, the user is definitely not logged in → skip loading instantly.
    let hasToken = false;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          hasToken = true;
          break;
        }
      }
    } catch {}

    if (!hasToken) {
      // Not logged in → show login page immediately (no loading screen)
      setLoading(false);
    } else {
      // Has token → validate it immediately. If stale, clear it.
      supabase.auth.getSession().then(({ data, error }) => {
        if (error || !data?.session) {
          // Token is invalid/expired - clean up
          try { localStorage.removeItem(`sb-ratmptlcrjifuplokask-auth-token`); } catch {}
          if (!cancelled) {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        } else if (data.session) {
          // Valid session - fetch profile
          fetchProfile(data.session.user.id).then(prof => {
            if (!cancelled) {
              setUser(data.session.user);
              setProfile(prof);
              setLoading(false);
            }
          }).catch(() => {
            if (!cancelled) setLoading(false);
          });
        } else {
          if (!cancelled) setLoading(false);
        }
      }).catch((err) => {
        // Handle refresh token errors gracefully
        console.warn('Session validation failed:', err?.message);
        try { localStorage.removeItem(`sb-ratmptlcrjifuplokask-auth-token`); } catch {}
        if (!cancelled) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      });
    }

    // Use onAuthStateChange ONLY for INITIAL_SESSION (session recovery on refresh)
    // and SIGNED_OUT (e.g. session expired, or logout from another tab).
    // SIGNED_IN is handled by login() method above.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;

        if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            const prof = await fetchProfile(session.user.id);
            if (!cancelled) {
              setUser(session.user);
              setProfile(prof);
            }
          }
          if (!cancelled) setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user); // just update user token, profile unchanged
        }
        // SIGNED_IN → intentionally NOT handled here (login() handles it)
      }
    );

    // Safety: if nothing happens in 8 seconds, force loading off
    const timer = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
