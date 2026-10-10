"use client";

import { MisconceptionSignal } from "@/lib/api";
import { misconceptionSentence } from "@/lib/format";
import { AlertIcon } from "@/components/ui/icons";

function evidenceLabel(count: number): string {
  return count === 1 ? "1 piece of evidence" : `${count} pieces of evidence`;
}

export default function MisconceptionsSection({
  signals,
  childFirstName,
}: {
  signals: MisconceptionSignal[];
  childFirstName: string;
}) {
  const confirmed = signals.filter(
    (signal) => signal.status === "CONFIRMED",
  );

  // Silence here is correct: only solid, confirmed signals are shown.
  if (confirmed.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="watch-heading"
      className="rounded-3xl border-l-4 border-waypoint bg-card p-6 shadow-[0_8px_28px_rgba(46,42,92,0.09)]"
    >
      <h2
        id="watch-heading"
        className="flex items-center gap-2 font-display text-xl text-ink"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-waypoint/25 text-amber-800">
          <AlertIcon width={16} height={16} />
        </span>
        Things to watch
      </h2>
      <ul className="mt-3 flex flex-col divide-y divide-line">
        {confirmed.map((signal) => (
          <li key={signal.id} className="py-3.5">
            <p className="text-sm font-medium text-ink">
              {signal.learningObjective.name}
            </p>
            <p className="mt-0.5 text-sm text-ink-soft">
              {childFirstName} {misconceptionSentence(signal.signalType)}
            </p>
            <p className="mt-1.5 text-xs text-ink-soft">
              Confirmed, based on {evidenceLabel(signal.evidenceCount)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
