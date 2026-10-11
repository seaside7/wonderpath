import Image from "next/image";
import { BookIcon, VolumeIcon } from "@/components/ui/icons";
import { BookTheme, CONTENT, Locale } from "./content";
import { CoverArt, COVER_BG } from "@/components/books/cover-art";

export default function BooksShowcase({ locale }: { locale: Locale }) {
  const t = CONTENT[locale].books;
  return (
    <section id="books" className="scroll-mt-20 bg-[#f3efff]">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
              <BookIcon width={16} height={16} />
              {t.eyebrow}
              <span className="rounded-full bg-violet-700 px-2.5 py-0.5 tracking-normal text-white normal-case">
                {t.soon}
              </span>
            </p>
            <h2 className="mt-3 font-display text-4xl leading-tight text-ink md:text-5xl">{t.title}</h2>
            <p className="mt-4 text-lg leading-8 text-ink-soft">{t.text}</p>
          </div>
        </div>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {t.items.map((book) => (
            <li
              key={book.title}
              className="mk-reveal group flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0_12px_30px_rgba(46,42,92,0.1)] transition-transform duration-200 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(46,42,92,0.16)]"
            >
              <div className={`relative aspect-[10/7] overflow-hidden ${COVER_BG[book.theme as BookTheme]}`}>
                {book.photo ? (
                  <>
                    <Image
                      src={book.photo}
                      alt={book.title}
                      fill
                      sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover object-[50%_18%] transition-transform duration-300 group-hover:scale-105"
                    />
                    <div
                      aria-hidden="true"
                      className={`absolute inset-x-0 bottom-0 h-1/2 opacity-80 [mask-image:linear-gradient(to_top,#000,transparent)] ${COVER_BG[book.theme as BookTheme]}`}
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 p-4 transition-transform duration-300 group-hover:scale-105">
                    <CoverArt theme={book.theme as BookTheme} />
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-extrabold text-ink">
                  {t.level} {book.level}
                </span>
                {book.biography ? (
                  <span className="absolute right-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-xs font-bold text-white">
                    {t.trueStory}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-xl leading-snug text-ink">{book.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-ink-soft">{book.hook}</p>
                {book.credit ? (
                  <p className="mb-4 mt-1 text-[11px] text-ink-soft/80">{book.credit}</p>
                ) : null}
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <span className="text-xs font-semibold text-ink-soft">{book.genre}</span>
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800">
                    <VolumeIcon width={13} height={13} />
                    {t.readAlong}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-ink-soft">{t.note}</p>
      </div>
    </section>
  );
}
