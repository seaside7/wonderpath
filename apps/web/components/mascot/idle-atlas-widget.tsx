import Image from "next/image";

export default function IdleAtlasWidget() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-3 right-3 z-30 h-[4.5rem] w-[4.5rem] select-none drop-shadow-[0_3px_5px_rgba(30,50,90,0.2)] sm:bottom-5 sm:right-5 sm:h-20 sm:w-20"
    >
      <Image
        src="/mascot/atlas-mouth-closed.png"
        alt=""
        fill
        sizes="80px"
        className="atlas-idle-closed object-contain"
        unoptimized
      />
      <Image
        src="/mascot/atlas-mouth-small-open.png"
        alt=""
        fill
        sizes="80px"
        className="atlas-idle-open object-contain"
        unoptimized
      />
    </div>
  );
}
