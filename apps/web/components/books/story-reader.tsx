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
import BookSpread, { PageFlip, TEXT_SIZES, useWideBook } from "./book-spread";
import { playPageFlip } from "@/lib/sound";

type Phase = "intro" | "read" | "quiz" | "result";
type Narration = "idle" | "loading" | "ready" | "unavailable";

const AUTO_TURN_DELAY_MS = 900;

const LABELS = {
  id: {
    all: "Semua cerita",
    listen: "Dengarkan",
    pause: "Jeda",
    preparing: "Atlas bersiap…",
    unavailable: "Atlas belum bisa membacakan halaman ini.",
    size: "Ukuran teks",
    save: "Simpan",
    saved: "Tersimpan",
    prev: "Halaman sebelumnya",
    next: "Halaman berikutnya",
    quiz: "Lanjut ke kuis",
    pages: (from: number, to: number, total: number) =>
      `Halaman ${from}${to > from ? `–${to}` : ""} dari ${total}`,
  },
  en: {
    all: "All stories",
    listen: "Listen",
    pause: "Pause",
    preparing: "Atlas is getting ready…",
    unavailable: "Atlas can't read this page aloud right now.",
    size: "Text size",
    save: "Bookmark",
    saved: "Bookmarked",
    prev: "Previous page",
    next: "Next page",
    quiz: "Go to the quiz",
    pages: (from: number, to: number, total: number) =>
      `Page${to > from ? "s" : ""} ${from}${to > from ? `–${to}` : ""} of ${total}`,
  },
};

const SIZE_KEY = "wonderpath:reader-size";
const bookmarkKey = (childId: string, bookId: string) =>
  `wonderpath:bookmark:${childId}:${bookId}`;

function readStored(key: string): number | null {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: number | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, String(value));
  } catch {
    // Storage can be blocked; these are conveniences only.
  }
}

