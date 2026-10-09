"use client";

import {
  clearStoredToken,
  fetchParentProfile,
  getStoredToken,
  ParentProfile,
  storeToken,
  UNAUTHORIZED_EVENT,
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
  // Always starts "loading" on both server and client - the server can
  // never know whether a token exists in the browser's localStorage, so
  // branching the initial value on it here caused a hydration mismatch
  // (server always rendered "unauthenticated", client's first render
  // already saw the token and rendered "loading" instead).
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<ParentProfile | null>(null);

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      setStatus("unauthenticated");
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

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const authenticate = useCallback(async (token: string) => {
    storeToken(token);
    try {
      const profile = await fetchParentProfile();
      setUser(profile);
      setStatus("authenticated");
    } catch (error) {
      clearStoredToken();
      setUser(null);
      setStatus("unauthenticated");
      throw error;
    }
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
      setStatus("unauthenticated");
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () =>
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
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