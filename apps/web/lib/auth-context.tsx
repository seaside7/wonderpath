"use client";

import {
  clearStoredToken,
  fetchParentProfile,
  getStoredToken,
  ParentProfile,
  storeToken,
} from "./api";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: ParentProfile | null;
  authenticate: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    typeof window !== "undefined" && getStoredToken()
      ? "loading"
      : "unauthenticated",
  );
  const [user, setUser] = useState<ParentProfile | null>(null);

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      return;
    }

    let cancelled = false;

    fetchParentProfile()
      .then((profile) => {
        if (cancelled) return;
        setUser(profile);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        clearStoredToken();
        setUser(null);
        setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const authenticate = useCallback(async (token: string) => {
    storeToken(token);
    const profile = await fetchParentProfile();
    setUser(profile);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ status, user, authenticate, logout }),
    [status, user, authenticate, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}