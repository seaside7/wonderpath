"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChildProfile,
  startLearningSession,
} from "@/lib/api";

const SUBJECT_OPTIONS = ["Mathematics", "English"];

export default function KidTopicPicker({ child }: { child: ChildProfile }) {
  const router = useRouter();
  const [curriculum, setCurriculum] = useState(child.curricula[0] ?? "");
  const [subject, setSubject] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  async function handleStart() {
    if (!curriculum || !subject || starting) return;
    setStarting(true);
    setError(null);
    try {
      const session = await startLearningSession({
        childId: child.id,
        curriculum,
        subject,
      });
      router.push(`/learn/${child.id}/session/${session.id}`);
    } catch {
      setError("Could not start. Please try again.");
      setStarting(false);
    }
  }

  return (
    <div>
      {child.curricula.length > 1 ? (
        <div>
          <p className="font-display text-xl text-ink">Pick a path</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {child.curricula.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCurriculum(option)}
                aria-pressed={curriculum === option}
                className={`btn-tactile min-h-16 rounded-2xl border-2 px-4 py-4 font-display text-xl ${
                  curriculum === option
                    ? "border-coral bg-coral/10 text-ink"
                    : "border-line bg-card text-ink"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-6 font-display text-xl text-ink">
        What do you want to practice?
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {SUBJECT_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSubject(option)}
            aria-pressed={subject === option}
            className={`btn-tactile min-h-16 rounded-2xl border-2 px-4 py-4 font-display text-xl ${
              subject === option
                ? "border-coral bg-coral/10 text-ink"
                : "border-line bg-card text-ink"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleStart()}
        disabled={!curriculum || !subject || starting}
        className="btn-tactile btn-primary mt-6 w-full rounded-2xl px-4 py-4 font-display text-xl font-semibold disabled:opacity-60"
      >
        {starting ? "Starting…" : "Let's go!"}
      </button>
    </div>
  );
}
