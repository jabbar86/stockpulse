'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

/** Wall-clock session cap from first sign-in / session detection in this browser. */
const SESSION_MAX_MS = 6 * 60 * 60 * 1000;
const SESSION_START_KEY_PREFIX = 'sa_auth_session_start_';

function sessionStartKey(userId: string) {
  return `${SESSION_START_KEY_PREFIX}${userId}`;
}

function clearSessionStartForUser(userId: string) {
  localStorage.removeItem(sessionStartKey(userId));
}

interface UserProfile {
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const lastUserIdRef = useRef<string | null>(null);

  const handleSignOut = useCallback(async () => {
    const uid = lastUserIdRef.current;
    if (uid) clearSessionStartForUser(uid);
    lastUserIdRef.current = null;
    await createClient().auth.signOut();
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: initialUser } }) => {
      setUser(initialUser);
      if (initialUser) {
        lastUserIdRef.current = initialUser.id;
        const key = sessionStartKey(initialUser.id);
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, String(Date.now()));
        }
        fetchProfile(initialUser.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;

      if (event === 'SIGNED_OUT') {
        const uid = lastUserIdRef.current;
        if (uid) clearSessionStartForUser(uid);
      }

      if (currentUser) {
        lastUserIdRef.current = currentUser.id;
        if (event === 'SIGNED_IN') {
          localStorage.setItem(sessionStartKey(currentUser.id), String(Date.now()));
        } else if (event === 'INITIAL_SESSION') {
          const key = sessionStartKey(currentUser.id);
          if (!localStorage.getItem(key)) {
            localStorage.setItem(key, String(Date.now()));
          }
        }
      } else {
        lastUserIdRef.current = null;
      }

      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;

    const checkSessionExpiry = () => {
      const raw = localStorage.getItem(sessionStartKey(user.id));
      if (!raw) return;
      if (Date.now() - Number(raw) >= SESSION_MAX_MS) {
        void handleSignOut();
      }
    };

    checkSessionExpiry();
    const intervalId = window.setInterval(checkSessionExpiry, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkSessionExpiry();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, handleSignOut]);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setProfile(data);
    } else {
      // Profile not created yet (trigger may be delayed) — use auth metadata as fallback
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setProfile({
          name: authUser.user_metadata?.name || '',
          email: authUser.email || '',
        });
      }
    }
  }

  async function handleRefreshProfile() {
    if (user) {
      await fetchProfile(user.id);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signOut: handleSignOut, refreshProfile: handleRefreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Default export for backward compat with dashboard layout import
export default function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