// Speech has a short lead-in and tail; keep the estimate inside the voiced part.
function estimateTimings(text: string, duration: number): BookWordTiming[] {
  const words = text.match(/\S+/g) ?? [];
  const weights = words.map((word) => word.length + 2);
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const start = duration * 0.04;
  const span = duration * 0.9;
  let elapsed = 0;
  return words.map((word, i) => {
    const startSec = start + (elapsed / total) * span;
    elapsed += weights[i];
    return { word, startSec };
  });
}

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
  const [flip, setFlip] = useState<PageFlip | null>(null);
  const [narration, setNarration] = useState<Narration>("idle");
  const [timings, setTimings] = useState<BookWordTiming[] | null>(null);
  const [activeWord, setActiveWord] = useState(-1);
  const wide = useWideBook();
  const [textSize, setTextSize] = useState(() =>
    typeof window === "undefined" ? 1 : Math.min(2, Math.max(0, readStored(SIZE_KEY) ?? 1)),
  );
  const [bookmark, setBookmark] = useState<number | null>(null);

  const [quizIdx, setQuizIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<BookQuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // True only while a page's own narration is playing, so that ending it
  // turns the page - but a manual stop/next/back never does.
  const autoTurnRef = useRef(false);
  const pausedRef = useRef(false);
  const [pageAudioUrl, setPageAudioUrl] = useState<string | null>(null);
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
        const saved = readStored(bookmarkKey(childId, bookId));
        const marked =
          saved !== null && saved >= 0 && saved < data.pages.length ? saved : null;
        setBookmark(marked);
        if (data.reading && !data.reading.completedAt) {
          setMode(data.reading.mode);
          setPageIdx(marked ?? Math.min(data.reading.lastPage, data.pages.length) - 1);
        } else if (marked !== null) {
          setPageIdx(marked);
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
      if (!book || flip) return;
      autoTurnRef.current = false;
      // Wide screens turn a whole spread ([0,1], [2,3], ...) at a time.
      const next = wide ? pageIdx - (pageIdx % 2) + delta * 2 : pageIdx + delta;
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
      speakRef.current?.(null);
      void playPageFlip();
      void saveBookProgress(childId, bookId, {
        mode,
        lastPage: next + 1,
      }).catch(() => undefined);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setPageIdx(next);
      } else {
        // BookSpread animates the leaf, then calls finishFlip to land it.
        setFlip({ dir: delta === 1 ? "next" : "prev", to: next });
      }
    },
    [book, flip, wide, pageIdx, lastPageIdx, childId, bookId, mode, pages.length],
  );

  // After Atlas reads a page: move to the facing page, or turn the spread.
  const advance = useCallback(() => {
    const next = pageIdx + 1;
    if (wide && next <= lastPageIdx && next % 2 === 1) {
      autoTurnRef.current = false;
      setPageIdx(next);
      void saveBookProgress(childId, bookId, { mode, lastPage: next + 1 }).catch(
        () => undefined,
      );
      return;
    }
    go(1);
  }, [pageIdx, wide, lastPageIdx, childId, bookId, mode, go]);

  const finishFlip = useCallback(() => {
    if (flip) setPageIdx(flip.to);
    setFlip(null);
  }, [flip]);

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
    setPageAudioUrl(null);
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
        setPageAudioUrl(url);
        setNarration("ready");
        // A child who paused Atlas keeps it quiet until they tap play again.
        if (pausedRef.current) return;
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

  // Word highlight follows the audio clock. Voices without word timings
  // (Indonesian Chirp) get estimated ones: the clip's length spread over the
  // words by character count.
  const getCurrentTime = speech?.getCurrentTime;
  const getDuration = speech?.getDuration;
  const isPlaying = speech?.isPlaying ?? false;
  const pageText = page?.text;
  useEffect(() => {
    if (!isPlaying || !getCurrentTime || !getDuration || !pageText) return;
    let estimated: BookWordTiming[] | null = null;
    let frame = 0;
    const tick = () => {
      let marks = timings;
      if (!marks) {
        const duration = getDuration();
        if (!estimated && duration > 0) estimated = estimateTimings(pageText, duration);
        marks = estimated;
      }
      if (marks) {
        const now = getCurrentTime();
        let index = -1;
        for (let i = 0; i < marks.length; i += 1) {
          if (marks[i].startSec <= now) index = i;
          else break;
        }
        setActiveWord(index);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, timings, getCurrentTime, getDuration, pageText]);

  // When a page's narration ends on its own, turn the page.
  const goRef = useRef(go);
  const advanceRef = useRef(advance);
  useEffect(() => {
    goRef.current = go;
    advanceRef.current = advance;
  });
  useEffect(() => {
    const finished = wasPlayingRef.current && !isPlaying;
    wasPlayingRef.current = isPlaying;
    if (!finished || !autoTurnRef.current) return;
    const timer = window.setTimeout(() => {
      if (autoTurnRef.current) advanceRef.current();
    }, AUTO_TURN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [isPlaying]);

  // Arrow keys turn pages like a real e-reader.
  useEffect(() => {
    if (phase !== "read") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goRef.current(1);
      if (event.key === "ArrowLeft") goRef.current(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  function start(chosen: BookReadingMode) {
    pausedRef.current = false;
    setMode(chosen);
    setPhase("read");
    if (book && pageIdx >= 0) {
      void saveBookProgress(childId, bookId, {
        mode: chosen,
        lastPage: pageIdx + 1,
      }).catch(() => undefined);
    }
  }

  function handleListen() {
    if (mode !== "LISTEN") {
      pausedRef.current = false;
      setMode("LISTEN");
      return;
    }
    if (speech?.isPlaying) {
      autoTurnRef.current = false;
      pausedRef.current = true;
      speech.stop();
      return;
    }
    autoTurnRef.current = true;
    pausedRef.current = false;
    if (speech?.hasAudio) speech.replay();
    else speech?.speak(pageAudioUrl);
  }

  function cycleTextSize() {
    const next = (textSize + 1) % TEXT_SIZES.length;
    setTextSize(next);
    writeStored(SIZE_KEY, next);
  }

  function toggleBookmark() {
    const next = bookmark === pageIdx ? null : pageIdx;
    setBookmark(next);
    writeStored(bookmarkKey(childId, bookId), next);
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
    setFlip(null);
    setPhase("intro");
  }

  const words = useMemo(() => page?.text.match(/\S+/g) ?? [], [page]);
  // Server timings are per word, in order; map proportionally if a mark
  // was ever dropped so the highlight can't run past the end.
  const highlighted =
    activeWord < 0
      ? -1
      : !timings || timings.length === words.length
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
  const t = book.language === "BAHASA_INDONESIA" ? LABELS.id : LABELS.en;
  const spreadFrom = wide ? pageIdx - (pageIdx % 2) : pageIdx;
  const spreadTo = wide ? Math.min(spreadFrom + 1, lastPageIdx) : pageIdx;
  const onLastSpread = spreadTo >= lastPageIdx;
  const listening = mode === "LISTEN" && (speech?.isPlaying ?? false);
  const listenLabel =
    mode === "LISTEN" && narration === "loading" ? t.preparing : listening ? t.pause : t.listen;

  return (
    <div className="relative left-1/2 flex w-[min(1080px,calc(100vw-2.5rem),calc((100dvh-14rem)*1.6))] min-w-[min(100%,22rem)] -translate-x-1/2 flex-col">
      <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Link
          href={`/learn/${childId}/books`}
          className="btn-tactile inline-flex items-center gap-2 justify-self-start rounded-full border-2 border-line bg-card px-4 py-2 text-sm font-semibold text-ink shadow-[0_3px_0_rgba(46,42,92,0.1)]"
        >
          <span aria-hidden="true">←</span>
          <span className="hidden sm:inline">{t.all}</span>
        </Link>
        <h1 className="text-center font-display text-xl leading-tight text-ink sm:text-3xl">
          {book.title}
        </h1>
        <span />
      </div>

      <div className="px-4 sm:px-8">
        <BookSpread
          book={book}
          pageIdx={pageIdx}
          wide={wide}
          flip={flip}
          highlighted={highlighted}
          size={textSize}
          bookmarked={bookmark}
          labels={{ prev: t.prev, next: t.next }}
          canPrev={spreadFrom > 0}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
          onFlipEnd={finishFlip}
        />
      </div>

      <div className="mx-auto mt-7 flex w-full max-w-3xl flex-wrap items-center gap-3 rounded-[28px] bg-card px-4 py-3 shadow-[0_10px_30px_rgba(46,42,92,0.12)] sm:flex-nowrap sm:px-5">
        <button
          type="button"
          onClick={handleListen}
          aria-pressed={listening}
          className="btn-tactile inline-flex items-center gap-2.5 rounded-full border-2 border-line bg-card py-1.5 pl-1.5 pr-4 text-sm font-bold text-ink"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1f7a72] text-white">
            {listening ? (
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            ) : (
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
            )}
          </span>
          {listenLabel}
        </button>
        <button
          type="button"
          onClick={cycleTextSize}
          aria-label={t.size}
          title={t.size}
          className="btn-tactile flex h-12 w-12 items-center justify-center rounded-full border-2 border-line bg-card font-display text-lg font-semibold text-ink"
        >
          A<span className="text-sm">a</span>
        </button>
        <button
          type="button"
          onClick={toggleBookmark}
          aria-pressed={bookmark === pageIdx}
          className="btn-tactile inline-flex items-center gap-2 rounded-full border-2 border-line bg-card px-4 py-2.5 text-sm font-bold text-ink"
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill={bookmark === pageIdx ? "#1f7a72" : "none"} stroke={bookmark === pageIdx ? "#1f7a72" : "currentColor"} strokeWidth="2.2" strokeLinejoin="round"><path d="M6 3h12v18l-6-4.5L6 21z" /></svg>
          {bookmark === pageIdx ? t.saved : t.save}
        </button>

        <div className="ml-auto min-w-[10rem] flex-1 sm:max-w-[16rem]">
          <p className="text-xs font-semibold text-ink-soft">
            {t.pages(spreadFrom + 1, spreadTo + 1, pages.length)}
          </p>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-[#1f7a72] transition-[width] duration-500"
              style={{ width: `${((spreadTo + 1) / pages.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {mode === "LISTEN" && narration === "unavailable" ? (
        <p className="mt-3 text-center text-sm text-ink-soft">{t.unavailable}</p>
      ) : null}
      {onLastSpread ? (
        <button
          type="button"
          onClick={() => go(1)}
          className="btn-tactile btn-primary mx-auto mt-5 rounded-2xl px-8 py-3.5 font-display text-xl font-semibold"
        >
          {t.quiz} →
        </button>
      ) : null}
    </div>
  );
}
