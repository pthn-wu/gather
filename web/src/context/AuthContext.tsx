import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getMe, login as apiLogin } from '../api/endpoints';
import { getToken, setToken, setUnauthorizedHandler } from '../api/client';
import type { Community, User } from '../api/types';

interface AuthContextValue {
  user: User | null;
  community: Community | null;
  mustSetPassword: boolean;
  loading: boolean;
  /** Set once the resident picks a property on Home, before they've signed in. */
  pendingCommunity: Community | null;
  setPendingCommunity: (c: Community | null) => void;
  signIn: (username: string, password: string) => Promise<{ mustSetPassword: boolean }>;
  signOut: () => void;
  refreshMe: () => Promise<void>;
  setMustSetPassword: (v: boolean) => void;
  applyUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [mustSetPassword, setMustSetPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingCommunity, setPendingCommunity] = useState<Community | null>(null);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    setCommunity(null);
    setMustSetPassword(false);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
  }, [signOut]);

  const refreshMe = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    try {
      const res = await getMe();
      setUser(res.user);
      setCommunity(res.community);
    } catch {
      // token invalid/expired or server unreachable — treat as signed out
      setToken(null);
      setUser(null);
      setCommunity(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const res = await apiLogin(username, password);
    setToken(res.token);
    setUser(res.user);
    setMustSetPassword(res.mustSetPassword);
    // Fetch the full community record (contract's login response only
    // guarantees `user`; /auth/me gives us the resident-scoped community).
    try {
      const me = await getMe();
      setCommunity(me.community);
    } catch {
      // non-fatal — community details will refresh on next screen load
    }
    return { mustSetPassword: res.mustSetPassword };
  }, []);

  const applyUser = useCallback((u: User) => setUser(u), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      community,
      mustSetPassword,
      loading,
      pendingCommunity,
      setPendingCommunity,
      signIn,
      signOut,
      refreshMe,
      setMustSetPassword,
      applyUser,
    }),
    [user, community, mustSetPassword, loading, pendingCommunity, signIn, signOut, refreshMe, applyUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
