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
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Current Level</h2>
        <p className="mt-4 text-sm text-zinc-500">
          Not enough practice yet for Atlas to set challenge levels.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Current Level</h2>
      <ul className="mt-4 flex flex-col divide-y divide-zinc-100">
        {levels.map((level) => (
          <li key={level.subject} className="py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-zinc-900">
                {level.subject}
              </p>
              <p className="text-sm text-zinc-600">
                Level {level.currentDifficulty} of 5 ·{" "}
                {DIRECTION_LABELS[level.direction]}
              </p>
            </div>
            <p className="mt-1 text-sm text-zinc-600">
              Why: {level.rationale}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
