"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ChildProfile,
  fetchPoints,
  fetchRedemptions,
  fetchSessionHistory,
  PointsData,
  SessionHistoryItem,
} from "@/lib/api";
import { avatarColor } from "@/lib/format";
import { ArrowRightIcon } from "@/components/ui/icons";
import {
  buildWeek,
  summarizeWeek,
} from "@/components/recommendations/progress-utils";

const PERIOD_LABEL: Record<NonNullable<PointsData["goal"]>["period"], string> = {
  DAILY: "today",
  WEEKLY: "this week",
  MONTHLY: "this month",
};

interface CardData {
  sessions: SessionHistoryItem[] | null;
  points: PointsData | null;
  pendingRequests: number;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-fog px-3 py-2.5">
      <p className="text-lg font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-xs text-ink-soft">{label}</p>
    </div>
  );
}

export default function ChildSummaryCard({
  child,
  onDelete,
}: {
  child: ChildProfile;
  onDelete: (child: ChildProfile) => void;
}) {
  const [data, setData] = useState<CardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Each piece is optional: one failing call shouldn't blank the whole card.
    void Promise.allSettled([
      fetchSessionHistory(child.id, 50),
      fetchPoints(child.id),
      fetchRedemptions(child.id, "PENDING"),
    ]).then(([history, points, pending]) => {
      if (cancelled) return;
      setData({
        sessions: history.status === "fulfilled" ? history.value.sessions : null,
        points: points.status === "fulfilled" ? points.value : null,
        pendingRequests:
          pending.status === "fulfilled" ? pending.value.length : 0,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [child.id]);

  const week = data?.sessions ? summarizeWeek(buildWeek(data.sessions)) : null;
  const goal = data?.points?.goal ?? null;
  const goalPercent = goal
    ? Math.min(100, Math.round((goal.progress / goal.target) * 100))
    : 0;
  const displayName = child.nickname?.trim() || child.fullName;

  return (
    <li className="flex flex-col rounded-3xl bg-card p-6 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
      <div className="flex items-start gap-4">
        <span
          aria-hidden="true"
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-display text-2xl font-bold text-white ${avatarColor(child.fullName)}`}
        >
          {displayName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-2xl text-ink">
            {displayName}
          </h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            {child.grade} · {child.curricula.join(" + ")}
          </p>
        </div>
        {data && data.pendingRequests > 0 ? (
          <Link
            href={`/children/${child.id}/rewards`}
            className="shrink-0 rounded-full bg-coral px-3 py-1 text-xs font-semibold text-white hover:bg-coral-deep"
          >
            {data.pendingRequests} reward{" "}
            {data.pendingRequests === 1 ? "request" : "requests"}
          </Link>
        ) : null}
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">
          This week
        </p>
        {data === null ? (
          <div className="mt-2 grid animate-pulse grid-cols-2 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="h-[58px] rounded-xl bg-line" />
            ))}
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat
              value={week ? `${week.activeDays}/7` : "–"}
              label="practice days"
            />
            <Stat value={week ? String(week.questions) : "–"} label="questions" />
            <Stat
              value={week?.accuracy != null ? `${week.accuracy}%` : "–"}
              label="correct"
            />
            <Stat
              value={
                data.points ? `⭐ ${data.points.balance.toLocaleString()}` : "–"
              }
              label="points"
            />
          </div>
        )}
      </div>

      {goal ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-ink">
              Goal {PERIOD_LABEL[goal.period]}
            </span>
            <span className="tabular-nums text-ink-soft">
              {goal.progress.toLocaleString()} / {goal.target.toLocaleString()} ⭐
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={goalPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Points goal ${PERIOD_LABEL[goal.period]}`}
            className="mt-1.5 h-2.5 rounded-full bg-line"
          >
            <span
              className={`block h-full rounded-full ${goalPercent >= 100 ? "bg-trail" : "bg-violet-500"}`}
              style={{ width: `${goalPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <Link
          href={`/children/${child.id}/recommendations`}
          className="btn-tactile btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          View progress
          <ArrowRightIcon width={16} height={16} />
        </Link>
        <Link
          href={`/children/${child.id}/start`}
          className="btn-tactile rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink hover:border-ink-soft"
        >
          Start learning
        </Link>
        <Link
          href={`/children/${child.id}/rewards`}
          className="btn-tactile rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink hover:border-ink-soft"
        >
          Goals &amp; rewards
        </Link>
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-line pt-3 text-sm">
        <Link
          href={`/children/${child.id}/edit`}
          className="rounded font-medium text-ink-soft hover:text-ink"
        >
          Edit profile
        </Link>
        <button
          type="button"
          onClick={() => onDelete(child)}
          className="rounded font-medium text-orange-800 hover:text-coral-deep"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
