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
    <section>
      <h1 className="font-display text-4xl text-ink">Who&apos;s learning?</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Pick a profile to continue.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children.map((child) => (
          <li key={child.id}>
            <button
              type="button"
              onClick={() => handleSelectChild(child)}
              className="btn-tactile flex w-full flex-col items-center gap-3 border-l-2 border-waypoint bg-card px-6 py-8"
            >
              <span
                aria-hidden="true"
                className={`flex h-16 w-16 items-center justify-center rounded-full font-display text-2xl font-bold text-white ${avatarColor(child.fullName)}`}
              >
                {child.fullName.charAt(0).toUpperCase()}
              </span>
              <span className="font-display text-2xl text-ink">
                {child.nickname?.trim() ? child.nickname : child.fullName}
              </span>
              <span className="text-sm text-ink-soft">{child.grade}</span>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={handleParentCard}
            className="btn-tactile flex w-full flex-col items-center gap-3 border-l-2 border-line bg-card px-6 py-8"
          >
            <span
              aria-hidden="true"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-ink font-display text-2xl font-bold text-white"
            >
              P
            </span>
            <span className="font-display text-2xl text-ink">Parent</span>
            <span className="text-sm text-ink-soft">
              {hasPin ? "Enter PIN to manage" : "Manage profiles"}
            </span>
          </button>
        </li>
      </ul>

      {showPin ? (
        <div className="mt-8 border-l-2 border-waypoint bg-card px-6 py-6">
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
