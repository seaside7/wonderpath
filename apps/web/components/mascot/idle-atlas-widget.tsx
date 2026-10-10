"use client";

import { useState } from "react";
import Image from "next/image";
import { MascotMouth, MOUTH_FILENAME } from "@/hooks/useTtsAudio";
import { useAtlasSpeech } from "./atlas-speech";

const OPEN_MOUTHS: MascotMouth[] = [
  "small-open",
  "round-o",
  "wide-open",
  "toothy-grin",
];

export default function IdleAtlasWidget() {
  const [hovered, setHovered] = useState(false);
  const speech = useAtlasSpeech();
  const speaking = speech?.isPlaying ?? false;

  function visibleMouth(): MascotMouth | null {
    if (speaking) return speech?.currentMouth ?? null;
    if (hovered) return "toothy-grin";
    return null;
  }
  const mouth = visibleMouth();

  return (
    <div
      aria-hidden="true"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="fixed bottom-0 right-0 z-30 h-[16.8rem] w-[16.8rem] select-none drop-shadow-[0_3px_5px_rgba(30,50,90,0.2)] sm:h-[22.4rem] sm:w-[22.4rem]"
    >
      {/* Closed-mouth base stays fully opaque; every other mouth is an overlay
          on top of it, so swapping mouths can never show the page through. */}
      <Image
        src="/mascot/atlas-mouth-closed.png"
        alt=""
        fill
        sizes="358px"
        priority
        className="object-contain"
        unoptimized
      />
      <div
        className={`absolute inset-0 transition-opacity duration-200 ${
          hovered || speaking ? "opacity-0" : "opacity-100"
        }`}
      >
        <Image
          src="/mascot/atlas-mouth-small-open.png"
          alt=""
          fill
          sizes="358px"
          priority
          className="atlas-idle-open object-contain"
          unoptimized
        />
      </div>
      {/* All mouths stay mounted (preloaded) so lip-sync swaps are instant. */}
      {OPEN_MOUTHS.map((shape) => (
        <Image
          key={shape}
          src={`/mascot/${MOUTH_FILENAME[shape]}`}
          alt=""
          fill
          sizes="358px"
          priority
          className={`object-contain ${speaking ? "" : "transition-opacity duration-200"} ${
            mouth === shape ? "opacity-100" : "opacity-0"
          }`}
          unoptimized
        />
      ))}
    </div>
  );
}
