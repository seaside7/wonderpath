"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchParentProfile, verifyParentPin } from "@/lib/api";
import {
  clearChildModeChildId,
  getChildModeChildId,
} from "@/lib/child-mode";
import PinEntry from "@/components/child-mode/pin-entry";

function KidHeader({ onLock }: { onLock: () => void }) {
  return (
    <header className="border-b border-line bg-ink text-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-waypoint font-display text-sm font-bold text-ink"
          >
            W
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            WonderPath
          </span>
        </span>
        <button
          type="button"
          onClick={onLock}
          aria-label="Parent lock"
          className="btn-tactile flex items-center gap-1.5 rounded-lg border border-white/25 px-3 py-1.5 text-sm font-medium text-white"
        >
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Parent
        </button>
      </div>
    </header>
  );
}

export default function KidLayout({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinAttempt, setPinAttempt] = useState(0);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (!getChildModeChildId()) {
      router.replace("/dashboard");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetchParentProfile()
      .then((profile) => {
        if (!cancelled) setHasPin(profile.hasPin);
      })
      .catch(() => {
        // Fails closed: if we can't confirm, treat as "a PIN exists" so the
        // lock icon still asks for one rather than silently letting anyone
        // through on a network hiccup.
        if (!cancelled) setHasPin(true);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  function handleLockTap() {
    if (hasPin === false) {
      // No PIN has ever been set - there's nothing to check against, and
      // verifyParentPin would always return {valid: false} for every
      // attempt, making this a permanent dead-end otherwise. Mirrors
      // ProfilePicker's handleParentCard, which skips the PIN the same way.
      clearChildModeChildId();
      router.push("/dashboard");
      return;
    }
    setShowPin(true);
  }

  async function handlePinComplete(pin: string) {
    setVerifying(true);
    setPinError(null);
    try {
      const result = await verifyParentPin(pin);
      if (!result.valid) {
        setPinError("That PIN didn't match. Try again.");
        setPinAttempt((attempt) => attempt + 1);
        setVerifying(false);
        return;
      }
      clearChildModeChildId();
      router.push("/dashboard");
    } catch {
      setPinError("Could not check the PIN. Please try again.");
      setPinAttempt((attempt) => attempt + 1);
      setVerifying(false);
    }
  }

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
      <KidHeader onLock={handleLockTap} />
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {children}
      </div>
      {showPin ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Parent PIN"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-6"
        >
          <div className="w-full max-w-sm bg-card px-6 py-6">
            <PinEntry
              key={pinAttempt}
              onComplete={(pin) => void handlePinComplete(pin)}
              error={pinError}
              submitting={verifying}
            />
            <button
              type="button"
              onClick={() => setShowPin(false)}
              className="btn-tactile mt-4 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
