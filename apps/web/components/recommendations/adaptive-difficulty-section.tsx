"use client";

import { AdaptiveDifficultyDetail } from "@/lib/api";
import { ArrowRightIcon, TrendDownIcon, TrendUpIcon } from "@/components/ui/icons";

const MAX_LEVEL = 5;

const DIRECTION: Record<
  AdaptiveDifficultyDetail["direction"],
  { label: string; chip: string; Icon: typeof TrendUpIcon }
> = {
  increase: {
    label: "Moving up",
    chip: "bg-trail/15 text-emerald-800",
    Icon: TrendUpIcon,
  },
  maintain: {
    label: "Steady",
    chip: "bg-sky-100 text-sky-800",
    Icon: ArrowRightIcon,
  },
  decrease: {
    label: "Easing back",
    chip: "bg-ink/5 text-ink-soft",
    Icon: TrendDownIcon,
  },
};

export default function AdaptiveDifficultySection({
  levels,
}: {
  levels: AdaptiveDifficultyDetail[];
}) {
  return (
    <section
      aria-labelledby="current-level-heading"
      className="rounded-3xl bg-card p-6 shadow-[0_8px_28px_rgba(46,42,92,0.09)]"
    >
      <h2 id="current-level-heading" className="font-display text-xl text-ink">
        Challenge level
      </h2>
      {levels.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">
          Not enough practice yet for Atlas to set challenge levels.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {levels.map((level) => {
            const direction = DIRECTION[level.direction];
            return (
              <li key={level.subject} className="py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">
                    {level.subject}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${direction.chip}`}
                  >
                    <direction.Icon width={14} height={14} />
                    {direction.label}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <div aria-hidden="true" className="flex flex-1 gap-1">
                    {Array.from({ length: MAX_LEVEL }, (_, index) => (
                      <span
                        key={index}
                        className={`h-2 flex-1 rounded-full ${
                          index < level.currentDifficulty
                            ? "bg-violet-500"
                            : "bg-line"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-ink">
                    Level {level.currentDifficulty} of {MAX_LEVEL}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-ink-soft">
                  {level.rationale}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
