"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  AttemptResult,
  completeSession,
  fetchEncouragement,
  fetchNextQuestion,
  getChild,
  PerceivedDifficulty,
  ServedQuestion,
  submitAttempt,
} from "@/lib/api";

type Status =
  | "loading"
  | "question"
  | "submitting"
  | "feedback"
  | "summary"
  | "error";

const FEELINGS: Array<{
  value: PerceivedDifficulty;
  face: string;
  label: string;
}> = [
  { value: "Easy", face: "😊", label: "Easy" },
  { value: "Just Right", face: "😐", label: "Just Right" },
  { value: "Difficult", face: "😣", label: "Tricky" },
];

export default function KidQuestionFlow({
  childId,
  sessionId,
}: {
  childId: string;
  sessionId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [question, setQuestion] = useState<ServedQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [difficulty, setDifficulty] = useState<PerceivedDifficulty | null>(null);
  const [revealFeelings, setRevealFeelings] = useState(false);
  const [attempt, setAttempt] = useState<AttemptResult | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [summary, setSummary] = useState("");
  const [summaryName, setSummaryName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  async function loadSummary(
    answered: number,
    correct: number,
  ): Promise<void> {
    try {
      const [encouragement, profile] = await Promise.all([
        fetchEncouragement(childId),
        getChild(childId),
      ]);
      const name =
        profile.nickname?.trim() ||
        profile.fullName.split(" ")[0] ||
        profile.fullName;
      setSummaryName(name);
      if (encouragement.data.sessionsCompared > 0) {
        setSummary(encouragement.message);
      } else {
        setSummary(
          `You answered ${correct} of ${answered} questions correctly. Every question counts!`,
        );
      }
    } catch {
      setSummaryName("");
      setSummary(
        answered > 0
          ? `You answered ${correct} of ${answered} questions correctly. Every question counts!`
          : "Thanks for practicing today!",
      );
    }
    setStatus("summary");
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const data = await fetchNextQuestion(sessionId);
        if (cancelled) return;

        if (!data.question) {
          await loadSummary(answeredCount, correctCount);
          return;
        }

        startedAtRef.current = Date.now();
        setQuestion(data.question);
        setSelectedAnswer("");
        setDifficulty(null);
        setRevealFeelings(false);
        setAttempt(null);
        setStatus("question");
      } catch (cause) {
        if (cancelled) return;
        if (cause instanceof ApiError && cause.status === 404) {
          await loadSummary(answeredCount, correctCount);
          return;
        }
        setError("Could not load your question. Please try again.");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, reloadKey]);

  function reload() {
    setStatus("loading");
    setError(null);
    setReloadKey((key) => key + 1);
  }

  async function handleSubmit() {
    if (!question || !selectedAnswer || !difficulty || status === "submitting") {
      return;
    }

    setStatus("submitting");
    setError(null);

    const startedAt = startedAtRef.current;
    const elapsedSeconds = startedAt
      ? Math.max(1, Math.round((Date.now() - startedAt) / 1000))
      : 0;
    startedAtRef.current = null;

    try {
      const result = await submitAttempt({
        learningSessionId: sessionId,
        questionId: question.id,
        selectedAnswer,
        timeSpent: elapsedSeconds,
        hintUsed: false,
        perceivedDifficulty: difficulty,
      });
      setAttempt(result);
      setAnsweredCount((count) => count + 1);
      setCorrectCount((count) => count + (result.correct ? 1 : 0));
      setStatus("feedback");
    } catch {
      setError("Could not send your answer. Please try again.");
      setStatus("question");
    }
  }

  async function handleFinish() {
    if (finishing) return;
    setFinishing(true);
    setError(null);
    try {
      await completeSession(sessionId);
    } catch (cause) {
      if (!(cause instanceof ApiError && cause.status === 404)) {
        setError("Could not finish. Please try again.");
        setFinishing(false);
        return;
      }
    }
    await loadSummary(answeredCount, correctCount);
  }

  if (status === "loading") {
    return <p className="text-base text-ink-soft">Loading…</p>;
  }

  if (status === "error" || !question || (status === "feedback" && !attempt)) {
    return (
      <div className="border-l-2 border-waypoint bg-card px-6 py-6">
        <p className="rounded-xl bg-coral/10 px-3.5 py-2.5 text-base text-coral-deep">
          {error ?? "Something went wrong."}
        </p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={reload}
            className="btn-tactile btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => router.push(`/learn/${childId}`)}
            className="btn-tactile rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink"
          >
            Back to Today
          </button>
        </div>
      </div>
    );
  }

  if (status === "summary") {
    return (
      <div className="border-l-2 border-waypoint bg-card px-6 py-8 text-center">
        <p className="font-display text-3xl text-ink">
          Awesome work{summaryName ? `, ${summaryName}` : ""}! 🎉
        </p>
        <p className="mx-auto mt-3 max-w-md text-base leading-7 text-ink-soft">
          {summary}
        </p>
        <button
          type="button"
          onClick={() => router.push(`/learn/${childId}`)}
          className="btn-tactile btn-primary mt-6 rounded-2xl px-6 py-3.5 font-display text-lg font-semibold"
        >
          Back to Today
        </button>
      </div>
    );
  }

  if (status === "feedback" && attempt) {
    return (
      <div className="border-l-2 border-waypoint bg-card px-6 py-6">
        <p
          className={`rounded-2xl px-4 py-4 text-center font-display text-2xl font-semibold ${
            attempt.correct
              ? "bg-trail/15 text-trail-deep"
              : "bg-waypoint/25 text-ink"
          }`}
        >
          {attempt.correct ? "🎉 Correct!" : "Not quite."}
        </p>
        <p className="mt-4 text-base leading-7 text-ink-soft">
          {attempt.explanation}
        </p>
        {error ? (
          <p className="mt-4 rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={reload}
            className="btn-tactile btn-primary w-full rounded-2xl px-4 py-3.5 font-display text-lg font-semibold"
          >
            Next →
          </button>
          <button
            type="button"
            onClick={() => void handleFinish()}
            disabled={finishing}
            className="btn-tactile w-full rounded-2xl border border-line bg-card px-4 py-3 text-base font-medium text-ink disabled:opacity-60"
          >
            {finishing ? "Finishing…" : "Finish for today"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-l-2 border-waypoint bg-card px-6 py-6">
      <p className="text-sm font-medium text-ink-soft">
        Question {answeredCount + 1}
      </p>
      <h2 className="mt-2 font-display text-3xl leading-snug text-ink">
        {question.questionText}
      </h2>

      {!revealFeelings ? (
        <fieldset className="mt-6">
          <legend className="sr-only">Choose your answer</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {question.options.map((option) => (
              <label
                key={option}
                className={`btn-tactile flex min-h-16 cursor-pointer items-center justify-center rounded-2xl border-2 px-4 py-4 text-center font-display text-xl ${
                  selectedAnswer === option
                    ? "border-coral bg-coral/10 text-ink"
                    : "border-line bg-card text-ink"
                }`}
              >
                <input
                  type="radio"
                  name="answer"
                  value={option}
                  checked={selectedAnswer === option}
                  onChange={() => setSelectedAnswer(option)}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRevealFeelings(true)}
            disabled={!selectedAnswer}
            className="btn-tactile btn-primary mt-6 w-full rounded-2xl px-4 py-3.5 font-display text-lg font-semibold disabled:opacity-60"
          >
            Next →
          </button>
        </fieldset>
      ) : (
        <fieldset className="mt-6">
          <legend className="text-center font-display text-xl text-ink">
            How did that feel?
          </legend>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {FEELINGS.map((feeling) => (
              <label
                key={feeling.value}
                className={`btn-tactile flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3 ${
                  difficulty === feeling.value
                    ? "border-coral bg-coral/10 text-ink"
                    : "border-line bg-card text-ink"
                }`}
              >
                <input
                  type="radio"
                  name="feeling"
                  value={feeling.value}
                  checked={difficulty === feeling.value}
                  onChange={() => setDifficulty(feeling.value)}
                  className="sr-only"
                />
                <span aria-hidden="true" className="text-3xl">
                  {feeling.face}
                </span>
                <span className="text-sm font-medium">{feeling.label}</span>
              </label>
            ))}
          </div>

          {error ? (
            <p className="mt-4 rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!difficulty || status === "submitting"}
              className="btn-tactile btn-primary w-full rounded-2xl px-4 py-3.5 font-display text-lg font-semibold disabled:opacity-60"
            >
              {status === "submitting" ? "Sending…" : "Send answer"}
            </button>
            <button
              type="button"
              onClick={() => setRevealFeelings(false)}
              disabled={status === "submitting"}
              className="btn-tactile w-full rounded-2xl border border-line bg-card px-4 py-3 text-base font-medium text-ink disabled:opacity-60"
            >
              Back
            </button>
          </div>
        </fieldset>
      )}
    </div>
  );
}
