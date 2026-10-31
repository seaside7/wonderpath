"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { kidCopy, kidLocale, kidReasonLine } from "@/lib/kid-copy";
import KidTopicPicker from "./kid-topic-picker";
import { useKidLocale } from "./kid-locale";

type Status = "loading" | "ready" | "fallback" | "error";
type TodayError = "loadPage" | "start" | "openPractice";

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
  const [error, setError] = useState<TodayError | null>(null);
  const [starting, setStarting] = useState(false);
  const [points, setPoints] = useState<Awaited<ReturnType<typeof fetchPoints>> | null>(null);
  // Language follows the child's first curriculum; before the profile loads,
  // the kid layout's value is used.
  const childLocale = useKidLocale();
  const copy = kidCopy(child ? kidLocale(child.curricula[0]) : childLocale);
  const errorText = (code: TodayError) =>
    code === "loadPage"
      ? copy.loadPageError
      : code === "start"
        ? copy.startError
        : copy.openPracticeError;

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
            setError("loadPage");
            setStatus("error");
          }
          return;
        }
        setError("loadPage");
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
      setError("start");
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
      setError("openPractice");
      setStarting(false);
    }
  }

  if (status === "loading") {
    return <p className="text-base text-ink-soft">{copy.loading}</p>;
  }

  if (status === "error" || !child) {
    return (
      <p className="rounded-2xl bg-coral/10 px-4 py-3 text-base text-coral-deep">
        {error ? errorText(error) : copy.somethingWrong}
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
            {copy.backToTodaysPick}
          </button>
        ) : null}
        <h1 className="font-display text-4xl text-ink">{copy.greeting(name)}</h1>
        <p className="mb-7 mt-2 text-base text-ink-soft">
          {showPicker ? copy.pickerIntroAfterSkip : copy.pickerIntro}
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
            {copy.readyToStart}
          </p>
          <p className="mt-3 font-display text-3xl text-ink">
            {top.learningObjective.name}
          </p>
          <p className="mt-2 text-base text-ink-soft">
            {child?.curricula[0]
              ? `${child.curricula[0]} · ${copy.subjectName(top.learningObjective.hierarchy.subject.name)}`
              : copy.subjectName(top.learningObjective.hierarchy.subject.name)}
          </p>
          <p className="mt-4 text-base leading-7 text-ink-soft">
            {kidReasonLine(top.reasonCodes, copy)}
          </p>

          {error ? (
            <p className="mt-4 rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
              {errorText(error)}
            </p>
          ) : null}

          <div className="mt-7 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={starting}
              className="btn-tactile btn-primary w-full rounded-2xl px-4 py-4 font-display text-xl font-semibold disabled:opacity-60"
            >
              {copy.startPractice}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setShowPicker(true);
              }}
              className="btn-tactile w-full rounded-2xl border border-line bg-card px-4 py-3 text-base font-medium text-ink"
            >
              {copy.changeTopic}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-1 flex-col justify-center">
      <h1 className="font-display text-4xl text-ink">{copy.greeting(name)}</h1>

      {points?.goal ? (
        <div className="mb-5 rounded-2xl bg-card px-5 py-4 shadow-[0_8px_28px_rgba(46,42,92,0.06)]">
          <div className="flex items-center justify-between text-sm font-semibold text-ink">
            <span>
              {copy.goalProgress(points.goal.progress, points.goal.target, points.goal.period)}
            </span>
            <span>{copy.pointsSaved(points.balance)}</span>
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
              {kidReasonLine(top.reasonCodes, copy)}
              {top.learningObjective.estimatedMasteryTime > 0 ? (
                <>
                  {" "}
                  {copy.about(
                    copy.duration(top.learningObjective.estimatedMasteryTime),
                  )}
                </>
              ) : null}
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
              {errorText(error)}
            </p>
          ) : null}

          <div className="mt-7 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={starting}
              className="btn-tactile btn-primary w-full rounded-2xl px-4 py-4 font-display text-xl font-semibold disabled:opacity-60"
            >
              {starting ? copy.starting : copy.startLearning}
            </button>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="btn-tactile w-full rounded-2xl border border-line bg-card px-4 py-3.5 text-base font-medium text-ink"
            >
              {copy.chooseSomethingElse}
            </button>
            <Link
              href={`/learn/${childId}/books`}
              className="btn-tactile flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-waypoint bg-waypoint/20 px-4 py-3.5 text-base font-bold text-ink"
            >
              <span aria-hidden="true">📚</span> {copy.storyTrail}
              <span className="text-sm font-semibold text-ink-soft">· {copy.storyTrailHint}</span>
            </Link>
          </div>
      </div>
    </div>
  );
}
