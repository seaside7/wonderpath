"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChildProfile,
  fetchParentProfile,
  listChildren,
  verifyParentPin,
} from "@/lib/api";
import { clearChildModeChildId, setChildModeChildId } from "@/lib/child-mode";
import { avatarColor } from "@/lib/format";
import PinEntry from "./pin-entry";

type Status = "loading" | "ready" | "error";

export default function ProfilePicker() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [hasPin, setHasPin] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinAttempt, setPinAttempt] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [profiles, parent] = await Promise.all([
          listChildren(),
          fetchParentProfile(),
        ]);
        if (cancelled) return;
        setChildren(profiles);
        setHasPin(parent.hasPin);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setError("Could not load profiles. Please try again.");
        setStatus("error");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelectChild(child: ChildProfile) {
    setChildModeChildId(child.id);
    router.push(`/learn/${child.id}`);
  }

  function handleParentCard() {
    // Tapping "Parent" always means "stop being a child," whether or not a
    // PIN challenge follows - without this, the (dashboard) route guard
    // (see its layout.tsx) would immediately bounce this navigation back
    // here, since it treats a lingering childModeChildId as "still a child."
    clearChildModeChildId();
    if (!hasPin) {
      router.push("/dashboard/manage?setupPin=1");
      return;
    }
    setPinError(null);
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
      // A correct PIN always exits child mode, regardless of which screen
      // prompted for it - otherwise the (dashboard) route guard (see
      // layout.tsx) would immediately bounce this navigation back here,
      // since it treats a lingering childModeChildId as "still a child."
      clearChildModeChildId();
      router.push("/dashboard/manage");
    } catch {
      setPinError("Could not check the PIN. Please try again.");
      setPinAttempt((attempt) => attempt + 1);
      setVerifying(false);
    }
  }

  if (status === "loading") {
    return <p className="text-sm text-ink-soft">Loading…</p>;
  }

  if (status === "error") {
    return (
      <p className="rounded-lg bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
        {error ?? "Something went wrong."}
      </p>
    );
  }

  return (
    <section className="flex flex-1 flex-col items-center justify-center text-center">
      <h1 className="font-display text-5xl text-ink">
        Who&apos;s learning today?
      </h1>
      <p className="mt-3 max-w-md text-base text-ink-soft">
        Pick a stop on the path to begin.
      </p>

      <ul className="mt-12 flex flex-wrap items-start justify-center gap-6">
        {children.map((child) => {
          const label = child.nickname?.trim() ? child.nickname : child.fullName;
          return (
            <li key={child.id}>
              <button
                type="button"
                onClick={() => handleSelectChild(child)}
                className="btn-tactile group flex w-52 flex-col items-center gap-4 rounded-2xl bg-card px-6 py-9 shadow-[0_1px_2px_rgba(46,42,92,0.06)] transition-shadow hover:shadow-[0_8px_24px_rgba(46,42,92,0.12)]"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-20 w-20 items-center justify-center rounded-full font-display text-3xl font-bold text-white ${avatarColor(child.fullName)}`}
                >
                  {label.charAt(0).toUpperCase()}
                </span>
                <span className="flex flex-col items-center gap-1">
                  <span className="font-display text-2xl text-ink">
                    {label}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-waypoint"
                    />
                    {child.grade}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={handleParentCard}
        className="btn-tactile group mt-14 inline-flex items-center gap-2.5 rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-ink-soft hover:text-ink"
      >
        <svg
          aria-hidden="true"
          width="15"
          height="15"
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
        {hasPin ? "Parent · enter PIN" : "Parent"}
      </button>

      {showPin ? (
        <div className="mt-6 w-full max-w-sm rounded-2xl bg-card px-6 py-6 text-left shadow-[0_8px_24px_rgba(46,42,92,0.12)]">
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
      ) : null}
    </section>
  );
}
