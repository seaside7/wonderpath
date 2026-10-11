"use client";

import { BookSummary, resolveBookMediaUrl } from "@/lib/api";
import { COVER_BG, CoverArt, themeForBook } from "./cover-art";

/**
 * A book's visual: its real cover/page image when it has one, otherwise the
 * themed illustration. Fills its (positioned) parent.
 */
export default function BookArt({
  book,
  imageUrl,
}: {
  book: Pick<BookSummary, "id" | "title" | "trailStop" | "coverImageUrl">;
  imageUrl?: string | null;
}) {
  const src = resolveBookMediaUrl(imageUrl ?? book.coverImageUrl);
  const theme = themeForBook(book.id, book.trailStop);

  if (src) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={book.title}
          className="h-full w-full object-cover object-[50%_18%]"
        />
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 p-5 ${COVER_BG[theme]}`}>
      <CoverArt theme={theme} />
    </div>
  );
}
