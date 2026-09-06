"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  AttemptResult,
  completeSession,
  fetchNextQuestion,
  PerceivedDifficulty,
  ServedQuestion,
  submitAttempt,
} from "@/lib/api";

type Status = "loading" | "question" | "submitting" | "feedback" | "empty" | "ended" | "error";

const DIFFICULTY_OPTIONS: PerceivedDifficulty[] = [
  "Easy",
  "Just Right",
  "Difficult",
];

export default function SessionQuestionFlow({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [question, setQuestion] = useState<ServedQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [difficulty, setDifficulty] = useState<PerceivedDifficulty | null>(null);
  const [revealDifficulty, setRevealDifficulty] = useState(false);
  const [attempt, setAttempt] = useState<AttemptResult | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchNextQuestion(sessionId);

        if (!data.question) {
          setStatus("empty");
          return;
        }

        startedAtRef.current = Date.now();
        setQuestion(data.question);
        setSelectedAnswer("");
        setDifficulty(null);
        setRevealDifficulty(false);
        setAttempt(null);
        setStatus("question");
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 404) {
          setStatus("ended");
          return;
        }
        setError("Could not load the next question. Please try again.");
        setStatus("error");
      }
    })();
  }, [sessionId, reloadKey]);

  function reload() {
    setStatus("loading");
    setError(null);
    setReloadKey((key) => key + 1);
  }

  async function handleSubmit() {
    if (!question || !selectedAnswer || !difficulty) return;

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
      setError("Could not submit your answer. Please try again.");
      setStatus("question");
    }
  }

  async function handleEndSession() {
    setEnding(true);
    try {
      await completeSession(sessionId);
    } catch {
      // The session may already be completed; keep the UI end state.
    }
    router.push("/dashboard");
  }

  if (status === "loading") {
    return <p className="text-sm text-zinc-500">Loading question…</p>;
  }

  if (status === "error" || !question || (status === "feedback" && !attempt)) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error ?? "Something went wrong."}
        </p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={reload}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => void handleEndSession()}
            disabled={ending}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            End Session
          </button>
        </div>
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">
          You answered all the questions!
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          {answeredCount} question{answeredCount === 1 ? "" : "s"} answered —
          {correctCount} correct this session.
        </p>
        <button
          type="button"
          onClick={() => void handleEndSession()}
          disabled={ending}
          className="mt-5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {ending ? "Finishing…" : "End Session"}
        </button>
      </div>
    );
  }

  if (status === "feedback" && attempt) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p
          className={`rounded-md px-3 py-2 text-sm font-semibold ${
            attempt.correct
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {attempt.correct ? "Correct!" : "Not quite."}
        </p>
        <p className="mt-4 text-sm text-zinc-700">{attempt.explanation}</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={reload}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Next Question
          </button>
          <button
            type="button"
            onClick={() => void handleEndSession()}
            disabled={ending}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            End Session
          </button>
        </div>
      </div>
    );
  }

  if (status === "ended") {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">
          This session has ended.
        </h2>
        {answeredCount > 0 ? (
          <p className="mt-1 text-sm text-zinc-600">
            You answered {correctCount} of {answeredCount} questions correctly.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mt-5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {question.questionType}
        </span>
        <span className="text-xs text-zinc-500">
          Difficulty {question.difficulty}
        </span>
      </div>

      <h2 className="mt-3 text-xl font-semibold text-zinc-900">
        {question.questionText}
      </h2>

      {!revealDifficulty ? (
        <fieldset className="mt-6">
          <legend className="text-sm font-medium text-zinc-700">
            Choose your answer
          </legend>
          <div className="mt-2 flex flex-col gap-2">
            {question.options.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                  selectedAnswer === option
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                    : "border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                }`}
              >
                <input
                  type="radio"
                  name="answer"
                  value={option}
                  checked={selectedAnswer === option}
                  onChange={() => setSelectedAnswer(option)}
                  className="text-indigo-600"
                />
                {option}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRevealDifficulty(true)}
            disabled={!selectedAnswer}
            className="mt-5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            Continue
          </button>
        </fieldset>
      ) : (
        <fieldset className="mt-6">
          <legend className="text-sm font-medium text-zinc-700">
            How did that feel?
          </legend>
          <div className="mt-2 flex flex-col gap-2">
            {DIFFICULTY_OPTIONS.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                  difficulty === option
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                    : "border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                }`}
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={option}
                  checked={difficulty === option}
                  onChange={() => setDifficulty(option)}
                  className="text-indigo-600"
                />
                {option}
              </label>
            ))}
          </div>

          {error ? (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!difficulty || status === "submitting"}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {status === "submitting" ? "Submitting…" : "Submit Answer"}
            </button>
            <button
              type="button"
              onClick={() => setRevealDifficulty(false)}
              disabled={status === "submitting"}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </fieldset>
      )}
    </div>
  );
}