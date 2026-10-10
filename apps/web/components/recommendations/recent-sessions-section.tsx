"use client";

import { SessionHistoryItem } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { ClockIcon } from "@/components/ui/icons";
import { BUCKET_STYLES, masteryBucket } from "./progress-utils";

const SHOWN = 5;

export default function RecentSessionsSection({
  sessions,
}: {
  sessions: SessionHistoryItem[];
}) {
  const recent = sessions.slice(0, SHOWN);

  return (
    <section
      aria-labelledby="recent-sessions-heading"
      className="rounded-3xl bg-card p-6 shadow-[0_8px_28px_rgba(46,42,92,0.09)] sm:p-7"
    >
      <h2
        id="recent-sessions-heading"
        className="font-display text-xl text-ink"
      >
        Recent sessions
      </h2>
      {recent.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          No sessions yet. Start a session and it will show up here.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {recent.map((session) => {
            const accuracy =
              session.questionsAnswered > 0
                ? Math.round(
                    (session.correctCount / session.questionsAnswered) * 100,
                  )
                : null;
            const style =
              accuracy === null ? null : BUCKET_STYLES[masteryBucket(accuracy)];
            return (
              <li
                key={session.id}
                className="flex items-center justify-between gap-3 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-ink-soft">
                    <ClockIcon width={16} height={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {session.subject}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {formatRelativeTime(session.startedAt)}
                    </p>
                  </div>
                </div>
                {accuracy === null ? (
                  <span className="text-xs text-ink-soft">No answers</span>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm tabular-nums text-ink-soft">
                      {session.correctCount}/{session.questionsAnswered}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${style?.chip}`}
                    >
                      {accuracy}% correct
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
