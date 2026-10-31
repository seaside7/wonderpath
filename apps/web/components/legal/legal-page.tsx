import Link from "next/link";
import type { LegalLocale, PRIVACY } from "./legal-content";

type Doc = (typeof PRIVACY)[LegalLocale];

export default function LegalPage({ doc, locale }: { doc: Doc; locale: LegalLocale }) {
  return (
    <main lang={locale} className="min-h-dvh bg-fog px-5 py-12">
      <article className="mx-auto max-w-2xl rounded-3xl bg-card px-7 py-9 shadow-[0_8px_28px_rgba(46,42,92,0.09)]">
        <Link href={locale === "en" ? "/en" : "/"} className="text-sm font-semibold text-coral-deep">
          ← WonderPath
        </Link>
        <h1 className="mt-3 font-display text-4xl text-ink">{doc.title}</h1>
        <p className="mt-1 text-sm text-ink-soft">{doc.updated}</p>
        {doc.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="font-display text-xl text-ink">{section.heading}</h2>
            {section.paragraphs.map((text) => (
              <p key={text} className="mt-2 leading-7 text-ink-soft">
                {text}
              </p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
