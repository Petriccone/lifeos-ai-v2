'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, ApiError, TOKEN_STORAGE_KEY } from './api';
import type { User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
}

const PUBLIC_PATHS = ['/login', '/register'];

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  // Hydrate user from stored token on mount
  useEffect(() => {
    let cancelled = false;

    const hydrate = async (): Promise<void> => {
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }
      const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const me = await api.auth.me();
        if (!cancelled) setUser(me);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setStoredToken(null);
        }
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  // Redirect unauthenticated users to /login (except on public paths)
  useEffect(() => {
    if (loading) return;
    if (!pathname) return;
    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!user && !isPublic) {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const res = await api.auth.login({ email, password });
      setStoredToken(res.access_token);
      setUser(res.user);
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string, name?: string): Promise<void> => {
      const res = await api.auth.register({ email, password, name });
      setStoredToken(res.access_token);
      setUser(res.user);
    },
    []
  );

  const logout = useCallback((): void => {
    setStoredToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
