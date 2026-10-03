"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";

function DashboardHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <header className="border-b border-line bg-ink text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-waypoint font-display text-sm font-bold text-ink"
          >
            W
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            WonderPath
          </span>
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <span className="text-sm text-white/70">{user.email}</span>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            className="btn-tactile rounded-lg border border-white/25 px-3 py-1.5 text-sm font-medium text-white"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center bg-fog">
        <p className="text-sm text-ink-soft">Loading…</p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-fog">
      <DashboardHeader />
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {children}
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
