"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  acceptRecommendation,
  ApiError,
  ChildProfile,
  fetchRecommendations,
  getChild,
  RecommendationItem,
} from "@/lib/api";
import {
  formatEstimatedSession,
  kidReasonLine,
} from "@/lib/format";
import KidTopicPicker from "./kid-topic-picker";

type Status = "loading" | "ready" | "fallback" | "error";

function displayName(child: ChildProfile): string {
  if (child.nickname?.trim()) return child.nickname.trim();
  return child.fullName.split(" ")[0] ?? child.fullName;
}

export default function KidTodayCard({ childId }: { childId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [top, setTop] = useState<RecommendationItem | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [profile, recommendations] = await Promise.all([
          getChild(childId),
          fetchRecommendations(childId),
        ]);
        if (cancelled) return;
        setChild(profile);
        const first = recommendations.recommendations[0] ?? null;
        setTop(first);
        setSessionId(recommendations.session.id);
        setStatus(first ? "ready" : "fallback");
      } catch (cause) {
        if (cancelled) return;
        if (cause instanceof ApiError && cause.status === 404) {
          try {
            const profile = await getChild(childId);
            if (cancelled) return;
            setChild(profile);
            setStatus("fallback");
          } catch {
            if (cancelled) return;
            setError("Could not load your page. Please try again.");
            setStatus("error");
          }
          return;
        }
        setError("Could not load your page. Please try again.");
        setStatus("error");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [childId]);

  async function handleStart() {
    if (!sessionId || !top || starting) return;
    setStarting(true);
    setError(null);
    try {
      await acceptRecommendation(sessionId, top.learningObjective.id);
      router.push(`/learn/${childId}/session/${sessionId}`);
    } catch {
      setError("Could not start. Please try again.");
      setStarting(false);
    }
  }

  if (status === "loading") {
    return <p className="text-base text-ink-soft">Loading…</p>;
  }

  if (status === "error" || !child) {
    return (
      <p className="rounded-2xl bg-coral/10 px-4 py-3 text-base text-coral-deep">
        {error ?? "Something went wrong."}
      </p>
    );
  }

  const name = displayName(child);

  if (status === "fallback" || showPicker) {
    return (
      <div className="flex w-full flex-1 flex-col justify-center">
        <h1 className="font-display text-4xl text-ink">Hi {name}</h1>
        <p className="mb-7 mt-2 text-base text-ink-soft">
          {showPicker
            ? "No problem — pick what sounds fun."
            : "Let's pick what to practice today."}
        </p>
        <KidTopicPicker child={child} />
        {status === "ready" && showPicker ? (
          <button
            type="button"
            onClick={() => setShowPicker(false)}
            className="btn-tactile mt-4 self-start rounded-xl px-4 py-2.5 text-sm font-medium text-ink-soft"
          >
            Back to today&apos;s pick
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 flex-col justify-center">
      <h1 className="font-display text-4xl text-ink">Hi {name}</h1>

      <div className="mt-7 rounded-3xl bg-card px-7 py-7 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
          <p className="flex items-center gap-2.5 font-display text-3xl text-ink">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full bg-waypoint"
            />
            {top?.learningObjective.name}
          </p>
          {top ? (
            <p className="mt-3 text-base leading-7 text-ink-soft">
              {kidReasonLine(top.reasonCodes)}
              {top.learningObjective.estimatedMasteryTime > 0 ? (
                <>
                  {" "}
                  About{" "}
                  {formatEstimatedSession(
                    top.learningObjective.estimatedMasteryTime,
                  )}
                  .
                </>
              ) : null}
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
              {error}
            </p>
          ) : null}

          <div className="mt-7 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={starting}
              className="btn-tactile btn-primary w-full rounded-2xl px-4 py-4 font-display text-xl font-semibold disabled:opacity-60"
            >
              {starting ? "Starting…" : "Start Learning"}
            </button>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="btn-tactile w-full rounded-2xl border border-line bg-card px-4 py-3.5 text-base font-medium text-ink"
            >
              Choose Something Else
            </button>
          </div>
      </div>
    </div>
  );
}
