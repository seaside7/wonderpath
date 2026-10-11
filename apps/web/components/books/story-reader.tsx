"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookDetail,
  BookQuizResult,
  BookReadingMode,
  BookWordTiming,
  fetchBook,
  fetchBookNarration,
  resolveBookMediaUrl,
  saveBookProgress,
  submitBookQuiz,
} from "@/lib/api";
import { useAtlasSpeech } from "@/components/mascot/atlas-speech";
import BookArt from "./book-art";

type Phase = "intro" | "read" | "quiz" | "result";
type Narration = "idle" | "loading" | "ready" | "unavailable";

const AUTO_TURN_DELAY_MS = 900;

function BackToStories({ childId }: { childId: string }) {
  return (
    <Link
      href={`/learn/${childId}/books`}
      className="btn-tactile inline-flex items-center gap-2 rounded-full border-2 border-line bg-card px-4 py-2 text-sm font-semibold text-ink shadow-[0_3px_0_rgba(46,42,92,0.1)]"
    >
      <span aria-hidden="true">←</span> All stories
    </Link>
  );
}

export default function StoryReader({
  childId,
  bookId,
}: {
  childId: string;
  bookId: string;
}) {
  const speech = useAtlasSpeech();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [mode, setMode] = useState<BookReadingMode>("READ");
  const [pageIdx, setPageIdx] = useState(0);
  const [turn, setTurn] = useState<"next" | "prev">("next");
  const [narration, setNarration] = useState<Narration>("idle");
  const [timings, setTimings] = useState<BookWordTiming[] | null>(null);
  const [activeWord, setActiveWord] = useState(-1);

  const [quizIdx, setQuizIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<BookQuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // True only while a page's own narration is playing, so that ending it
  // turns the page - but a manual stop/next/back never does.
  const autoTurnRef = useRef(false);
  const wasPlayingRef = useRef(false);

  // Latest speak(), kept in a ref so effects don't re-run on every mouth frame.
  const speakRef = useRef(speech?.speak);
  useEffect(() => {
    speakRef.current = speech?.speak;
  });
  // Make sure Atlas stops talking when the reader closes.
  useEffect(() => () => speakRef.current?.(null), []);

  useEffect(() => {
    let cancelled = false;
    fetchBook(childId, bookId)
      .then((data) => {
        if (cancelled) return;
        setBook(data);
        if (data.reading && !data.reading.completedAt) {
          setMode(data.reading.mode);
          setPageIdx(Math.min(data.reading.lastPage, data.pages.length) - 1);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not open this book.");
      });
    return () => {
      cancelled = true;
    };
  }, [childId, bookId]);


  const pages = book?.pages ?? [];
  const page = pages[pageIdx];
  const lastPageIdx = pages.length - 1;

  const go = useCallback(
    (delta: 1 | -1) => {
      if (!book) return;
      autoTurnRef.current = false;
      const next = pageIdx + delta;
      if (next < 0) return;
      if (next > lastPageIdx) {
        speakRef.current?.(null);
        void saveBookProgress(childId, bookId, {
          mode,
          lastPage: pages.length,
          completed: true,
        }).catch(() => undefined);
        setPhase("quiz");
        return;
      }
      setTurn(delta === 1 ? "next" : "prev");
      setPageIdx(next);
      void saveBookProgress(childId, bookId, {
        mode,
        lastPage: next + 1,
      }).catch(() => undefined);
    },
    [book, pageIdx, lastPageIdx, childId, bookId, mode, pages.length],
  );

  // Listen mode: fetch (lazily generated) narration for the visible page.
  const pageNumber = page?.pageNumber;
  useEffect(() => {
    if (phase !== "read" || mode !== "LISTEN" || pageNumber === undefined) {
      return;
    }
    let cancelled = false;
    autoTurnRef.current = false;
    speakRef.current?.(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNarration("loading");
    setTimings(null);
    setActiveWord(-1);
    fetchBookNarration(bookId, pageNumber)
      .then((data) => {
        if (cancelled) return;
        const url = resolveBookMediaUrl(data.audioUrl);
        if (!url) {
          setNarration("unavailable");
          return;
        }
        setTimings(data.wordTimings);
        setNarration("ready");
        autoTurnRef.current = true;
        speakRef.current?.(url);
      })
      .catch(() => {
        if (!cancelled) setNarration("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [phase, mode, bookId, pageNumber]);

  // Leaving Listen mode (or the reading phase) silences Atlas.
  useEffect(() => {
    if (phase !== "read" || mode !== "LISTEN") {
      autoTurnRef.current = false;
      speakRef.current?.(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNarration("idle");
    }
  }, [phase, mode]);

  // Word highlight follows the audio clock.
  const getCurrentTime = speech?.getCurrentTime;
  const isPlaying = speech?.isPlaying ?? false;
  useEffect(() => {
    if (!isPlaying || !timings || !getCurrentTime) return;
    let frame = 0;
    const tick = () => {
      const now = getCurrentTime();
      let index = -1;
      for (let i = 0; i < timings.length; i += 1) {
        if (timings[i].startSec <= now) index = i;
        else break;
      }
      setActiveWord(index);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, timings, getCurrentTime]);

  // When a page's narration ends on its own, turn the page.
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });
  useEffect(() => {
    const finished = wasPlayingRef.current && !isPlaying;
    wasPlayingRef.current = isPlaying;
    if (!finished || !autoTurnRef.current) return;
    const timer = window.setTimeout(() => {
      if (autoTurnRef.current) goRef.current(1);
    }, AUTO_TURN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isPlaying]);

  function start(chosen: BookReadingMode) {
    setMode(chosen);
    setPhase("read");
    if (book && pageIdx >= 0) {
      void saveBookProgress(childId, bookId, {
        mode: chosen,
        lastPage: pageIdx + 1,
      }).catch(() => undefined);
    }
  }

  function toggleMode() {
    autoTurnRef.current = false;
    setMode((value) => (value === "LISTEN" ? "READ" : "LISTEN"));
  }

  async function finishQuiz(finalAnswers: Record<string, string>) {
    if (!book) return;
    setSubmitting(true);
    try {
      const data = await submitBookQuiz(
        childId,
        bookId,
        book.quizQuestions.map((question) => ({
          questionId: question.id,
          selectedAnswer: finalAnswers[question.id] ?? "",
        })),
      );
      setResult(data);
      setPhase("result");
    } catch {
      setError("Could not check your answers. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function chooseAnswer(questionId: string, option: string) {
    if (!book) return;
    const next = { ...answers, [questionId]: option };
    setAnswers(next);
    if (quizIdx < book.quizQuestions.length - 1) {
      setQuizIdx(quizIdx + 1);
    } else {
      void finishQuiz(next);
    }
  }

  function readAgain() {
    setAnswers({});
    setQuizIdx(0);
    setResult(null);
    setError(null);
    setPageIdx(0);
    setTurn("next");
    setPhase("intro");
  }

  const words = useMemo(() => page?.text.match(/\S+/g) ?? [], [page]);
  // Server timings are per word, in order; map proportionally if a mark
  // was ever dropped so the highlight can't run past the end.
  const highlighted =
    activeWord < 0 || !timings
      ? -1
      : timings.length === words.length
        ? activeWord
        : Math.min(
            words.length - 1,
            Math.round((activeWord / timings.length) * words.length),
          );

  if (error && !book) {
    return (
      <div className="flex w-full flex-1 flex-col gap-4">
        <BackToStories childId={childId} />
        <p className="rounded-2xl bg-coral/10 px-4 py-3 text-base text-coral-deep">{error}</p>
      </div>
    );
  }
  if (!book) return <p className="text-base text-ink-soft">Loading…</p>;

  if (phase === "intro") {
    const resuming = book.reading && !book.reading.completedAt && pageIdx > 0;
    return (
      <div className="flex w-full flex-1 flex-col">
        <div className="mb-5">
          <BackToStories childId={childId} />
        </div>
        <div className="overflow-hidden rounded-3xl bg-card shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
          <div className="relative aspect-[10/7]">
            <BookArt book={book} />
          </div>
          <div className="px-7 py-7">
            <p className="text-sm font-semibold text-waypoint">Level {book.trailStop}</p>
            <h1 className="mt-1 font-display text-3xl text-ink">{book.title}</h1>
            <p className="mt-2 text-base leading-7 text-ink-soft">{book.summary}</p>
            {resuming ? (
              <p className="mt-3 text-sm font-semibold text-ink">
                You stopped on page {pageIdx + 1}. We&apos;ll pick up there.
              </p>
            ) : null}
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => start("LISTEN")}
                className="btn-tactile btn-primary w-full rounded-2xl px-4 py-4 font-display text-xl font-semibold"
              >
                🔊 Listen with Atlas
              </button>
              <button
                type="button"
                onClick={() => start("READ")}
                className="btn-tactile w-full rounded-2xl border-2 border-line bg-card px-4 py-3.5 text-base font-semibold text-ink"
              >
                📖 Read by myself
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "quiz") {
    const question = book.quizQuestions[quizIdx];
    return (
      <div className="flex w-full flex-1 flex-col">
        <div className="mb-5">
          <BackToStories childId={childId} />
        </div>
        <div className="rounded-3xl bg-card px-7 py-7 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
          <p className="text-sm font-semibold text-waypoint">
            Story quiz · {quizIdx + 1} of {book.quizQuestions.length}
          </p>
          <div className="mt-2 flex gap-1.5" aria-hidden="true">
            {book.quizQuestions.map((item, i) => (
              <span
                key={item.id}
                className={`h-2 flex-1 rounded-full ${i <= quizIdx ? "bg-waypoint" : "bg-line"}`}
              />
            ))}
          </div>
          <h1 className="mt-5 font-display text-2xl leading-snug text-ink">{question.prompt}</h1>
          {error ? (
            <p className="mt-4 rounded-xl bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">{error}</p>
          ) : null}
          <div className="mt-5 flex flex-col gap-3">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                disabled={submitting}
                onClick={() => chooseAnswer(question.id, option)}
                className="btn-tactile w-full rounded-2xl border-2 border-line bg-card px-4 py-3.5 text-left text-base font-semibold text-ink disabled:opacity-60"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div className="flex w-full flex-1 flex-col">
        <div className="rounded-3xl bg-card px-7 py-7 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
          <p className="text-sm font-semibold text-waypoint">Story finished!</p>
          <h1 className="mt-1 font-display text-4xl text-ink">
            {result.score} / {result.total} ⭐
          </h1>
          <p className="mt-2 text-base text-ink-soft">
            {result.score === result.total
              ? "Perfect! You understood the whole story."
              : "Nice reading! Have a look at the answers below."}
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {result.results.map((item, i) => (
              <li
                key={item.questionId}
                className={`rounded-2xl px-4 py-3 ${item.correct ? "bg-trail/20" : "bg-coral/10"}`}
              >
                <p className="text-sm font-bold text-ink">
                  {item.correct ? "✓" : "✗"} {book.quizQuestions[i]?.prompt}
                </p>
                {!item.correct ? (
                  <p className="mt-1 text-sm text-ink">Answer: {item.correctAnswer}</p>
                ) : null}
                <p className="mt-1 text-sm text-ink-soft">{item.explanation}</p>
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-col gap-3">
            <Link
              href={`/learn/${childId}/books`}
              className="btn-tactile btn-primary block w-full rounded-2xl px-4 py-4 text-center font-display text-xl font-semibold"
            >
              More stories
            </Link>
            <button
              type="button"
              onClick={readAgain}
              className="btn-tactile w-full rounded-2xl border-2 border-line bg-card px-4 py-3.5 text-base font-semibold text-ink"
            >
              Read again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // phase === "read"
  const isLast = pageIdx === lastPageIdx;
  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <BackToStories childId={childId} />
        <span className="text-sm font-semibold text-ink-soft">
          Page {pageIdx + 1} of {pages.length}
        </span>
      </div>

      <div className="book-stage">
        <article
          key={pageIdx}
          className={`book-page overflow-hidden rounded-3xl bg-card shadow-[0_8px_28px_rgba(46,42,92,0.12)] ${
            turn === "next" ? "book-turn-next" : "book-turn-prev"
          }`}
        >
          <div className="relative aspect-[10/6]">
            <BookArt book={book} imageUrl={page.imageUrl ?? (pageIdx === 0 ? book.coverImageUrl : null)} />
          </div>
          <p className="px-6 py-6 text-[1.35rem] leading-[1.9] text-ink sm:text-2xl sm:leading-[1.9]">
            {words.map((word, i) => (
              <span
                key={`${pageIdx}-${i}`}
                className={`rounded-md px-0.5 transition-colors ${
                  i === highlighted ? "bg-waypoint" : ""
                }`}
              >
                {word}{" "}
              </span>
            ))}
          </p>
        </article>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggleMode}
          className="btn-tactile rounded-full border-2 border-line bg-card px-4 py-2 text-sm font-semibold text-ink"
        >
          {mode === "LISTEN" ? "📖 Read by myself" : "🔊 Listen with Atlas"}
        </button>
        {mode === "LISTEN" ? (
          <>
            {narration === "loading" ? (
              <span className="text-sm text-ink-soft">Atlas is getting ready…</span>
            ) : null}
            {narration === "unavailable" ? (
              <span className="text-sm text-ink-soft">Atlas can&apos;t read this page aloud right now.</span>
            ) : null}
            {narration === "ready" ? (
              <button
                type="button"
                onClick={() => {
                  if (speech?.isPlaying) {
                    autoTurnRef.current = false;
                    speech.stop();
                  } else {
                    autoTurnRef.current = true;
                    speech?.replay();
                  }
                }}
                className="btn-tactile rounded-full border-2 border-line bg-card px-4 py-2 text-sm font-semibold text-ink"
              >
                {speech?.isPlaying ? "⏹ Pause Atlas" : "🔊 Hear this page"}
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={pageIdx === 0}
          className="btn-tactile flex-1 rounded-2xl border-2 border-line bg-card px-4 py-3.5 text-base font-semibold text-ink disabled:opacity-40"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          className="btn-tactile btn-primary flex-[2] rounded-2xl px-4 py-3.5 font-display text-xl font-semibold"
        >
          {isLast ? "Finish · Quiz →" : "Next page →"}
        </button>
      </div>
    </div>
  );
}
