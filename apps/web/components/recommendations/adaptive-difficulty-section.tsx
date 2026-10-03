"use client";

import { AdaptiveDifficultyDetail } from "@/lib/api";

const DIRECTION_LABELS: Record<AdaptiveDifficultyDetail["direction"], string> =
  {
    increase: "↑ increasing",
    decrease: "↓ decreasing",
    maintain: "→ steady",
  };

export default function AdaptiveDifficultySection({
  levels,
}: {
  levels: AdaptiveDifficultyDetail[];
}) {
  if (levels.length === 0) {
    return (
      <section className="rounded-3xl bg-card p-7 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
        <h2 className="font-display text-xl text-ink">Current Level</h2>
        <p className="mt-4 text-sm text-ink-soft">
          Not enough practice yet for Atlas to set challenge levels.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-card p-7 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
      <h2 className="font-display text-xl text-ink">Current Level</h2>
      <ul className="mt-4 flex flex-col divide-y divide-line">
        {levels.map((level) => (
          <li key={level.subject} className="py-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-ink">{level.subject}</p>
              <p className="text-sm text-ink-soft">
                Level {level.currentDifficulty} of 5, {DIRECTION_LABELS[level.direction]}
              </p>
            </div>
            <p className="mt-1 text-sm text-ink-soft">{level.rationale}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
