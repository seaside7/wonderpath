"use client";

import { useEffect, useState } from "react";
import {
  fetchParentProfile,
  setParentPin,
} from "@/lib/api";
import PinEntry from "@/components/child-mode/pin-entry";

type Status = "loading" | "ready" | "error";

export default function PinSetupForm() {
  const [status, setStatus] = useState<Status>("loading");
  const [hasPin, setHasPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinAttempt, setPinAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchParentProfile()
      .then((profile) => {
        if (cancelled) return;
        setHasPin(profile.hasPin);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not load your profile. Please try again.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePinComplete(pin: string) {
    setSaving(true);
    setPinError(null);
    try {
      const profile = await setParentPin(pin);
      setHasPin(profile.hasPin);
      setSaved(true);
      setPinAttempt((attempt) => attempt + 1);
    } catch {
      setPinError("Could not save the PIN. Please try again.");
      setPinAttempt((attempt) => attempt + 1);
    } finally {
      setSaving(false);
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
    <div className="border-l-2 border-waypoint bg-card px-6 py-6">
      <h1 className="font-display text-2xl text-ink">
        {hasPin ? "Change your PIN" : "Set a parent PIN"}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {hasPin
          ? "Enter a new 4-digit PIN. It takes effect right away."
          : "A 4-digit PIN locks the parent area on this device."}
      </p>
      {saved ? (
        <p className="mt-4 rounded-lg bg-trail/15 px-3.5 py-2.5 text-sm text-trail-deep">
          PIN saved. The parent area is now locked behind it.
        </p>
      ) : null}
      <div className="mt-5">
        <PinEntry
          key={pinAttempt}
          onComplete={(pin) => void handlePinComplete(pin)}
          error={pinError}
          label={hasPin ? "Enter a new 4-digit PIN" : "Choose a 4-digit PIN"}
          submitting={saving}
        />
      </div>
    </div>
  );
}
