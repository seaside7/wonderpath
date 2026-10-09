"use client";

import { useState } from "react";
import Image from "next/image";

export default function IdleAtlasWidget() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      aria-hidden="true"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="fixed bottom-0 right-0 z-30 h-[16.8rem] w-[16.8rem] select-none drop-shadow-[0_3px_5px_rgba(30,50,90,0.2)] sm:h-[22.4rem] sm:w-[22.4rem]"
    >
      {hovered ? (
        <Image
          src="/mascot/atlas-mouth-toothy-grin.png"
          alt=""
          fill
          sizes="358px"
          priority
          className="object-contain"
          unoptimized
        />
      ) : (
        <>
          <Image
            src="/mascot/atlas-mouth-closed.png"
            alt=""
            fill
            sizes="358px"
            priority
            className="atlas-idle-closed object-contain"
            unoptimized
          />
          <Image
            src="/mascot/atlas-mouth-small-open.png"
            alt=""
            fill
            sizes="358px"
            priority
            className="atlas-idle-open object-contain"
            unoptimized
          />
        </>
      )}
    </div>
  );
}
