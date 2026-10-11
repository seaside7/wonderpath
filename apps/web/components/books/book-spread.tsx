"use client";

import { AnimationEvent, ReactNode, useSyncExternalStore } from "react";
import { BookDetail } from "@/lib/api";
import BookArt from "./book-art";

/** A page turn in progress; `to` is the reading page it lands on. */
export type PageFlip = { dir: "next" | "prev"; to: number };

const WIDE_QUERY = "(min-width: 768px)";

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Two facing pages on tablets/laptops, one page at a time on phones. */
export function useWideBook(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
}

// Sizes are relative to the page's own height (cqh), so text and picture
// keep the same proportions on any screen instead of following the viewport.
export const TEXT_SIZES = {
  wide: ["text-[3cqh]", "text-[3.4cqh]", "text-[3.85cqh]"],
  narrow: ["text-[2.9cqh]", "text-[3.25cqh]", "text-[3.6cqh]"],
  // Longer pages (higher reading levels): a bit smaller, so the picture
  // can still take about half the page.
  wideDense: ["text-[2.65cqh]", "text-[3cqh]", "text-[3.4cqh]"],
  narrowDense: ["text-[2.6cqh]", "text-[2.9cqh]", "text-[3.2cqh]"],
} as const;
const DENSE_WORDS = 40;
export const TEXT_SIZE_COUNT = 3;

// Paper darkens toward the spine, like a real bound page.
const PAPER = {
  left: "bg-[linear-gradient(to_right,#f4ebd7,#fbf6ea_10%,#fbf6ea_84%,#e6d7b9)]",
  right: "bg-[linear-gradient(to_left,#f4ebd7,#fbf6ea_10%,#fbf6ea_84%,#e6d7b9)]",
} as const;

type Side = "left" | "right";

function imageFor(book: BookDetail, idx: number) {
  return book.pages[idx]?.imageUrl ?? (idx === 0 ? book.coverImageUrl : null);
}

interface StoryPageProps {
  book: BookDetail;
  idx: number;
  side: Side;
  highlighted: number;
  size: number;
  wide: boolean;
}

/** One book page: an illustration fading into the paper, plus its text. */
function StoryPage({ book, idx, side, highlighted, size, wide }: StoryPageProps) {
  const page = book.pages[idx];
  if (!page) return <div className={`absolute inset-0 ${PAPER[side]}`} />;

  const words = page.text.match(/\S+/g) ?? [];
  // Alternate like a picture book: picture on top, then picture below.
  const imageFirst = idx % 2 === 0;
  const dense = words.length > DENSE_WORDS;
  // The picture gets up to ~2/3 of the page (about half on long pages) and
  // only shrinks further when the text needs the room.
  const image = (
    <div
      className={`relative shrink overflow-hidden rounded-md ${
        dense ? "min-h-[30cqh] basis-[48cqh]" : "min-h-[40cqh] basis-[66cqh]"
      } ${
        imageFirst
          ? "[mask-image:linear-gradient(to_bottom,#000_80%,transparent)]"
          : "[mask-image:linear-gradient(to_top,#000_80%,transparent)]"
      }`}
    >
      <BookArt book={book} imageUrl={imageFor(book, idx)} />
    </div>
  );
  const text = (
    <p
      className={`flex flex-1 flex-col justify-center font-display ${
        TEXT_SIZES[wide ? (dense ? "wideDense" : "wide") : dense ? "narrowDense" : "narrow"][size]
      } leading-[1.5] text-[#2b2540] ${imageFirst ? "pt-[3cqh]" : "pb-[3cqh]"}`}
    >
      <span>
      {words.map((word, i) => (
        <span
          key={`${idx}-${i}`}
          className={`rounded px-0.5 transition-colors duration-150 ${
            i === highlighted ? "bg-[#c9ece4]" : ""
          }`}
        >
          {word}{" "}
        </span>
      ))}
      </span>
    </p>
  );

  return (
    <div className={`absolute inset-0 ${PAPER[side]} [container-type:size]`}>
      <div className="flex h-full flex-col px-[7cqw] pb-[6cqh] pt-[5cqh]">
      {imageFirst ? (
        <>
          {image}
          {text}
        </>
      ) : (
        <>
          {text}
          {image}
        </>
      )}
      </div>
      <span
        className={`absolute bottom-[2cqh] text-[1.7cqh] tabular-nums text-[#7a6f5c] ${
          side === "left" ? "left-[6%]" : "right-[6%]"
        }`}
      >
        {idx + 1}
      </span>
    </div>
  );
}

function Ribbon() {
  return (
    <span
      aria-hidden="true"
      className="absolute -top-1.5 right-[9%] z-40 flex h-[24%] w-[5.5%] min-w-6 items-end justify-center bg-[#1f7a72] pb-[18%] text-[#ffd36e] shadow-[2px_3px_6px_rgba(0,0,0,0.25)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)]"
    >
      ★
    </span>
  );
}

function ArrowButton({
  dir,
  label,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`btn-tactile absolute top-1/2 z-50 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow-[0_6px_18px_rgba(46,42,92,0.22)] disabled:opacity-0 sm:h-14 sm:w-14 ${
        dir === "prev" ? "-left-3 sm:-left-7" : "-right-3 sm:-right-7"
      }`}
    >
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}

interface BookSpreadProps {
  book: BookDetail;
  /** The page currently being read (0-based). */
  pageIdx: number;
  wide: boolean;
  flip: PageFlip | null;
  highlighted: number;
  size: number;
  bookmarked: number | null;
  labels: { prev: string; next: string };
  canPrev: boolean;
  onPrev: () => void;
  onNext: () => void;
  onFlipEnd: () => void;
}

