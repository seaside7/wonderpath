"use client";

import { SessionHistoryItem } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";

function questionsLabel(answered: number, correct: number): string {
  const noun = answered === 1 ? "question" : "questions";
  return `${answered} ${noun} answered, ${correct} correct`;
}

export default function RecentSessionsSection({
  sessions,
}: {
  sessions: SessionHistoryItem[];
}) {
  return (
    <section className="rounded-3xl bg-card p-7 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
      <h2 className="font-display text-xl text-ink">Recent Sessions</h2>
      {sessions.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          No sessions yet. Start a session and it will show up here.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-line">
          {sessions.map((session) => (
            <li key={session.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3.5">
              <div>
                <p className="text-sm font-medium text-ink">
                  {session.subject}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {questionsLabel(session.questionsAnswered, session.correctCount)}
                </p>
              </div>
              <p className="text-sm text-ink-soft">
                {formatRelativeTime(session.startedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
