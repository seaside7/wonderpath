import Image from "next/image";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import {
  ArrowRightIcon,
  BanIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  CompassIcon,
  HeartIcon,
  LockIcon,
  MailIcon,
  MessageIcon,
  ShieldIcon,
  SparklesIcon,
  StarIcon,
  TargetIcon,
  TrendUpIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { CONTACT, CONTENT, Locale } from "./content";
import TopBar from "./top-bar";
import MeetAtlas from "./meet-atlas";
import HeroAtlas from "./hero-atlas";
import FeaturesGrid from "./features-grid";
import BooksShowcase from "./books-showcase";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function Eyebrow({ children, tone = "dark" }: { children: string; tone?: "dark" | "light" }) {
  return (
    <p
      className={`text-xs font-bold uppercase tracking-[0.18em] ${
        tone === "light" ? "text-waypoint" : "text-coral-deep"
      }`}
    >
      {children}
    </p>
  );
}

/** The dotted WonderPath trail, used as decoration across sections. */
function TrailDecoration({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 600 240" fill="none" className={className}>
      <path
        d="M5 200 C 120 40, 260 260, 380 110 S 560 30, 595 70"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="2 14"
      />
    </svg>
  );
}

function Hero({ locale }: { locale: Locale }) {
  const t = CONTENT[locale].hero;
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,107,74,0.35),transparent_45%),radial-gradient(circle_at_10%_90%,rgba(61,220,151,0.22),transparent_45%),radial-gradient(circle_at_55%_60%,rgba(139,92,246,0.3),transparent_50%)]"
      />
      <TrailDecoration className="pointer-events-none absolute -bottom-6 left-0 w-[140%] max-w-none text-white/25 md:w-full" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-20 pt-12 md:grid-cols-[1.1fr_1fr] md:pb-28 md:pt-20">
        <div className="order-2 md:order-1">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-waypoint">
            <SparklesIcon width={16} height={16} />
            {t.eyebrow}
          </p>
          <h1 className="mt-5 font-display text-[2.6rem] leading-[1.08] sm:text-5xl lg:text-6xl">
            {t.titleLead} <span className="text-waypoint">{t.titleAccent}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/85">{t.sub}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="btn-tactile inline-flex items-center gap-2 rounded-full bg-coral px-7 py-4 text-base font-bold text-ink shadow-[0_5px_0_rgba(0,0,0,0.25)] hover:bg-[#ff7c5f]"
            >
              {t.primary}
              <ArrowRightIcon width={18} height={18} />
            </Link>
            <a
              href="#how"
              className="btn-tactile rounded-full border-2 border-white/35 px-7 py-4 text-base font-bold text-white hover:bg-white/10"
            >
              {t.secondary}
            </a>
          </div>
          <ul className="mt-9 flex flex-wrap gap-2">
            {t.trust.map((item) => (
              <li key={item} className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white/90">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative order-1 md:order-2">
          <div aria-hidden="true" className="absolute inset-[12%] rounded-full bg-waypoint/25 blur-3xl" />
          <HeroAtlas alt={t.atlasAlt} />
        </div>
      </div>
    </section>
  );
}

function Curricula({ locale }: { locale: Locale }) {
  const t = CONTENT[locale].curricula;
  return (
    <section className="bg-waypoint">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <h2 className="text-center text-sm font-extrabold uppercase tracking-[0.18em] text-ink/80">{t.title}</h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {t.items.map((item) => (
            <li
              key={item.name}
              className="mk-reveal rounded-2xl bg-white/90 px-4 py-5 text-center shadow-[0_4px_0_rgba(46,42,92,0.12)]"
            >
              <p className="font-display text-3xl text-ink">{item.name}</p>
              <p className="mt-1 text-sm font-semibold text-ink-soft">{item.detail}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          {t.stats.map((stat) => (
            <div key={stat.label} className="flex items-baseline justify-center gap-2.5 sm:justify-start md:justify-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="text-3xl font-extrabold tabular-nums text-ink">{stat.value}</dd>
              <dd className="text-sm font-semibold text-ink/80">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Problem({ locale }: { locale: Locale }) {
  const t = CONTENT[locale].problem;
  const icons: IconType[] = [StarIcon, HeartIcon, TargetIcon];
  return (
    <section className="bg-[#fff1ec]">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
        <h2 className="mk-reveal max-w-3xl font-display text-4xl leading-tight text-ink md:text-5xl">{t.title}</h2>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {t.cards.map((card, index) => {
            const Icon = icons[index];
            return (
              <li key={card} className="mk-reveal rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(255,107,74,0.15)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-coral/15 text-coral-deep">
                  <Icon />
                </span>
                <p className="mt-4 text-lg font-semibold leading-7 text-ink">{card}</p>
              </li>
            );
          })}
        </ul>
        <p className="mk-reveal mt-10 max-w-3xl border-l-4 border-coral pl-5 text-xl font-semibold leading-8 text-ink md:text-2xl md:leading-9">
          {t.turn}
        </p>
      </div>
    </section>
  );
}

function Why({ locale }: { locale: Locale }) {
  const t = CONTENT[locale].why;
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[1fr_1.3fr] md:items-center md:py-24">
        <div>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2 className="mt-3 font-display text-4xl leading-tight text-ink md:text-5xl">{t.title}</h2>
          <p className="mt-4 text-lg leading-8 text-ink-soft">{t.text}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { block: t.vision, style: "bg-ink text-white", label: "text-waypoint" },
            { block: t.mission, style: "bg-waypoint text-ink", label: "text-ink/70" },
          ].map(({ block, style, label }) => (
            <figure key={block.label} className={`mk-reveal rounded-3xl p-7 ${style}`}>
              <figcaption className={`text-xs font-extrabold uppercase tracking-[0.2em] ${label}`}>
                {block.label}
              </figcaption>
              <blockquote className="mt-3 font-display text-2xl leading-snug">{block.text}</blockquote>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks({ locale }: { locale: Locale }) {
  const t = CONTENT[locale].how;
  const stepIcons: IconType[] = [CompassIcon, TrendUpIcon, CalendarIcon];
  return (
    <section id="how" className="scroll-mt-20 bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:py-28 lg:grid-cols-2">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Eyebrow tone="light">{t.eyebrow}</Eyebrow>
          <h2 className="mt-3 font-display text-4xl leading-tight md:text-5xl">{t.title}</h2>
          <Image
            src="/mascot/poses/atlas-magnifier.png"
            alt=""
            width={1248}
            height={832}
            sizes="(min-width: 1024px) 480px, 80vw"
            className="mk-float mk-no-floor-pose mt-8 w-4/5 max-w-md drop-shadow-[0_24px_30px_rgba(0,0,0,0.35)]"
          />
        </div>

        <ol className="relative flex flex-col gap-6">
          <span aria-hidden="true" className="absolute bottom-8 left-[27px] top-8 border-l-4 border-dotted border-white/25" />
          {t.steps.map((step, index) => {
            const Icon = stepIcons[index];
            return (
              <li key={step.title} className="mk-reveal relative flex gap-5">
                <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-waypoint text-ink shadow-[0_0_0_6px_rgba(46,42,92,1)]">
                  <Icon />
                </span>
                <div className="rounded-3xl bg-white/[0.07] p-6 ring-1 ring-white/10">
                  <p className="text-sm font-bold text-waypoint">0{index + 1}</p>
                  <h3 className="mt-1 font-display text-2xl">{step.title}</h3>
                  <p className="mt-3 leading-7 text-white/80">{step.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function AtlasSection({ locale }: { locale: Locale }) {
  const t = CONTENT[locale].atlas;
  return (
    <section className="relative overflow-hidden bg-[#fff6dd]">
      <TrailDecoration className="pointer-events-none absolute -top-16 right-0 hidden w-1/2 text-waypoint/70 md:block" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:py-28">
        <div>
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2 className="mt-3 font-display text-4xl leading-tight text-ink md:text-5xl">{t.title}</h2>
          <p className="mt-5 text-lg leading-8 text-ink-soft">{t.text}</p>
        </div>
        <MeetAtlas
          greeting={t.greeting}
          bubble={t.bubble}
          tapLabel={t.tap}
          speakingLabel={t.speaking}
          alt={CONTENT[locale].hero.atlasAlt}
        />
      </div>
    </section>
  );
}

function DashboardShowcase({ locale }: { locale: Locale }) {
  const t = CONTENT[locale].dashboard;
  const m = t.mock;
  const statusStyle = ["bg-trail/15 text-emerald-800", "bg-waypoint/30 text-ink", "bg-coral/15 text-orange-800"];
  const barStyle = ["bg-trail", "bg-waypoint", "bg-coral"];

  return (
    <section id="parents" className="scroll-mt-20 bg-ink text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:py-28 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <Eyebrow tone="light">{t.eyebrow}</Eyebrow>
          <h2 className="mt-3 font-display text-4xl leading-tight md:text-5xl">{t.title}</h2>
          <ol className="mt-8 flex flex-col gap-4">
            {t.callouts.map((callout, index) => (
              <li key={callout} className="mk-reveal flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral text-sm font-extrabold text-ink">
                  {index + 1}
                </span>
                <p className="pt-1 text-lg leading-7 text-white/90">{callout}</p>
              </li>
            ))}
          </ol>
        </div>

        <figure className="mk-reveal rotate-[-1.5deg] rounded-[2rem] bg-fog p-5 text-ink shadow-[0_30px_60px_rgba(0,0,0,0.35)] sm:p-7">
          <figcaption className="mb-4 inline-block rounded-full bg-ink/10 px-3 py-1 text-xs font-bold text-ink-soft">
            {t.sample}
          </figcaption>
          <div className="rounded-3xl bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral text-xs font-extrabold">1</span>
              <div>
                <p className="font-display text-xl">{m.headline}</p>
                <p className="text-sm text-ink-soft">{m.sub}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {[
                { value: "4/7", label: m.days },
                { value: "52", label: m.questions },
                { value: "81%", label: m.accuracy },
                { value: "6", label: m.mastered },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-fog px-1 py-2.5">
                  <p className="text-lg font-bold tabular-nums">{stat.value}</p>
                  <p className="text-[11px] leading-tight text-ink-soft">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.15fr]">
            <div className="rounded-3xl bg-white p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral text-xs font-extrabold">2</span>
                <p className="text-sm font-bold">{m.progress}</p>
              </div>
              <ul className="mt-3 flex flex-col gap-3">
                {m.topics.map((topic, index) => (
                  <li key={topic.name}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{topic.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusStyle[index]}`}>
                        {topic.status}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-line">
                      <span className={`block h-full rounded-full ${barStyle[index]}`} style={{ width: `${topic.score}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-ink p-5 text-white">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral text-xs font-extrabold text-ink">3</span>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-waypoint">
                  <SparklesIcon width={14} height={14} />
                  {m.next}
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/90">{m.insight}</p>
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-coral px-3 py-1.5 text-xs font-bold text-ink">
                {m.nextLabel}: {m.nextTopic}
                <ArrowRightIcon width={14} height={14} />
              </p>
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}

function Safety({ locale }: { locale: Locale }) {
  const t = CONTENT[locale].safety;
  const icons: IconType[] = [BanIcon, LockIcon, ShieldIcon, HeartIcon];
  return (
    <section className="bg-[#e9fbf2]">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight text-ink md:text-5xl">{t.title}</h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.items.map((item, index) => {
            const Icon = icons[index];
            return (
              <li key={item.title} className="mk-reveal rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(46,42,92,0.08)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-trail/20 text-emerald-800">
                  <Icon />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink">{item.title}</h3>
                <p className="mt-1.5 leading-7 text-ink-soft">{item.text}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Founding({ locale }: { locale: Locale }) {
  const t = CONTENT[locale].founding;
  return (
    <section className="relative overflow-hidden bg-coral text-ink">
      <TrailDecoration className="pointer-events-none absolute -bottom-10 left-0 w-[140%] max-w-none text-ink/20 md:w-full" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 md:grid-cols-[1.2fr_1fr] md:py-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-white">
            <UsersIcon width={16} height={16} />
            {t.eyebrow}
          </p>
          <h2 className="mt-5 font-display text-4xl leading-tight md:text-5xl">{t.title}</h2>
          <p className="mt-4 text-lg leading-8">{t.text}</p>
          <Link
            href="/register"
            className="btn-tactile mt-8 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-base font-bold text-white shadow-[0_5px_0_rgba(0,0,0,0.25)] hover:bg-[#3a3570]"
          >
            {t.cta}
            <ArrowRightIcon width={18} height={18} />
          </Link>
        </div>
        <ul className="mk-reveal flex flex-col gap-3 rounded-[2rem] bg-white p-7 shadow-[0_20px_40px_rgba(46,42,92,0.2)]">
          {t.benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3 text-base font-semibold">
              <CheckCircleIcon className="mt-0.5 shrink-0 text-emerald-700" />
              {benefit}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Faq({ locale }: { locale: Locale }) {
  const t = CONTENT[locale].faq;
  return (
    <section id="faq" className="scroll-mt-20 bg-fog">
      <div className="mx-auto max-w-3xl px-5 py-20 md:py-24">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h2 className="mt-3 font-display text-4xl leading-tight text-ink md:text-5xl">{t.title}</h2>
        <div className="mt-10 flex flex-col gap-3">
          {t.items.map((item) => (
            <details key={item.q} className="group rounded-2xl bg-white px-6 py-1 shadow-[0_4px_16px_rgba(46,42,92,0.06)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-bold text-ink [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDownIcon className="shrink-0 text-ink-soft transition-transform group-open:rotate-180" />
              </summary>
              <p className="pb-5 leading-7 text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ locale }: { locale: Locale }) {
  const t = CONTENT[locale].finalCta;
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(255,200,87,0.3),transparent_55%)]"
      />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-5 py-20 text-center md:py-24">
        <Image
          src="/mascot/poses/atlas-celebrate.png"
          alt=""
          width={1248}
          height={832}
          sizes="320px"
          className="mk-float mk-no-floor-pose w-72 drop-shadow-[0_24px_30px_rgba(0,0,0,0.35)]"
        />
        <h2 className="mt-4 font-display text-4xl leading-tight md:text-6xl">{t.title}</h2>
        <p className="mt-4 text-lg text-white/85">{t.text}</p>
        <Link
          href="/register"
          className="btn-tactile mt-8 inline-flex items-center gap-2 rounded-full bg-coral px-8 py-4 text-lg font-bold text-ink shadow-[0_5px_0_rgba(0,0,0,0.3)] hover:bg-[#ff7c5f]"
        >
          {t.cta}
          <ArrowRightIcon width={20} height={20} />
        </Link>
      </div>
    </section>
  );
}

function Footer({ locale }: { locale: Locale }) {
  const t = CONTENT[locale];
  return (
    <footer className="bg-[#221e47] text-white/75">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-3">
        <div>
          <p className="flex items-center gap-2.5 font-display text-xl font-semibold text-white">
            <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-waypoint text-base font-bold text-ink">
              W
            </span>
            WonderPath
          </p>
          <p className="mt-3 max-w-xs leading-7">{t.footer.tagline}</p>
        </div>
        <nav aria-label={t.footer.explore}>
          <p className="text-sm font-bold uppercase tracking-wider text-white">{t.footer.explore}</p>
          <ul className="mt-4 flex flex-col gap-2.5">
            <li><a href="#how" className="hover:text-white">{t.nav.how}</a></li>
            <li><a href="#features" className="hover:text-white">{t.nav.features}</a></li>
            <li><a href="#books" className="hover:text-white">{t.nav.books}</a></li>
            <li><a href="#parents" className="hover:text-white">{t.nav.parents}</a></li>
            <li><a href="#faq" className="hover:text-white">{t.nav.faq}</a></li>
            <li><Link href="/login" className="hover:text-white">{t.nav.login}</Link></li>
          </ul>
        </nav>
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-white">{t.footer.contact}</p>
          <ul className="mt-4 flex flex-col gap-2.5">
            <li>
              <a href={CONTACT.whatsappLink} className="inline-flex items-center gap-2 hover:text-white">
                <MessageIcon width={16} height={16} /> {CONTACT.whatsapp}
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`} className="inline-flex items-center gap-2 hover:text-white">
                <MailIcon width={16} height={16} /> {CONTACT.email}
              </a>
            </li>
            <li className="inline-flex items-center gap-2">
              <TargetIcon width={16} height={16} /> {CONTACT.instagram}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-5 py-6 text-sm">© 2026 WonderPath. {t.footer.madeIn}</p>
      </div>
    </footer>
  );
}

function StructuredData({ locale }: { locale: Locale }) {
  const t = CONTENT[locale];
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "WonderPath",
      url: SITE_URL,
      logo: `${SITE_URL}/mascot/atlas-base-reference.png`,
    },
    {
      "@context": "https://schema.org",
      "@type": "EducationalApplication",
      name: "WonderPath",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      inLanguage: locale === "id" ? "id-ID" : "en",
      description: t.meta.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: t.faq.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];
  return (
    <script
      type="application/ld+json"
      // Static content we control; no user input involved.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export default function MarketingHome({ locale }: { locale: Locale }) {
  return (
    <div lang={locale === "id" ? "id" : "en"} className="flex min-h-full flex-col bg-white">
      <StructuredData locale={locale} />
      <TopBar locale={locale} />
      <main>
        <Hero locale={locale} />
        <Curricula locale={locale} />
        <Problem locale={locale} />
        <Why locale={locale} />
        <HowItWorks locale={locale} />
        <FeaturesGrid locale={locale} />
        <AtlasSection locale={locale} />
        <BooksShowcase locale={locale} />
        <DashboardShowcase locale={locale} />
        <Safety locale={locale} />
        <Founding locale={locale} />
        <Faq locale={locale} />
        <FinalCta locale={locale} />
      </main>
      <Footer locale={locale} />
    </div>
  );
}
