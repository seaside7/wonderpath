import type { ComponentType, SVGProps } from "react";
import type { MasteryRecord, SessionHistoryItem } from "@/lib/api";
import {
  CalendarIcon,
  CheckCircleIcon,
  TargetIcon,
  TrophyIcon,
} from "@/components/ui/icons";
import {
  buildWeek,
  MASTERED_THRESHOLD,
  summarizeWeek,
} from "./progress-utils";

function StatTile({
  icon: IconComponent,
  tint,
  value,
  label,
  hint,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tint: string;
  value: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}
      >
        <IconComponent width={18} height={18} />
      </span>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-ink">
        {value}
      </p>
      <p className="mt-0.5 text-sm font-medium text-ink">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export default function ProgressSummary({
  firstName,
  sessions,
  mastery,
}: {
  firstName: string;
  sessions: SessionHistoryItem[];
  mastery: MasteryRecord[];
}) {
  const week = buildWeek(sessions);
  const { activeDays, questions, correct, accuracy } = summarizeWeek(week);
  const mastered = mastery.filter(
    (record) => record.masteryScore >= MASTERED_THRESHOLD,
  ).length;
  const busiest = Math.max(1, ...week.map((day) => day.questions));

  return (
    <section
      aria-labelledby="week-summary-heading"
      className="rounded-3xl bg-card p-6 shadow-[0_8px_28px_rgba(46,42,92,0.09)] sm:p-7"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-soft">
            This week
          </p>
          <h2
            id="week-summary-heading"
            className="mt-2 font-display text-2xl text-ink sm:text-3xl"
          >
            {activeDays === 0
              ? `${firstName} hasn't practiced yet this week`
              : `${firstName} practiced on ${activeDays} ${activeDays === 1 ? "day" : "days"} this week`}
          </h2>
          <p className="mt-1.5 text-sm text-ink-soft">
            {activeDays === 0
              ? "Even a 10-minute session today makes a difference."
              : `${questions} questions answered, ${accuracy}% correct.`}
          </p>
        </div>

        <ol
          aria-label="Questions answered each day, last 7 days"
          className="flex shrink-0 items-end gap-2"
        >
          {week.map((day) => {
            const label = new Date(day.time).toLocaleDateString("en-US", {
              weekday: "short",
            });
            const height =
              day.questions > 0
                ? Math.max(12, Math.round((day.questions / busiest) * 64))
                : 4;
            return (
              <li key={day.time} className="flex w-8 flex-col items-center gap-1.5">
                <span className="sr-only">
                  {label}: {day.questions} questions
                </span>
                <span
                  aria-hidden="true"
                  className="text-[11px] font-medium tabular-nums text-ink-soft"
                >
                  {day.questions > 0 ? day.questions : ""}
                </span>
                <span
                  aria-hidden="true"
                  className={`w-full rounded-md ${day.questions > 0 ? "bg-violet-400" : "bg-line"}`}
                  style={{ height }}
                />
                <span
                  aria-hidden="true"
                  className={`text-xs ${day.isToday ? "font-semibold text-ink" : "text-ink-soft"}`}
                >
                  {day.isToday ? "Today" : label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={CalendarIcon}
          tint="bg-violet-100 text-violet-700"
          value={`${activeDays}/7`}
          label="Practice days"
        />
        <StatTile
          icon={CheckCircleIcon}
          tint="bg-sky-100 text-sky-700"
          value={String(questions)}
          label="Questions answered"
          hint="Last 7 days"
        />
        <StatTile
          icon={TargetIcon}
          tint="bg-trail/15 text-emerald-800"
          value={accuracy === null ? "–" : `${accuracy}%`}
          label="Accuracy"
          hint={accuracy === null ? "No answers yet" : `${correct} of ${questions} correct`}
        />
        <StatTile
          icon={TrophyIcon}
          tint="bg-waypoint/25 text-amber-800"
          value={String(mastered)}
          label="Topics mastered"
          hint={`of ${mastery.length} practiced`}
        />
      </div>
    </section>
  );
}
