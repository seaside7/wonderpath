"use client";

import { MisconceptionSignal } from "@/lib/api";
import { misconceptionSentence } from "@/lib/format";

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
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Things to Watch</h2>
      <ul className="mt-4 flex flex-col divide-y divide-zinc-100">
        {confirmed.map((signal) => (
          <li key={signal.id} className="py-3">
            <p className="text-sm font-medium text-zinc-900">
              {signal.learningObjective.name}
            </p>
            <p className="mt-0.5 text-sm text-zinc-600">
              {childFirstName} {misconceptionSentence(signal.signalType)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Confirmed · {evidenceLabel(signal.evidenceCount)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
