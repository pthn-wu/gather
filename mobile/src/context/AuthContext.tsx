import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, loadToken, setUnauthorizedHandler } from "../api/client";
import * as api from "../api/endpoints";
import type { Community, User } from "../api/types";

type Phase = "loading" | "picker" | "signin" | "setup" | "app";

interface AuthValue {
  phase: Phase;
  user: User | null;
  community: Community | null;
  communities: Community[];
  /** The community chosen on the picker, before sign-in. */
  pending: Community | null;
  pickCommunity: (c: Community) => void;
  backToPicker: () => void;
  signIn: (username: string, password: string) => Promise<void>;
  completeSetup: (u: User) => void;
  skipSetup: () => void;
  signOut: () => void;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [pending, setPending] = useState<Community | null>(null);

  const loadCommunities = useCallback(async () => {
    try {
      setCommunities(await api.getCommunities());
    } catch {
      setCommunities([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    const me = await api.getMe();
    setUser(me.user);
    setCommunity(me.community);
  }, []);

  /* Resume a stored session if the token still works, otherwise start at the picker. */
  useEffect(() => {
    let alive = true;
    (async () => {
      await loadCommunities();
      const token = await loadToken();
      if (!token) {
        if (alive) setPhase("picker");
        return;
      }
      try {
        const me = await api.getMe();
        if (!alive) return;
        setUser(me.user);
        setCommunity(me.community);
        setPhase(me.user.mustSetPassword ? "setup" : "app");
      } catch {
        await clearToken();
        if (alive) setPhase("picker");
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadCommunities]);

  /* A 401 anywhere drops straight back to sign-in. */
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setPhase("picker");
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      phase,
      user,
      community,
      communities,
      pending,
      pickCommunity: (c) => {
        setPending(c);
        setPhase("signin");
      },
      backToPicker: () => {
        setPending(null);
        setPhase("picker");
      },
      signIn: async (username, password) => {
        const res = await api.login(username, password);
        setUser(res.user);
        const me = await api.getMe();
        setCommunity(me.community);
        setPhase(res.mustSetPassword ? "setup" : "app");
      },
      completeSetup: (u) => {
        setUser(u);
        setPhase("app");
      },
      skipSetup: () => setPhase("app"),
      signOut: () => {
        void clearToken();
        setUser(null);
        setCommunity(null);
        setPending(null);
        setPhase("picker");
      },
      refresh,
      setUser,
    }),
    [phase, user, community, communities, pending, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
