"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  acceptRecommendation,
  AdaptiveDifficultyDetail,
  ApiError,
  ChildProfile,
  fetchAdaptiveDifficulty,
  fetchAdaptiveDifficultyList,
  fetchMastery,
  fetchMisconceptions,
  fetchRecommendations,
  fetchSessionHistory,
  getChild,
  MasteryRecord,
  MisconceptionSignal,
  RecommendationData,
  SessionHistoryItem,
} from "@/lib/api";
import {
  formatEstimatedSession,
  formatRelativeTime,
  reasonBullets,
} from "@/lib/format";
import MisconceptionsSection from "./misconceptions-section";
import AdaptiveDifficultySection from "./adaptive-difficulty-section";
import RecentSessionsSection from "./recent-sessions-section";

// This screen makes several network calls before it has anything real to
// show (child profile, recommendations, mastery, misconceptions, adaptive
// difficulty per subject, session history) - on a first/cold load that's
// long enough to be noticeable. A skeleton matching the real card layout
// tells the parent "this is loading, here's roughly what's coming" instead
// of a near-empty page that reads as broken.
function DashboardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your child&apos;s progress…</span>
      <div className="rounded-3xl bg-card p-7 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
        <div className="h-3 w-24 rounded-full bg-line" />
        <div className="mt-4 h-7 w-2/3 rounded-full bg-line" />
        <div className="mt-3 h-4 w-full rounded-full bg-line" />
        <div className="mt-2 h-4 w-4/5 rounded-full bg-line" />
        <div className="mt-6 flex gap-3">
          <div className="h-10 w-36 rounded-xl bg-line" />
          <div className="h-10 w-40 rounded-xl bg-line" />
        </div>
      </div>
      <div className="rounded-3xl bg-card p-7 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
        <div className="h-5 w-28 rounded-full bg-line" />
        <div className="mt-5 flex flex-col gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="h-4 w-1/2 rounded-full bg-line" />
              <div className="h-4 w-12 rounded-full bg-line" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-3xl bg-card p-7 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
        <div className="h-5 w-32 rounded-full bg-line" />
        <div className="mt-5 h-4 w-3/4 rounded-full bg-line" />
      </div>
    </div>
  );
}

type Status = "loading" | "ready" | "no-session" | "empty" | "error";

