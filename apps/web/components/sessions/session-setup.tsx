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
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (status === "error" || !child) {
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {error ?? "Something went wrong."}
      </p>
    );
  }

  if (currentSession) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Current Session</h2>
        <p className="mt-1 text-sm text-zinc-600">
          {currentSession.child.fullName} — {currentSession.curriculum}{" "}
          {currentSession.subject}
        </p>
        <p className="mt-1 text-sm text-zinc-500">{startedLabel}</p>
        <button
          type="button"
          onClick={() => router.push(`/sessions/${currentSession.id}`)}
          className="mt-5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          Resume
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">
        Set up a session for {child.fullName}
      </h2>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium text-zinc-800">
          Curriculum
        </legend>
        <div className="mt-2 flex flex-col gap-2">
          {child.curricula.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 text-sm text-zinc-800"
            >
              <input
                type="radio"
                name="curriculum"
                value={option}
                checked={curriculum === option}
                onChange={() => setCurriculum(option)}
                className="text-indigo-600"
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium text-zinc-800">Subject</legend>
        <div className="mt-2 flex flex-col gap-2">
          {SUBJECT_OPTIONS.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 text-sm text-zinc-800"
            >
              <input
                type="radio"
                name="subject"
                value={option}
                checked={subject === option}
                onChange={() => setSubject(option)}
                className="text-indigo-600"
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleStart}
        disabled={!curriculum || !subject || submitting}
        className="mt-6 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "Starting…" : "Start Learning"}
      </button>
    </div>
  );
}