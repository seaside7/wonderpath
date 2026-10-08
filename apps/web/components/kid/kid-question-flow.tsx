"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AtlasAvatar from "@/components/mascot/atlas-avatar";
import {
  ApiError,
  AttemptResult,
  completeSession,
  fetchEncouragement,
  fetchNextQuestion,
  getChild,
  getCurrentSession,
  PerceivedDifficulty,
  resolveAudioUrl,
  ServedQuestion,
  submitAttempt,
} from "@/lib/api";
import { getRandomFact, type FunFact } from "@/lib/fun-facts";
import {
  ensureAudioReady,
  playCorrect,
  playLevelUp,
  playWrong,
} from "@/lib/sound";

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
  const [topicName, setTopicName] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [funFact, setFunFact] = useState<FunFact | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
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
      } else if (answered > 0) {
        setSummary(
          `You answered ${correct} of ${answered} questions correctly. Every question counts!`,
        );
      } else {
        setSummary("No questions were available this time - check back soon!");
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
        setShowIntro(true);
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

  // Fetch topic name once on mount and guard against accidental navigation away
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const session = await getCurrentSession(childId);
        if (cancelled) return;
        setTopicName(
          session.focusLearningObjective?.name ?? session.subject,
        );
      } catch {
        // Topic name is best-effort; non-fatal if unavailable
      }
    })();

    // Prompt before the user navigates away or closes the tab mid-session.
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (status === "question" || status === "submitting" || status === "feedback") {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, sessionId]);

  // Guard against browser back-button during an active session.
  // pushState creates an extra history entry; popstate lets us intercept the
  // back navigation and confirm with the student before they lose progress.
  useEffect(() => {
    // Only guard when the intro is gone and we're in an active session.
    if (showIntro) return;
    if (status !== "question" && status !== "submitting" && status !== "feedback") return;

    window.history.pushState(null, "");
    function onPopState() {
      setShowBackConfirm(true);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [showIntro, status]);

  function handleBackConfirmLeave() {
    setShowBackConfirm(false);
    void handleFinish();
  }

  function handleBackConfirmStay() {
    setShowBackConfirm(false);
    window.history.pushState(null, "");
  }

  function reload() {
    setStatus("loading");
    setError(null);
    setFunFact(null);
    setReloadKey((key) => key + 1);
  }

  async function handleSubmit() {
    if (!question || !selectedAnswer || !difficulty || status === "submitting") {
      return;
    }

    // Start audio inside the tap gesture — browsers require user interaction
    // for AudioContext. Await so the context is confirmed running before the
    // API call that may be followed by a feedback sound.
    await ensureAudioReady();
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
      setAnsweredCount((count) => {
        const newCount = count + 1;
        if (newCount > 0 && newCount % 6 === 0) {
          setFunFact(getRandomFact());
        }
        return newCount;
      });
      setCorrectCount((count) => count + (result.correct ? 1 : 0));
      setStatus("feedback");
      if (result.levelUp) {
        await playLevelUp();
      } else if (result.correct) {
        await playCorrect();
      } else {
        await playWrong();
      }
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

  if (
    status === "error" ||
    (status === "question" && !question) ||
    (status === "feedback" && !attempt)
  ) {
    return (
      <div className="flex w-full flex-1 flex-col justify-center">
      <div className="rounded-3xl bg-card px-7 py-7 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
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
      </div>
    );
  }

  // Back-navigation guard: shown when the browser back button is pressed mid-session.
  if (showBackConfirm) {
    return (
      <div className="flex w-full flex-1 flex-col justify-center">
        <div className="rounded-3xl bg-card px-7 py-9 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
          <div className="text-center">
            <p className="font-display text-3xl text-ink">
              Wait — don&apos;t go yet!
            </p>
            <p className="mt-4 text-base leading-7 text-ink-soft">
              You&apos;re in the middle of a practice session. If you leave now,
              your progress won&apos;t be saved.
            </p>
          </div>
          <button
            type="button"
            onClick={handleBackConfirmStay}
            className="btn-tactile btn-primary mt-8 w-full rounded-2xl px-4 py-4 font-display text-xl font-semibold"
          >
            Keep practicing
          </button>
          <button
            type="button"
            onClick={handleBackConfirmLeave}
            className="btn-tactile mt-3 w-full rounded-2xl border border-line bg-card px-4 py-3 text-base font-medium text-ink"
          >
            Leave anyway
          </button>
        </div>
      </div>
    );
  }

  if (status === "summary") {
    return (
      <div className="flex w-full flex-1 flex-col justify-center text-center">
        <div className="rounded-3xl bg-card px-7 py-9 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
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
      </div>
    );
  }

  // Session intro — shown once at the start of the first question.
  // Uses the real level-up thresholds from misconception.config.ts:
  //   windowSize=6, strongSuccessThreshold=4
  if (status === "question" && showIntro && topicName) {
    return (
      <div className="flex w-full flex-1 flex-col justify-center">
        <div className="rounded-3xl bg-card px-7 py-9 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
          <div className="text-center">
            <p className="font-display text-4xl text-ink">
              Ready to practice {topicName}?
            </p>
            <p className="mt-4 text-base leading-7 text-ink-soft">
              Answer 4 out of 6 questions correctly{" "}
              <span aria-hidden="true">🎯</span> — and you&apos;ll level up!
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Take your time. The app adjusts to your child&apos;s pace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowIntro(false)}
            className="btn-tactile btn-primary mt-8 w-full rounded-2xl px-4 py-4 font-display text-xl font-semibold"
          >
            Let&apos;s go!
          </button>
          <button
            type="button"
            onClick={() => {
              setShowIntro(false);
              void handleFinish();
            }}
            className="btn-tactile mt-3 w-full rounded-2xl border border-line bg-card px-4 py-3 text-base font-medium text-ink"
          >
            Not ready yet — finish later
          </button>
        </div>
      </div>
    );
  }

  // Fun-fact break — shown after every 6 questions.
  if (status === "feedback" && funFact) {
    const categoryEmoji: Record<FunFact["category"], string> = {
      math: "🔢",
      science: "🔬",
      history: "📜",
      nature: "🌿",
    };
    return (
      <div className="flex w-full flex-1 flex-col justify-center">
        <div className="rounded-3xl bg-card px-7 py-9 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
          <p className="text-center text-sm font-medium uppercase tracking-widest text-ink-soft">
            Fun fact
          </p>
          <p
            aria-hidden="true"
            className="mt-3 text-center text-5xl"
          >
            {categoryEmoji[funFact.category]}
          </p>
          <p className="mt-4 text-center font-display text-2xl leading-snug text-ink">
            {funFact.text}
          </p>
          <button
            type="button"
            onClick={() => setFunFact(null)}
            className="btn-tactile btn-primary mt-8 w-full rounded-2xl px-4 py-4 font-display text-xl font-semibold"
          >
            Keep going!
          </button>
          <button
            type="button"
            onClick={() => {
              setFunFact(null);
              void handleFinish();
            }}
            className="btn-tactile mt-3 w-full rounded-2xl border border-line bg-card px-4 py-3 text-base font-medium text-ink"
          >
            Finish for today
          </button>
        </div>
      </div>
    );
  }

  if (status === "feedback" && attempt) {
    return (
      <div className="flex w-full flex-1 flex-col justify-center">
        <div className="rounded-3xl bg-card px-7 py-7 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
          {attempt.levelUp ? (
            <div className="levelup-pop mb-3 rounded-2xl border-2 border-waypoint bg-waypoint/25 px-4 py-4 text-center">
              <p className="font-display text-2xl font-semibold text-ink">
                🎉 Level Up!
              </p>
              <p className="mt-1 text-base text-ink-soft">
                {attempt.levelUp.subject} is now Level{" "}
                {attempt.levelUp.newLevel}
              </p>
              <p aria-hidden="true" className="mt-2 flex justify-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-ink/20" />
                <span className="h-2 w-2 rounded-full bg-ink/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-waypoint" />
              </p>
            </div>
          ) : null}
          <p
            className={`rounded-2xl px-4 py-4 text-center font-display text-2xl font-semibold ${
              attempt.correct
                ? "feedback-pop bg-trail/15 text-trail-deep"
                : "feedback-settle bg-waypoint/25 text-ink"
            }`}
          >
            {attempt.correct ? "🎉 Correct!" : "Not quite."}
          </p>

          <AtlasAvatar
            audioUrl={resolveAudioUrl(question?.audioUrl ?? null)}
          />

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
              Next Question
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
      </div>
    );
  }

  if (!question) {
    // Unreachable in practice (every status that can land here always has
    // a question set - "submitting" only follows a loaded question, and
    // "question" with no question already returned above) - satisfies
    // TypeScript's strict-null check for the access below without masking
    // a real state bug behind a non-null assertion.
    return null;
  }

  return (
    <div className="flex w-full flex-1 flex-col justify-center">
    <div className="rounded-3xl bg-card px-7 py-7 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-waypoint" />
        <span className="text-sm font-medium text-ink-soft">
          {topicName ? `${topicName} · ` : ""}Question {answeredCount + 1}
        </span>
      </div>
      <h2 className="mt-4 font-display text-3xl leading-snug text-ink">
        {question.questionText}
      </h2>

      {!revealFeelings ? (
        <fieldset className="mt-6">
          <legend className="sr-only">Choose your answer</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {question.options.map((option) => (
              <label
                key={option}
                className={`btn-tactile flex min-h-16 cursor-pointer items-center justify-center rounded-2xl border-2 px-4 py-4 text-center text-lg font-semibold tabular-nums ${
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
            Continue
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
    </div>
  );
}
