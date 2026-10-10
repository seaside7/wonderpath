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
import { formatEstimatedSession, reasonBullets } from "@/lib/format";
import { CheckCircleIcon, SparklesIcon } from "@/components/ui/icons";
import MisconceptionsSection from "./misconceptions-section";
import AdaptiveDifficultySection from "./adaptive-difficulty-section";
import RecentSessionsSection from "./recent-sessions-section";
import ProgressSummary from "./progress-summary";
import MasteryProgressSection from "./mastery-progress-section";
import { firstNameOf } from "./progress-utils";

// Enough history to cover a full week of practice for the summary.
const HISTORY_LIMIT = 50;

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
          fetchSessionHistory(childId, HISTORY_LIMIT),
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
  const subject = recommendation?.session.subject ?? null;
  const firstName = firstNameOf(child);
  const contextLabel =
    child && subject ? `${child.curricula[0] ?? "Curriculum"} · ${subject}` : null;

  return (
    <div className="flex flex-col gap-5">
      <ProgressSummary
        firstName={firstName}
        sessions={sessions}
        mastery={mastery}
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="flex flex-col gap-5 lg:order-2 lg:col-span-2">
          <section
            aria-labelledby="next-step-heading"
            className="rounded-3xl bg-ink p-6 text-white shadow-[0_8px_28px_rgba(46,42,92,0.18)]"
          >
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/75">
              <SparklesIcon width={14} height={14} />
              Atlas suggests next
            </p>
            {top ? (
              <>
                <h2
                  id="next-step-heading"
                  className="mt-3 font-display text-2xl leading-snug"
                >
                  {top.learningObjective.name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/85">
                  {top.explanation}
                </p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {reasonBullets(top.reasonCodes).map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2 text-sm text-white/85"
                    >
                      <CheckCircleIcon
                        width={16}
                        height={16}
                        className="mt-0.5 shrink-0 text-trail"
                      />
                      {bullet}
                    </li>
                  ))}
                  {top.learningObjective.estimatedMasteryTime > 0 ? (
                    <li className="flex items-start gap-2 text-sm text-white/85">
                      <CheckCircleIcon
                        width={16}
                        height={16}
                        className="mt-0.5 shrink-0 text-trail"
                      />
                      About{" "}
                      {formatEstimatedSession(
                        top.learningObjective.estimatedMasteryTime,
                      )}
                    </li>
                  ) : null}
                </ul>
              </>
            ) : (
              <>
                <h2
                  id="next-step-heading"
                  className="mt-3 font-display text-2xl leading-snug"
                >
                  No suggestion yet
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/85">
                  {firstName} needs a little more practice before Atlas can
                  suggest a focus.
                </p>
              </>
            )}

            {error ? (
              <p className="mt-4 rounded-xl bg-white/10 px-3.5 py-2.5 text-sm text-white">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col gap-2.5">
              {top ? (
                <button
                  type="button"
                  onClick={() => void handleStart()}
                  disabled={starting}
                  className="btn-tactile btn-primary w-full rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                >
                  {starting ? "Starting…" : "Start this topic"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => router.push(`/children/${childId}/start`)}
                className="btn-tactile w-full rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Choose another topic
              </button>
            </div>
          </section>

          <AdaptiveDifficultySection levels={difficultyLevels} />

          <MisconceptionsSection
            signals={misconceptions}
            childFirstName={firstName}
          />
        </div>

        <div className="flex flex-col gap-5 lg:order-1 lg:col-span-3">
          <MasteryProgressSection
            mastery={mastery}
            contextLabel={contextLabel}
          />
          <RecentSessionsSection sessions={sessions} />
        </div>
      </div>
    </div>
  );
}
