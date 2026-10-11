"use client";

import { AnimationEvent, ReactNode, useSyncExternalStore } from "react";
import { BookDetail } from "@/lib/api";
import BookArt from "./book-art";

export type PageFlip = { dir: "next" | "prev"; to: number };

const WIDE_QUERY = "(min-width: 768px)";
const PAPER = "bg-[#fffaf0]";

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Two-page spread on tablets/laptops, a single page on phones. */
function useWideBook(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
}

function imageFor(book: BookDetail, idx: number) {
  return book.pages[idx]?.imageUrl ?? (idx === 0 ? book.coverImageUrl : null);
}

interface FaceProps {
  book: BookDetail;
  idx: number;
}

function Picture({ book, idx }: FaceProps) {
  return (
    <div className={`absolute inset-0 ${PAPER} p-[6%]`}>
      <div className="relative h-full w-full overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_rgba(46,42,92,0.08)]">
        <BookArt book={book} imageUrl={imageFor(book, idx)} />
      </div>
      {/* gutter shadow toward the spine */}
      <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[rgba(46,42,92,0.16)] to-transparent" />
    </div>
  );
}

function Words({ book, idx, highlighted }: FaceProps & { highlighted: number }) {
  const words = book.pages[idx]?.text.match(/\S+/g) ?? [];
  return (
    <>
      {words.map((word, i) => (
        <span
          key={`${idx}-${i}`}
          className={`rounded-md px-0.5 transition-colors ${
            i === highlighted ? "bg-waypoint" : ""
          }`}
        >
          {word}{" "}
        </span>
      ))}
    </>
  );
}

function Text({ book, idx, highlighted }: FaceProps & { highlighted: number }) {
  return (
    <div className={`absolute inset-0 flex flex-col ${PAPER} px-[9%] pb-[6%] pt-[8%]`}>
      <p className="my-auto text-[clamp(1.05rem,2.2vw,1.45rem)] leading-[1.8] text-ink">
        <Words book={book} idx={idx} highlighted={highlighted} />
      </p>
      <span className="text-right text-xs font-semibold tabular-nums text-ink-soft">
        {idx + 1}
      </span>
      <span className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[rgba(46,42,92,0.16)] to-transparent" />
    </div>
  );
}

function SinglePage({ book, idx, highlighted }: FaceProps & { highlighted: number }) {
  return (
    <div className={`${PAPER} rounded-xl p-3`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
        <BookArt book={book} imageUrl={imageFor(book, idx)} />
      </div>
      <p className="px-2 pb-1 pt-4 text-[1.3rem] leading-[1.8] text-ink">
        <Words book={book} idx={idx} highlighted={highlighted} />
      </p>
      <p className="px-2 text-right text-xs font-semibold tabular-nums text-ink-soft">
        {idx + 1}
      </p>
    </div>
  );
}

interface BookSpreadProps {
  book: BookDetail;
  pageIdx: number;
  flip: PageFlip | null;
  highlighted: number;
  canPrev: boolean;
  onPrev: () => void;
  onNext: () => void;
  onFlipEnd: () => void;
}

export default function BookSpread({
  book,
  pageIdx,
  flip,
  highlighted,
  canPrev,
  onPrev,
  onNext,
  onFlipEnd,
}: BookSpreadProps) {
  const wide = useWideBook();

  // Only the leaf's own animation ends the turn (shade layers bubble too).
  const handleEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onFlipEnd();
  };

  const turnZones = (
    <>
      <button
        type="button"
        aria-label="Previous page"
        onClick={onPrev}
        disabled={!canPrev || flip !== null}
        className="absolute inset-y-0 left-0 z-30 w-1/2 cursor-w-resize disabled:cursor-default"
      />
      <button
        type="button"
        aria-label="Next page"
        onClick={onNext}
        disabled={flip !== null}
        className="group absolute inset-y-0 right-0 z-30 w-1/2 cursor-e-resize"
      >
        {/* dog-ear hint in the bottom-right corner */}
        <span
          aria-hidden="true"
          className="book-corner absolute bottom-0 right-0 h-9 w-9 rounded-tl-lg bg-[linear-gradient(135deg,#efe4cc_50%,transparent_50%)] shadow-[-2px_-2px_4px_rgba(46,42,92,0.12)]"
        />
      </button>
    </>
  );

  let content: ReactNode;
  if (wide) {
    const leftIdx = flip?.dir === "prev" ? flip.to : pageIdx;
    const rightIdx = flip?.dir === "next" ? flip.to : pageIdx;
    content = (
      <div className="relative aspect-[16/10] w-full">
        <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden rounded-l-xl">
          <Picture book={book} idx={leftIdx} />
        </div>
        <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden rounded-r-xl">
          <Text book={book} idx={rightIdx} highlighted={flip === null ? highlighted : -1} />
        </div>
        {flip ? (
          <div
            className={`book-leaf ${flip.dir === "next" ? "book-leaf-next" : "book-leaf-prev"}`}
            onAnimationEnd={handleEnd}
          >
            <div
              className={`book-leaf-face ${flip.dir === "next" ? "rounded-r-xl" : "rounded-l-xl"}`}
            >
              {flip.dir === "next" ? (
                <Text book={book} idx={pageIdx} highlighted={-1} />
              ) : (
                <Picture book={book} idx={pageIdx} />
              )}
              <span className="book-leaf-shade-front" />
            </div>
            <div
              className={`book-leaf-face book-leaf-back ${flip.dir === "next" ? "rounded-l-xl" : "rounded-r-xl"}`}
            >
              {flip.dir === "next" ? (
                <Picture book={book} idx={flip.to} />
              ) : (
                <Text book={book} idx={flip.to} highlighted={-1} />
              )}
              <span className="book-leaf-shade-back" />
            </div>
          </div>
        ) : null}
        {/* spine */}
        <span className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px -translate-x-1/2 bg-[rgba(46,42,92,0.18)]" />
        {turnZones}
      </div>
    );
  } else {
    const underIdx = flip?.dir === "next" ? flip.to : pageIdx;
    const leafIdx = flip?.dir === "next" ? pageIdx : flip?.to;
    content = (
      <div className="relative">
        <SinglePage book={book} idx={underIdx} highlighted={flip === null ? highlighted : -1} />
        {flip && leafIdx !== undefined ? (
          <div
            className={flip.dir === "next" ? "book-leaf-single-next" : "book-leaf-single-prev"}
            onAnimationEnd={handleEnd}
          >
            <div className="absolute inset-0 overflow-hidden rounded-xl">
              <SinglePage book={book} idx={leafIdx} highlighted={-1} />
            </div>
          </div>
        ) : null}
        {turnZones}
      </div>
    );
  }

  return (
    <div className="book-3d w-full">
      {/* hard cover, with a few page edges peeking out at the bottom */}
      <div className="rounded-[22px] bg-ink p-2 shadow-[0_24px_50px_rgba(46,42,92,0.28)] sm:p-2.5">
        <div className="rounded-xl shadow-[0_3px_0_#efe4cc,0_6px_0_#e4d7ba]">{content}</div>
      </div>
    </div>
  );
}
