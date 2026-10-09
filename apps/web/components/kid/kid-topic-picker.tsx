"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  acceptRecommendation,
  AvailableLearningObjective,
  ChildProfile,
  fetchChildTopics,
  startLearningSession,
} from "@/lib/api";

const SUBJECT_OPTIONS = ["Mathematics", "English"];
const GRADES = [
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
];

type TopicPickerSession = {
  id: string;
  curriculum: string;
  subject: string;
};

type TopicResult = {
  key: string;
  state: "ready" | "error";
  learningObjectives: AvailableLearningObjective[];
  error?: string;
};

export default function KidTopicPicker({
  child,
  session = null,
}: {
  child: ChildProfile;
  session?: TopicPickerSession | null;
}) {
  const router = useRouter();
  const [curriculum, setCurriculum] = useState(
    session?.curriculum ?? child.curricula[0] ?? "",
  );
  const [subject, setSubject] = useState("");
  const [practiceAhead, setPracticeAhead] = useState(false);
  const [topicResult, setTopicResult] = useState<TopicResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingObjectiveId, setStartingObjectiveId] = useState<string | null>(
    null,
  );

  const gradeIndex = GRADES.indexOf(child.grade);
  const canPracticeAhead = gradeIndex >= 0 && gradeIndex < GRADES.length - 1;
  const practiceGrade =
    practiceAhead && canPracticeAhead ? GRADES[gradeIndex + 1] : child.grade;
  const topicQueryKey = JSON.stringify([
    child.id,
    curriculum,
    subject,
    practiceGrade,
  ]);
  const hasTopicQuery = Boolean(curriculum && subject);
  const currentTopicResult =
    hasTopicQuery && topicResult?.key === topicQueryKey ? topicResult : null;
  const topicLoadState = !hasTopicQuery
    ? "idle"
    : (currentTopicResult?.state ?? "loading");
  const learningObjectives = currentTopicResult?.learningObjectives ?? [];

  useEffect(() => {
    if (!curriculum || !subject) {
      return;
    }

    let cancelled = false;
    const queryKey = JSON.stringify([
      child.id,
      curriculum,
      subject,
      practiceGrade,
    ]);

    void fetchChildTopics({
      childId: child.id,
      curriculum,
      subject,
      grade: practiceGrade,
    })
      .then((response) => {
        if (cancelled) return;
        setTopicResult({
          key: queryKey,
          state: "ready",
          learningObjectives: response.learningObjectives,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setTopicResult({
          key: queryKey,
          state: "error",
          learningObjectives: [],
          error: "Could not load topics. Please try again.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [child.id, curriculum, practiceGrade, subject]);

  async function handleChooseTopic(objective: AvailableLearningObjective) {
    if (!curriculum || !subject || startingObjectiveId) return;

    setStartingObjectiveId(objective.id);
    setError(null);
    try {
      const canReuseSession =
        session?.curriculum === curriculum && session.subject === subject;
      const sessionId = canReuseSession
        ? session.id
        : (
            await startLearningSession({
              childId: child.id,
              curriculum,
              subject,
            })
          ).id;

      await acceptRecommendation(sessionId, objective.id, practiceGrade);
      router.push(`/learn/${child.id}/session/${sessionId}`);
    } catch {
      setError("Could not start this topic. Please try again.");
      setStartingObjectiveId(null);
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
            onClick={() => {
              setSubject(option);
              setError(null);
            }}
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

      {subject ? (
        <section aria-labelledby="topic-list-heading" className="mt-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2
                id="topic-list-heading"
                className="font-display text-xl text-ink"
              >
                Choose a topic
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                {curriculum} · {subject} · {practiceGrade}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPracticeAhead((ahead) => !ahead)}
            disabled={!canPracticeAhead}
            aria-pressed={practiceAhead}
            className={`btn-tactile mt-4 w-full rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              practiceAhead
                ? "border-coral bg-coral/10 text-ink"
                : "border-line bg-card text-ink"
            }`}
          >
            {practiceAhead
              ? `Practicing one grade ahead · ${practiceGrade}`
              : "Practice a grade ahead"}
          </button>
          {!canPracticeAhead ? (
            <p className="mt-2 text-sm text-ink-soft">
              Grade 6 is the highest grade with topics available right now.
            </p>
          ) : null}

          {topicLoadState === "loading" ? (
            <p className="mt-4 text-sm text-ink-soft">Finding topics…</p>
          ) : null}

          {topicLoadState === "error" ? (
            <p className="mt-4 rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
              {currentTopicResult?.error}
            </p>
          ) : null}

          {topicLoadState === "ready" && learningObjectives.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-line bg-card px-4 py-4 text-sm leading-6 text-ink-soft">
              There aren&apos;t any {subject} topics with questions for {curriculum} at {practiceGrade} yet. Try another path, subject, or grade.
            </p>
          ) : null}

          {learningObjectives.length > 0 ? (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {learningObjectives.map((objective) => {
                const isStarting = startingObjectiveId === objective.id;
                const mastery = objective.mastery;

                return (
                  <button
                    key={objective.id}
                    type="button"
                    onClick={() => void handleChooseTopic(objective)}
                    disabled={startingObjectiveId !== null}
                    aria-label={`Practice ${objective.hierarchy.subtopic.name}: ${objective.name}`}
                    aria-pressed={isStarting}
                    className={`btn-tactile min-h-28 rounded-2xl border-2 px-4 py-3 text-left disabled:opacity-60 ${
                      isStarting
                        ? "border-coral bg-coral/10 text-ink"
                        : "border-line bg-card text-ink"
                    }`}
                  >
                    <span className="block text-xs font-semibold text-ink-soft">
                      {objective.hierarchy.topic.name}
                    </span>
                    <span className="mt-1 block font-display text-lg font-semibold">
                      {objective.hierarchy.subtopic.name}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-ink-soft">
                      {objective.name}
                    </span>
                    <span className="mt-2 block text-xs text-ink-soft">
                      {isStarting
                        ? "Starting…"
                        : mastery && mastery.totalAttempts > 0
                          ? `Practiced · ${mastery.masteryScore}% mastery`
                          : "New topic"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
          {error}
        </p>
      ) : null}
    </div>
  );
}
