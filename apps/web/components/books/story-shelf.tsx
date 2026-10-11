"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookSummary, fetchBooks } from "@/lib/api";
import BookArt from "./book-art";

function statusOf(book: BookSummary): { label: string; tone: string } | null {
  const reading = book.reading;
  if (!reading) return null;
  if (reading.completedAt) {
    return {
      label:
        reading.quizScore !== null
          ? `Finished · ${reading.quizScore}/3 ⭐`
          : "Finished",
      tone: "bg-trail text-ink",
    };
  }
  return { label: `Continue · page ${reading.lastPage}`, tone: "bg-waypoint text-ink" };
}

export default function StoryShelf({ childId }: { childId: string }) {
  const [books, setBooks] = useState<BookSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBooks(childId)
      .then((data) => {
        if (!cancelled) setBooks(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the books right now.");
      });
    return () => {
      cancelled = true;
    };
  }, [childId]);

  const stops = books
    ? [...new Set(books.map((book) => book.trailStop))].sort((a, b) => a - b)
    : [];

  return (
    <div className="flex w-full flex-1 flex-col">
      <Link
        href={`/learn/${childId}`}
        className="btn-tactile mb-5 inline-flex items-center gap-2 self-start rounded-full border-2 border-line bg-card px-4 py-2 text-sm font-semibold text-ink shadow-[0_3px_0_rgba(46,42,92,0.1)]"
      >
        <span aria-hidden="true">←</span> Back to today
      </Link>

      <p className="text-sm font-semibold text-waypoint">Story Trail</p>
      <h1 className="mt-1 font-display text-4xl text-ink">Pick a story</h1>
      <p className="mb-7 mt-2 text-base text-ink-soft">
        Read on your own, or let Atlas read it to you.
      </p>

      {error ? (
        <p className="rounded-2xl bg-coral/10 px-4 py-3 text-base text-coral-deep">{error}</p>
      ) : null}
      {!books && !error ? <p className="text-base text-ink-soft">Loading…</p> : null}
      {books && books.length === 0 ? (
        <p className="rounded-2xl bg-card px-5 py-6 text-base text-ink-soft">
          New stories are on their way. Check back soon!
        </p>
      ) : null}

      <div className="flex flex-col gap-9">
        {stops.map((stop) => (
          <section key={stop} aria-labelledby={`stop-${stop}`}>
            <h2
              id={`stop-${stop}`}
              className="mb-3 flex items-center gap-2.5 font-display text-xl text-ink"
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-waypoint text-sm font-bold"
              >
                {stop}
              </span>
              Level {stop}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {books
                ?.filter((book) => book.trailStop === stop)
                .map((book) => {
                  const status = statusOf(book);
                  return (
                    <li key={book.id}>
                      <Link
                        href={`/learn/${childId}/books/${book.id}`}
                        className="btn-tactile flex h-full flex-col overflow-hidden rounded-3xl bg-card shadow-[0_8px_28px_rgba(46,42,92,0.09)]"
                      >
                        <span className="relative block aspect-[10/7]">
                          <BookArt book={book} />
                          {status ? (
                            <span
                              className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-extrabold ${status.tone}`}
                            >
                              {status.label}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex flex-1 flex-col p-5">
                          <span className="font-display text-xl leading-snug text-ink">
                            {book.title}
                          </span>
                          <span className="mt-1.5 text-sm leading-6 text-ink-soft">
                            {book.summary}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