export default function RecommendationDashboard({
  childId,
}: {
  childId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [recommendation, setRecommendation] =
    useState<RecommendationData | null>(null);
  const [mastery, setMastery] = useState<MasteryRecord[]>([]);
  const [misconceptions, setMisconceptions] = useState<MisconceptionSignal[]>(
    [],
  );
  const [difficultyLevels, setDifficultyLevels] = useState<
    AdaptiveDifficultyDetail[]
  >([]);
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [
          profile,
          recommendations,
          masteryData,
          misconceptionsData,
          difficultyList,
          historyData,
        ] = await Promise.all([
          getChild(childId),
          fetchRecommendations(childId),
          fetchMastery(childId),
          fetchMisconceptions(childId),
          fetchAdaptiveDifficultyList(childId),
          fetchSessionHistory(childId),
        ]);

        const details = await Promise.all(
          difficultyList.difficulty.map((entry) =>
            fetchAdaptiveDifficulty(childId, entry.subject),
          ),
        );

        if (cancelled) return;
        setChild(profile);
        setMastery(masteryData.mastery);
        setMisconceptions(misconceptionsData.signals);
        setDifficultyLevels(details);
        setSessions(historyData.sessions);
        setStatus(
          recommendations.recommendations.length > 0 ? "ready" : "empty",
        );
        setRecommendation(recommendations);
      } catch (cause) {
        if (cancelled) return;

        if (cause instanceof ApiError && cause.status === 404) {
          setStatus("no-session");
          return;
        }

        setError("Could not load recommendations. Please try again.");
        setStatus("error");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [childId]);

  async function handleStart() {
    if (!recommendation) return;
    const top = recommendation.recommendations[0];
    if (!top) return;

    setStarting(true);
    setError(null);

    try {
      await acceptRecommendation(recommendation.session.id, top.learningObjective.id);
      router.push(`/sessions/${recommendation.session.id}`);
    } catch {
      setError("Could not start the recommended session. Please try again.");
      setStarting(false);
    }
  }

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  if (status === "error") {
    return (
      <p className="rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
        {error ?? "Something went wrong."}
      </p>
    );
  }

  if (status === "no-session") {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-card p-9 text-center">
        <h2 className="font-display text-2xl text-ink">
          Let&rsquo;s get started
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
          {child
            ? `${child.fullName} hasn't started a learning session yet. Choose a topic to kick things off — Atlas will then recommend what to practice next.`
            : "Choose a topic to kick things off — Atlas will then recommend what to practice next."}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/children/${childId}/start`)}
          className="btn-tactile btn-primary mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold"
        >
          Choose a Topic
        </button>
      </div>
    );
  }

  const top = recommendation?.recommendations[0] ?? null;
  const subject = recommendation?.session.subject ?? "Mathematics";
  const firstName = child
    ? (child.nickname?.trim() ||
      child.fullName.split(" ")[0] ||
      child.fullName)
    : "Your child";

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-3xl bg-card p-7 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
        {top ? (
          <div>
            <p className="flex items-center gap-2.5 font-display text-2xl text-ink">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-waypoint"
              />
              {top.learningObjective.name}
            </p>

            <p className="mt-4 text-sm leading-6 text-ink-soft">
              {top.explanation}
            </p>

            <ul className="mt-3 flex flex-col gap-1.5">
              {reasonBullets(top.reasonCodes).map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-2 text-sm text-ink-soft"
                >
                  <span aria-hidden="true" className="text-ink-soft/50">
                    •
                  </span>
                  {bullet}
                </li>
              ))}
              {top.learningObjective.estimatedMasteryTime > 0 ? (
                <li className="flex items-start gap-2 text-sm text-ink-soft">
                  <span aria-hidden="true" className="text-ink-soft/50">
                    •
                  </span>
                  Estimated session:{" "}
                  {formatEstimatedSession(top.learningObjective.estimatedMasteryTime)}
                </li>
              ) : null}
            </ul>

            {error ? (
              <p className="mt-4 rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleStart()}
                disabled={starting}
                className="btn-tactile btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {starting ? "Starting…" : "Start Learning"}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/children/${childId}/start`)}
                className="btn-tactile rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink"
              >
                Choose Another Topic
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="font-display text-2xl text-ink">
              No recommendation yet
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              {child?.fullName ?? "This child"} hasn&rsquo;t practiced enough
              sessions for Atlas to recommend a focus yet.
            </p>
            <button
              type="button"
              onClick={() => router.push(`/children/${childId}/start`)}
              className="btn-tactile mt-5 rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink"
            >
              Choose Another Topic
            </button>
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-card p-7 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl text-ink">Mastery</h2>
          {child ? (
            <p className="text-sm text-ink-soft">
              {child.curricula[0] ?? "Curriculum"} {subject}
            </p>
          ) : null}
        </div>

        {mastery.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">
            No practice yet. Start a session and answers will show up here.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-line">
            {mastery.map((record) => (
              <li
                key={record.learningObjectiveId}
                className="flex flex-wrap items-center justify-between gap-2 py-3.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {record.learningObjectiveName}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Last practiced: {formatRelativeTime(record.lastPracticedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {record.reviewRecommended ? (
                    <span className="rounded-full bg-waypoint/20 px-2.5 py-0.5 text-xs font-semibold text-ink">
                      Review Recommended
                    </span>
                  ) : null}
                  <span className="w-16 text-right text-sm font-semibold text-ink">
                    {Math.round(record.masteryScore)}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <MisconceptionsSection
        signals={misconceptions}
        childFirstName={firstName}
      />

      <AdaptiveDifficultySection levels={difficultyLevels} />

      <RecentSessionsSection sessions={sessions} />
    </div>
  );
}