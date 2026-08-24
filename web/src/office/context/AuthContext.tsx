import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  api,
  ApiError,
  clearSession,
  getStoredAdmin,
  OfflineError,
  setMemoryToken,
  setSession,
} from "../api/client";
import type { AdminRole, AdminUser } from "../api/types";

export type Phase = "home" | "auth" | "app";

interface AuthContextValue {
  phase: Phase;
  admin: AdminUser | null;
  /** The console currently being viewed — always one the token allows. */
  role: AdminRole;
  /** Roles this token may switch between (CONTRACT.md §1: role comes from the admin). */
  allowedRoles: AdminRole[];
  setRole: (r: AdminRole) => void;

  authRole: AdminRole;
  authCommunityId: string;
  setAuthCommunityId: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  error: string;
  remember: boolean;
  toggleRemember: () => void;
  busy: boolean;

  goHome: () => void;
  pickConsole: (r: AdminRole) => void;
  signIn: () => Promise<boolean>;
  signOut: () => void;
  fillDemo: () => void;
}

const DEMO: Record<AdminRole, { user: string; pw: string }> = {
  office: { user: "gems1.office", pw: "office-2026" },
  retail: { user: "ye.naing@capitalretail.mm", pw: "retail-2026" },
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = getStoredAdmin();
  const [admin, setAdmin] = useState<AdminUser | null>(stored);
  const [phase, setPhase] = useState<Phase>(stored ? "app" : "home");
  const [role, setRoleState] = useState<AdminRole>(stored?.role ?? "retail");

  const [authRole, setAuthRole] = useState<AdminRole>("office");
  const [authCommunityId, setAuthCommunityId] = useState("G1");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  const allowedRoles = useMemo<AdminRole[]>(
    () => (admin?.roles?.length ? admin.roles : admin ? [admin.role] : ["retail"]),
    [admin]
  );

  /** Hard rule (b): an office login can never land on a retail screen. */
  const setRole = useCallback(
    (r: AdminRole) => {
      if (allowedRoles.includes(r)) setRoleState(r);
    },
    [allowedRoles]
  );

  const pickConsole = useCallback((r: AdminRole) => {
    setAuthRole(r);
    setUsername("");
    setPassword("");
    setError("");
    setPhase("auth");
  }, []);

  const goHome = useCallback(() => {
    setPhase("home");
    setError("");
    setPassword("");
  }, []);

  const signIn = useCallback(async (): Promise<boolean> => {
    if (!username.trim() || !password.trim()) {
      setError("Enter both your username and password.");
      return false;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api.login(
        username.trim(),
        password,
        authRole === "office" ? authCommunityId : undefined
      );
      setMemoryToken(res.token);
      setSession(res.token, res.admin, remember);
      setAdmin(res.admin);
      setRoleState(res.admin.role);
      setPhase("app");
      setPassword("");
      return true;
    } catch (e) {
      if (e instanceof OfflineError) {
        // API not up yet — sign in locally so the console can still be walked.
        const local: AdminUser = {
          id: "local",
          role: authRole,
          communityId: authRole === "office" ? authCommunityId : null,
          communityLabel: authRole === "office" ? authCommunityId : null,
          displayName: authRole === "retail" ? "Ye Naing · Capital Retail" : "Daw Moe · Gems 1 office",
          username: username.trim(),
          email: authRole === "retail" ? username.trim() : null,
        };
        setAdmin(local);
        setRoleState(authRole);
        setPhase("app");
        setPassword("");
        return true;
      }
      setError(e instanceof ApiError ? e.message : "Sign-in failed. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [username, password, authRole, authCommunityId, remember]);

  const signOut = useCallback(() => {
    clearSession();
    setMemoryToken(null);
    setAdmin(null);
    setUsername("");
    setPassword("");
    setError("");
    setPhase("home");
  }, []);

  const fillDemo = useCallback(() => {
    setUsername(DEMO[authRole].user);
    setPassword(DEMO[authRole].pw);
    setError("");
  }, [authRole]);

  const value = useMemo<AuthContextValue>(
    () => ({
      phase, admin, role, allowedRoles, setRole,
      authRole, authCommunityId, setAuthCommunityId,
      username,
      setUsername: (v: string) => {
        setUsername(v);
        setError("");
      },
      password,
      setPassword: (v: string) => {
        setPassword(v);
        setError("");
      },
      error, remember,
      toggleRemember: () => setRemember((r) => !r),
      busy, goHome, pickConsole, signIn, signOut, fillDemo,
    }),
    [
      phase, admin, role, allowedRoles, setRole, authRole, authCommunityId, username, password,
      error, remember, busy, goHome, pickConsole, signIn, signOut, fillDemo,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
