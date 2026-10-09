import Image from "next/image";

export default function IdleAtlasWidget() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-4 right-4 z-30 h-24 w-24 select-none drop-shadow-[0_3px_5px_rgba(30,50,90,0.2)] sm:bottom-6 sm:right-6 sm:h-32 sm:w-32"
    >
      <Image
        src="/mascot/atlas-mouth-closed.png"
        alt=""
        fill
        sizes="128px"
        className="atlas-idle-closed object-contain"
        unoptimized
      />
      <Image
        src="/mascot/atlas-mouth-small-open.png"
        alt=""
        fill
        sizes="128px"
        className="atlas-idle-open object-contain"
        unoptimized
      />
    </div>
  );
}
