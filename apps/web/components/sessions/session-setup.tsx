"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  ChildProfile,
  getChild,
  getCurrentSession,
  LearningSession,
  startLearningSession,
} from "@/lib/api";

const SUBJECT_OPTIONS = ["Mathematics", "English"];

type Status = "loading" | "ready" | "error";

export default function SessionSetup({ childId }: { childId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [currentSession, setCurrentSession] =
    useState<LearningSession | null>(null);
  const [startedLabel, setStartedLabel] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [subject, setSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const profile = await getChild(childId);
        if (cancelled) return;
        setChild(profile);
        setCurriculum(profile.curricula[0] ?? "");

        let active: LearningSession | null = null;
        try {
          active = await getCurrentSession(childId);
        } catch (cause) {
          if (!(cause instanceof ApiError && cause.status === 404)) {
            throw cause;
          }
        }
        if (cancelled) return;
        setCurrentSession(active);
        if (active) {
          const minutesAgo = Math.max(
            0,
            Math.floor(
              (Date.now() - new Date(active.startedAt).getTime()) / 60000,
            ),
          );
          setStartedLabel(
            `Started ${minutesAgo} minute${minutesAgo === 1 ? "" : "s"} ago`,
          );
        }
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setError("Could not load this child. Please try again.");
        setStatus("error");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [childId]);

  async function handleStart() {
    if (!curriculum || !subject) return;
    setSubmitting(true);
    setError(null);

    try {
      const session = await startLearningSession({
        childId,
        curriculum,
        subject,
      });
      router.push(`/sessions/${session.id}`);
    } catch {
      setError(
        "Could not start the session. Please make sure the curriculum is supported for this child.",
      );
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return <p className="text-sm text-ink-soft">Loading…</p>;
  }

  if (status === "error" || !child) {
    return (
      <p className="rounded-lg bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
        {error ?? "Something went wrong."}
      </p>
    );
  }

  if (currentSession) {
    return (
      <div className="border-l-2 border-trail bg-card px-6 py-6">
        <h2 className="font-display text-2xl text-ink">Current session</h2>
        <p className="mt-1.5 text-sm text-ink">
          {currentSession.child.fullName} — {currentSession.curriculum}{" "}
          {currentSession.subject}
        </p>
        <p className="mt-1 text-sm text-ink-soft">{startedLabel}</p>
        <button
          type="button"
          onClick={() => router.push(`/sessions/${currentSession.id}`)}
          className="btn-tactile btn-primary resume-pulse mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          Resume
        </button>
      </div>
    );
  }

  return (
    <div className="border-l-2 border-waypoint bg-card px-6 py-6">
      <h2 className="font-display text-2xl text-ink">
        Set up a session for {child.fullName}
      </h2>
      <p className="mt-1.5 text-sm text-ink-soft">
        Only {child.fullName}&apos;s own curricula are shown.
      </p>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-ink">Curriculum</legend>
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          {child.curricula.map((option) => {
            const active = curriculum === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setCurriculum(option)}
                aria-pressed={active}
                className={
                  active
                    ? "btn-tactile rounded-full bg-ink px-4 py-2 text-sm font-medium text-white"
                    : "btn-tactile rounded-full border border-line bg-card px-4 py-2 text-sm font-medium text-ink"
                }
              >
                {option}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-ink">Subject</legend>
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          {SUBJECT_OPTIONS.map((option) => {
            const active = subject === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setSubject(option)}
                aria-pressed={active}
                className={
                  active
                    ? "btn-tactile rounded-full bg-ink px-4 py-2 text-sm font-medium text-white"
                    : "btn-tactile rounded-full border border-line bg-card px-4 py-2 text-sm font-medium text-ink"
                }
              >
                {option}
              </button>
            );
          })}
        </div>
      </fieldset>

      {error ? (
        <p className="mt-4 rounded-lg bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleStart}
        disabled={!curriculum || !subject || submitting}
        className="btn-tactile btn-primary mt-7 rounded-xl px-5 py-2.5 text-sm font-semibold"
      >
        {submitting ? "Starting…" : "Start learning"}
      </button>
    </div>
  );
}
