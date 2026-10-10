"use client";

import { useState } from "react";
import type { MasteryRecord } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import {
  BUCKET_STYLES,
  MASTERED_THRESHOLD,
  MasteryBucket,
  masteryBucket,
  needsAttention,
} from "./progress-utils";

const COLLAPSED_COUNT = 6;
const BUCKET_ORDER: MasteryBucket[] = ["mastered", "learning", "practice"];

function sortForParent(records: MasteryRecord[]): MasteryRecord[] {
  return [...records].sort((a, b) => {
    const attention = Number(needsAttention(b)) - Number(needsAttention(a));
    return attention !== 0 ? attention : a.masteryScore - b.masteryScore;
  });
}

function DistributionBar({ records }: { records: MasteryRecord[] }) {
  const counts = BUCKET_ORDER.map((bucket) => ({
    bucket,
    count: records.filter((r) => masteryBucket(r.masteryScore) === bucket)
      .length,
  }));

  return (
    <div className="mt-5">
      <div
        aria-hidden="true"
        className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-line"
      >
        {counts
          .filter(({ count }) => count > 0)
          .map(({ bucket, count }) => (
            <span
              key={bucket}
              className={BUCKET_STYLES[bucket].bar}
              style={{ width: `${(count / records.length) * 100}%` }}
            />
          ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {counts.map(({ bucket, count }) => (
          <li key={bucket} className="flex items-center gap-2 text-sm text-ink">
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${BUCKET_STYLES[bucket].dot}`}
            />
            {BUCKET_STYLES[bucket].label}
            <span className="font-semibold tabular-nums">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TopicRow({ record }: { record: MasteryRecord }) {
  const score = Math.round(record.masteryScore);
  const bucket = masteryBucket(score);
  const style = BUCKET_STYLES[bucket];

  return (
    <li className="py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-5 text-ink">
          {record.learningObjectiveName}
        </p>
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            record.reviewRecommended
              ? "bg-violet-100 text-violet-800"
              : style.chip
          }`}
        >
          {record.reviewRecommended ? "Review due" : style.label}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <div
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${record.learningObjectiveName} mastery`}
          className="relative h-2.5 flex-1 rounded-full bg-line"
        >
          <span
            className={`block h-full rounded-full ${style.bar}`}
            style={{ width: `${score}%` }}
          />
          <span
            aria-hidden="true"
            title={`Mastered at ${MASTERED_THRESHOLD}%`}
            className="absolute -top-1 h-[18px] w-0.5 rounded-full bg-ink/35"
            style={{ left: `${MASTERED_THRESHOLD}%` }}
          />
        </div>
        <span className="w-11 text-right text-sm font-semibold tabular-nums text-ink">
          {score}%
        </span>
      </div>
      <p className="mt-1.5 text-xs text-ink-soft">
        {record.correctAttempts} of {record.totalAttempts} correct · practiced{" "}
        {formatRelativeTime(record.lastPracticedAt)}
      </p>
    </li>
  );
}

export default function MasteryProgressSection({
  mastery,
  contextLabel,
}: {
  mastery: MasteryRecord[];
  contextLabel: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const sorted = sortForParent(mastery);
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_COUNT);

  return (
    <section
      aria-labelledby="learning-progress-heading"
      className="rounded-3xl bg-card p-6 shadow-[0_8px_28px_rgba(46,42,92,0.09)] sm:p-7"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="learning-progress-heading"
          className="font-display text-xl text-ink"
        >
          Learning progress
        </h2>
        {contextLabel ? (
          <p className="text-sm text-ink-soft">{contextLabel}</p>
        ) : null}
      </div>

      {mastery.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          No practice yet. Topics will appear here after the first session.
        </p>
      ) : (
        <>
          <DistributionBar records={mastery} />
          <p className="mt-5 text-xs text-ink-soft">
            Topics that need attention are listed first. The line on each bar
            marks {MASTERED_THRESHOLD}%, where a topic counts as mastered.
          </p>
          <ul className="mt-1 flex flex-col divide-y divide-line">
            {visible.map((record) => (
              <TopicRow key={record.learningObjectiveId} record={record} />
            ))}
          </ul>
          {sorted.length > COLLAPSED_COUNT ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              className="btn-tactile mt-2 w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink hover:border-ink-soft"
            >
              {expanded
                ? "Show fewer topics"
                : `Show all ${sorted.length} topics`}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
