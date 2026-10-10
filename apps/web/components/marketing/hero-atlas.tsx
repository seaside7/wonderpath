"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// Transparent (alpha) WebM plays in Chromium and Firefox. WebKit (Safari and
// every iOS browser) can't render VP9 alpha, so those keep the still poster.
function canPlayAlphaVideo(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isDesktopSafari =
    /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox|OPR/.test(ua);
  if (isIOS || isDesktopSafari) return false;
  return (
    document
      .createElement("video")
      .canPlayType('video/webm; codecs="vp9"') !== ""
  );
}

export default function HeroAtlas({ alt }: { alt: string }) {
  const [useVideo, setUseVideo] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && canPlayAlphaVideo()) setUseVideo(true);
  }, []);

  return (
    <div className="relative aspect-[3/2] w-full">
      <Image
        src="/mascot/video/atlas-hero-poster.webp"
        alt={alt}
        fill
        priority
        sizes="(min-width: 768px) 520px, 92vw"
        className={`object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.35)] transition-opacity duration-500 ${
          useVideo ? "" : "mk-float"
        } ${playing ? "opacity-0" : "opacity-100"}`}
      />
      {useVideo ? (
        <video
          aria-hidden="true"
          autoPlay
          muted
          loop
          playsInline
          width={840}
          height={560}
          onPlaying={() => setPlaying(true)}
          className={`absolute inset-0 h-full w-full object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.35)] transition-opacity duration-500 ${
            playing ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src="/mascot/video/atlas-hero.webm" type='video/webm; codecs="vp9"' />
        </video>
      ) : null}
    </div>
  );
}
