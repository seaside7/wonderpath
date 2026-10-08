"use client";

import Image from "next/image";
import { useTtsAudio, MOUTH_FILENAME } from "@/hooks/useTtsAudio";

export default function AtlasAvatar({
  audioUrl,
}: {
  audioUrl: string | null;
}) {
  const { currentMouth, isPlaying, hasError, play, stop } = useTtsAudio({
    audioUrl,
    autoPlay: true,
  });

  if (!audioUrl) return null;

  return (
    <section
      aria-label="Atlas explanation audio"
      className="my-4 flex items-center gap-3 rounded-2xl bg-waypoint/10 px-3 py-2.5 sm:gap-4 sm:px-4"
    >
      <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 sm:h-20 sm:w-20">
        <Image
          src={`/mascot/${MOUTH_FILENAME[currentMouth]}`}
          alt=""
          aria-hidden="true"
          fill
          sizes="80px"
          className="object-contain"
          unoptimized
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-semibold text-ink">
          Atlas explains
        </p>
        <p aria-live="polite" className="mt-0.5 text-sm text-ink-soft">
          {hasError
            ? "Audio could not play. Try again."
            : isPlaying
              ? "Speaking…"
              : "Hear the explanation"}
        </p>
      </div>

      <button
        type="button"
        onClick={isPlaying ? stop : play}
        className="btn-tactile shrink-0 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-waypoint shadow-sm transition-colors hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-waypoint"
      >
        {isPlaying ? "Stop" : hasError ? "Retry" : "Replay"}
      </button>
    </section>
  );
}
