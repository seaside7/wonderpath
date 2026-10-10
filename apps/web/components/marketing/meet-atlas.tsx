"use client";

import Image from "next/image";
import { useState } from "react";
import {
  MascotMouth,
  MOUTH_FILENAME,
  useTtsAudio,
} from "@/hooks/useTtsAudio";
import { VolumeIcon } from "@/components/ui/icons";

const OPEN_MOUTHS: MascotMouth[] = [
  "small-open",
  "round-o",
  "wide-open",
  "toothy-grin",
];

export default function MeetAtlas({
  greeting,
  bubble,
  tapLabel,
  speakingLabel,
  alt,
}: {
  greeting: string;
  bubble: string;
  tapLabel: string;
  speakingLabel: string;
  alt: string;
}) {
  const [hovered, setHovered] = useState(false);
  const { currentMouth, isPlaying, play } = useTtsAudio({
    audioUrl: greeting,
  });

  const mouth: MascotMouth | null = isPlaying
    ? currentMouth
    : hovered
      ? "toothy-grin"
      : null;

  return (
    <div className="flex flex-col items-center">
      <p
        aria-live="polite"
        className={`relative max-w-xs rounded-3xl bg-white px-5 py-3 text-center text-base font-semibold text-ink shadow-[0_8px_24px_rgba(46,42,92,0.12)] transition-transform duration-200 ${
          isPlaying ? "scale-105" : ""
        }`}
      >
        {bubble}
        <span
          aria-hidden="true"
          className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-white"
        />
      </p>

      <button
        type="button"
        onClick={play}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={tapLabel}
        className="mk-float relative mt-2 aspect-[3/2] w-full max-w-md cursor-pointer rounded-3xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink"
      >
        <Image
          src="/mascot/atlas-mouth-closed.png"
          alt={alt}
          fill
          sizes="(min-width: 768px) 448px, 90vw"
          className="object-contain drop-shadow-[0_18px_24px_rgba(46,42,92,0.25)]"
        />
        {OPEN_MOUTHS.map((shape) => (
          <Image
            key={shape}
            src={`/mascot/${MOUTH_FILENAME[shape]}`}
            alt=""
            fill
            sizes="(min-width: 768px) 448px, 90vw"
            className={`object-contain ${isPlaying ? "" : "transition-opacity duration-200"} ${
              mouth === shape ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </button>

      <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
        <VolumeIcon width={16} height={16} />
        {isPlaying ? speakingLabel : tapLabel}
      </p>
    </div>
  );
}