export default function BookSpread({
  book,
  pageIdx,
  wide,
  flip,
  highlighted,
  size,
  bookmarked,
  labels,
  canPrev,
  onPrev,
  onNext,
  onFlipEnd,
}: BookSpreadProps) {
  // Only the leaf's own animation ends the turn (shade layers bubble too).
  const handleEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onFlipEnd();
  };
  const live = (idx: number) => (flip === null && idx === pageIdx ? highlighted : -1);
  const page = (idx: number, side: Side, liveIdx = true) => (
    <StoryPage
      book={book}
      idx={idx}
      side={side}
      highlighted={liveIdx ? live(idx) : -1}
      size={size}
      wide={wide}
    />
  );

  let content: ReactNode;
  if (wide) {
    // Spreads are [0,1], [2,3], ... ; a turn moves a whole spread.
    const left = pageIdx - (pageIdx % 2);
    const toLeft = flip ? flip.to - (flip.to % 2) : left;
    const under = {
      left: flip?.dir === "prev" ? toLeft : left,
      right: flip?.dir === "next" ? toLeft + 1 : left + 1,
    };
    const showRibbon =
      bookmarked !== null && flip === null && (bookmarked === left || bookmarked === left + 1);

    content = (
      <div className="relative aspect-[16/10.6] w-full">
        {/* stacked paper edges peeking out around both pages */}
        <div className="absolute inset-y-0 left-0 w-1/2 rounded-l-md shadow-[-2px_2px_0_#efe5cd,-4px_4px_0_#ddcfb0,-6px_5px_0_#f1e8d2,-8px_7px_0_#d6c7a6]">
          <div className="absolute inset-0 overflow-hidden rounded-l-md">{page(under.left, "left")}</div>
        </div>
        <div className="absolute inset-y-0 right-0 w-1/2 rounded-r-md shadow-[2px_2px_0_#efe5cd,4px_4px_0_#ddcfb0,6px_5px_0_#f1e8d2,8px_7px_0_#d6c7a6]">
          <div className="absolute inset-0 overflow-hidden rounded-r-md">{page(under.right, "right")}</div>
        </div>

        {flip ? (
          <div
            className={`book-leaf ${flip.dir === "next" ? "book-leaf-next" : "book-leaf-prev"}`}
            onAnimationEnd={handleEnd}
          >
            <div className={`book-leaf-face ${flip.dir === "next" ? "rounded-r-md" : "rounded-l-md"}`}>
              {flip.dir === "next" ? page(left + 1, "right", false) : page(left, "left", false)}
              <span className="book-leaf-shade-front" />
            </div>
            <div className={`book-leaf-face book-leaf-back ${flip.dir === "next" ? "rounded-l-md" : "rounded-r-md"}`}>
              {flip.dir === "next" ? page(toLeft, "left", false) : page(toLeft + 1, "right", false)}
              <span className="book-leaf-shade-back" />
            </div>
          </div>
        ) : null}

        {/* the gutter where the pages meet the spine */}
        <span className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-[7%] -translate-x-1/2 bg-[linear-gradient(to_right,transparent,rgba(80,55,20,0.18)_45%,rgba(80,55,20,0.28)_50%,rgba(80,55,20,0.18)_55%,transparent)]" />
        {showRibbon ? <Ribbon /> : null}

        <button
          type="button"
          aria-label={labels.prev}
          onClick={onPrev}
          disabled={!canPrev || flip !== null}
          className="absolute inset-y-0 left-0 z-30 w-1/2 cursor-w-resize disabled:cursor-default"
        />
        <button
          type="button"
          aria-label={labels.next}
          onClick={onNext}
          disabled={flip !== null}
          className="absolute inset-y-0 right-0 z-30 w-1/2 cursor-e-resize"
        />
      </div>
    );
  } else {
    const underIdx = flip?.dir === "next" ? flip.to : pageIdx;
    const leafIdx = flip?.dir === "next" ? pageIdx : flip?.to;
    content = (
      <div className="relative aspect-[10/14.5] w-full rounded-r-md shadow-[2px_2px_0_#efe5cd,4px_4px_0_#ddcfb0,6px_5px_0_#f1e8d2]">
        <div className="absolute inset-0 overflow-hidden rounded-r-md">{page(underIdx, "right")}</div>
        {flip && leafIdx !== undefined ? (
          <div
            className={flip.dir === "next" ? "book-leaf-single-next" : "book-leaf-single-prev"}
            onAnimationEnd={handleEnd}
          >
            <div className="absolute inset-0 overflow-hidden rounded-r-md">{page(leafIdx, "right", false)}</div>
          </div>
        ) : null}
        {bookmarked === pageIdx && flip === null ? <Ribbon /> : null}
        <button
          type="button"
          aria-label={labels.prev}
          onClick={onPrev}
          disabled={!canPrev || flip !== null}
          className="absolute inset-y-0 left-0 z-30 w-1/3"
        />
        <button
          type="button"
          aria-label={labels.next}
          onClick={onNext}
          disabled={flip !== null}
          className="absolute inset-y-0 right-0 z-30 w-2/3"
        />
      </div>
    );
  }

  return (
    <div className="book-3d relative w-full">
      {/* thick hardcover around the pages */}
      <div className="rounded-[14px] bg-[linear-gradient(160deg,#c99545,#9c6a28_55%,#7d5219)] px-3 pb-4 pt-2.5 shadow-[0_28px_60px_rgba(70,45,10,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] sm:px-4 sm:pb-5 sm:pt-3">
        {content}
      </div>
      <ArrowButton dir="prev" label={labels.prev} disabled={!canPrev || flip !== null} onClick={onPrev} />
      <ArrowButton dir="next" label={labels.next} disabled={flip !== null} onClick={onNext} />
    </div>
  );
}
