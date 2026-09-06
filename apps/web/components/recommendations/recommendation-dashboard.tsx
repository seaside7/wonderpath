"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  acceptRecommendation,
  ApiError,
  ChildProfile,
  fetchMastery,
  fetchRecommendations,
  getChild,
  MasteryRecord,
  RecommendationData,
} from "@/lib/api";
import {
  formatEstimatedSession,
  formatRelativeTime,
  reasonBullets,
} from "@/lib/format";

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
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [profile, recommendations, masteryData] = await Promise.all([
          getChild(childId),
          fetchRecommendations(childId),
          fetchMastery(childId),
        ]);

        if (cancelled) return;
        setChild(profile);
        setMastery(masteryData.mastery);
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
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (status === "error") {
    return (
      <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {error ?? "Something went wrong."}
      </p>
    );
  }

  if (status === "no-session") {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">
          Let&rsquo;s get started
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
          {child
            ? `${child.fullName} hasn't started a learning session yet. Choose a topic to kick things off — Atlas will then recommend what to practice next.`
            : "Choose a topic to kick things off — Atlas will then recommend what to practice next."}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/children/${childId}/start`)}
          className="mt-5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          Choose a Topic
        </button>
      </div>
    );
  }

  const top = recommendation?.recommendations[0] ?? null;
  const subject = recommendation?.session.subject ?? "Mathematics";

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        {top ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
              Today&rsquo;s Recommendation
            </p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-900">
              {top.learningObjective.name}
            </h2>

            <p className="mt-4 text-sm font-medium text-zinc-700">Why?</p>
            <p className="mt-1 text-sm text-zinc-600">
              {top.explanation}
            </p>

            <ul className="mt-3 flex flex-col gap-1.5">
              {reasonBullets(top.reasonCodes).map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-2 text-sm text-zinc-600"
                >
                  <span className="text-zinc-400">•</span>
                  {bullet}
                </li>
              ))}
              {top.learningObjective.estimatedMasteryTime > 0 ? (
                <li className="flex items-start gap-2 text-sm text-zinc-600">
                  <span className="text-zinc-400">•</span>
                  Estimated session:{" "}
                  {formatEstimatedSession(top.learningObjective.estimatedMasteryTime)}
                </li>
              ) : null}
            </ul>

            {error ? (
              <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleStart()}
                disabled={starting}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {starting ? "Starting…" : "Start Learning"}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/children/${childId}/start`)}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Choose Another Topic
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
              Today&rsquo;s Recommendation
            </p>
            <p className="mt-2 text-lg font-semibold text-zinc-900">
              No recommendation yet
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {child?.fullName ?? "This child"} hasn&rsquo;t practiced enough
              sessions for Atlas to recommend a focus yet.
            </p>
            <button
              type="button"
              onClick={() => router.push(`/children/${childId}/start`)}
              className="mt-5 rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Choose Another Topic
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Mastery</h2>
          {child ? (
            <p className="text-sm text-zinc-600">
              {child.fullName} — {child.curricula[0] ?? "Curriculum"} {subject}
            </p>
          ) : null}
        </div>

        {mastery.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No practice yet. Start a session and answers will show up here.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-zinc-100">
            {mastery.map((record) => (
              <li
                key={record.learningObjectiveId}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">
                    {record.learningObjectiveName}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Last practiced: {formatRelativeTime(record.lastPracticedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {record.reviewRecommended ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      Review Recommended
                    </span>
                  ) : null}
                  <span className="w-16 text-right text-sm font-semibold text-zinc-900">
                    {Math.round(record.masteryScore)}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}