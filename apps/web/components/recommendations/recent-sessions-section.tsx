"use client";

import { SessionHistoryItem } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";

function questionsLabel(answered: number, correct: number): string {
  const noun = answered === 1 ? "question" : "questions";
  return `${answered} ${noun}, ${correct} correct`;
}

export default function RecentSessionsSection({
  sessions,
}: {
  sessions: SessionHistoryItem[];
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Recent Sessions</h2>
      {sessions.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          No sessions yet. Start a session and it will show up here.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-zinc-100">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex flex-wrap items-baseline justify-between gap-2 py-3"
            >
              <p className="text-sm font-medium text-zinc-900">
                {session.subject}
              </p>
              <p className="text-sm text-zinc-600">
                {formatRelativeTime(session.startedAt)} ·{" "}
                {questionsLabel(
                  session.questionsAnswered,
                  session.correctCount,
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
