"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  acceptRecommendation,
  ApiError,
  ChildProfile,
  fetchRecommendations,
  fetchPoints,
  getChild,
  RecommendationData,
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
  const [session, setSession] = useState<RecommendationData["session"] | null>(
    null,
  );
  const [showPicker, setShowPicker] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [points, setPoints] = useState<Awaited<ReturnType<typeof fetchPoints>> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [profile, recommendations, pointsData] = await Promise.all([
          getChild(childId),
          fetchRecommendations(childId),
          fetchPoints(childId).catch(() => null),
        ]);
        if (cancelled) return;
        setChild(profile);
        const first = recommendations.recommendations[0] ?? null;
        setTop(first);
        setSession(recommendations.session);
        setPoints(pointsData);
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
    if (!session || !top || starting) return;
    // Accept the recommendation and show a confirmation screen so the parent
    // can see the exact topic before entering the session.
    try {
      await acceptRecommendation(session.id, top.learningObjective.id);
    } catch {
      setError("Could not start. Please try again.");
      return;
    }
    setConfirming(true);
  }

  async function handleConfirm() {
    if (!session) return;
    setStarting(true);
    setError(null);
    try {
      router.push(`/learn/${childId}/session/${session.id}`);
    } catch {
      setError("Could not navigate. Please try again.");
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
        {status === "ready" && showPicker ? (
          <button
            type="button"
            onClick={() => setShowPicker(false)}
            className="btn-tactile mb-5 inline-flex items-center gap-2 self-start rounded-full border-2 border-line bg-card px-4 py-2 text-sm font-semibold text-ink shadow-[0_3px_0_rgba(46,42,92,0.1)] hover:border-ink-soft"
          >
            <span aria-hidden="true">←</span>
            Back to today&apos;s pick
          </button>
        ) : null}
        <h1 className="font-display text-4xl text-ink">Hi {name}</h1>
        <p className="mb-7 mt-2 text-base text-ink-soft">
          {showPicker
            ? "No problem — pick what sounds fun."
            : "Let's pick what to practice today."}
        </p>
        <KidTopicPicker child={child} session={session} />
      </div>
    );
  }

  // Topic confirmation — shown after "Start Learning" is clicked so parents
  // can see exactly which topic their child will practice.
  if (confirming && top) {
    return (
      <div className="flex w-full flex-1 flex-col justify-center">
        <div className="rounded-3xl bg-card px-7 py-7 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
          <p className="text-sm font-medium uppercase tracking-widest text-ink-soft">
            Ready to start
          </p>
          <p className="mt-3 font-display text-3xl text-ink">
            {top.learningObjective.name}
          </p>
          <p className="mt-2 text-base text-ink-soft">
            {child?.curricula[0]
              ? `${child.curricula[0]} · ${top.learningObjective.hierarchy.subject.name}`
              : top.learningObjective.hierarchy.subject.name}
          </p>
          <p className="mt-4 text-base leading-7 text-ink-soft">
            {kidReasonLine(top.reasonCodes)}
          </p>

          {error ? (
            <p className="mt-4 rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
              {error}
            </p>
          ) : null}

          <div className="mt-7 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={starting}
              className="btn-tactile btn-primary w-full rounded-2xl px-4 py-4 font-display text-xl font-semibold disabled:opacity-60"
            >
              Yes, let&apos;s go!
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setShowPicker(true);
              }}
              className="btn-tactile w-full rounded-2xl border border-line bg-card px-4 py-3 text-base font-medium text-ink"
            >
              Change topic
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 flex-col justify-center">
      <h1 className="font-display text-4xl text-ink">Hi {name}</h1>

      {points?.goal ? (
        <div className="mb-5 rounded-2xl bg-card px-5 py-4 shadow-[0_8px_28px_rgba(46,42,92,0.06)]">
          <div className="flex items-center justify-between text-sm font-semibold text-ink">
            <span>
              {points.goal.progress} / {points.goal.target} ⭐ this {points.goal.period.toLowerCase()}
            </span>
            <span>{points.balance} ⭐ saved</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-waypoint transition-[width]"
              style={{
                width: `${Math.min(100, (points.goal.progress / points.goal.target) * 100)}%`,
              }}
            />
          </div>
        </div>
      ) : null}

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
