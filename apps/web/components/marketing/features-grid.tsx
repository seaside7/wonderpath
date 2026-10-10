import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, LockIcon, StarIcon } from "@/components/ui/icons";
import { CONTENT, Locale } from "./content";

type Copy = (typeof CONTENT)["id"]["features"];
type Item = Copy["items"][number];

function AdaptiveVisual({ mini }: { mini: Copy["mini"] }) {
  return (
    <div className="mt-8 rounded-2xl bg-white/10 p-4">
      <div className="flex items-center gap-1.5">
        {[1, 1, 0, 1, 1, 0].map((ok, index) => (
          <span
            key={index}
            className={`h-3 flex-1 rounded-full ${ok ? "bg-trail" : "bg-white/25"}`}
          />
        ))}
      </div>
      <p className="mt-2 text-sm text-white/80">{mini.streak}</p>
      <p className="levelup-pop mt-4 inline-flex items-center gap-2 rounded-full bg-waypoint px-4 py-2 text-sm font-extrabold text-ink">
        <StarIcon width={16} height={16} />
        {mini.levelUp}
      </p>
    </div>
  );
}

function VoiceVisual({ mini }: { mini: Copy["mini"] }) {
  return (
    <div className="mt-5 flex items-end gap-3">
      <Image
        src="/mascot/atlas-mouth-wide-open.png"
        alt=""
        width={1536}
        height={1024}
        sizes="144px"
        className="-ml-3 -mb-2 w-36 shrink-0"
      />
      <div className="relative rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-sm font-medium leading-5 text-ink shadow-sm">
        {mini.explain}
        <span aria-hidden="true" className="mt-2 flex h-3 items-end gap-0.5">
          {[6, 10, 4, 12, 7, 11, 5, 9].map((h, i) => (
            <span key={i} className="w-1 rounded-full bg-coral" style={{ height: h }} />
          ))}
        </span>
      </div>
    </div>
  );
}

function TopicsVisual({ mini }: { mini: Copy["mini"] }) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {mini.topics.map((topic, index) => (
        <span
          key={topic}
          className={`rounded-full px-3 py-1.5 text-sm font-bold ${
            index === 0 ? "bg-sky-600 text-white" : "bg-white text-sky-900"
          }`}
        >
          {topic}
        </span>
      ))}
      <span className="rounded-full border-2 border-dashed border-sky-400 px-3 py-1 text-sm font-bold text-sky-800">
        + {mini.ahead}
      </span>
    </div>
  );
}

function WeeklyVisual({ mini }: { mini: Copy["mini"] }) {
  return (
    <div className="mt-5 flex items-end justify-between gap-3">
      <div aria-hidden="true" className="flex h-14 flex-1 items-end gap-1.5">
        {[18, 0, 34, 26, 0, 44, 30].map((h, i) => (
          <span
            key={i}
            className={`flex-1 rounded-md ${h ? "bg-violet-400" : "bg-line"}`}
            style={{ height: h || 5 }}
          />
        ))}
      </div>
      <span className="text-2xl font-extrabold tabular-nums text-ink">{mini.days}</span>
    </div>
  );
}

function PinVisual({ mini }: { mini: Copy["mini"] }) {
  return (
    <div className="mt-5 flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white">
        <LockIcon width={18} height={18} />
      </span>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-violet-800">{mini.pin}</p>
        <div aria-hidden="true" className="mt-1.5 flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-3.5 w-3.5 rounded-full bg-violet-700" />
          ))}
        </div>
      </div>
    </div>
  );
}

function StoryVisual() {
  return (
    <div aria-hidden="true" className="mt-5 flex items-end gap-1.5">
      {[
        "h-16 bg-[#e0303c]",
        "h-20 bg-[#3b2a8f]",
        "h-14 bg-[#45a35e]",
        "h-[4.5rem] bg-[#1288b4]",
        "h-16 bg-[#b05fb5]",
      ].map((cls, i) => (
        <span key={i} className={`w-7 rounded-t-md ${cls}`} />
      ))}
      <span className="h-12 w-7 origin-bottom-left rotate-12 rounded-t-md bg-[#f6b44a]" />
    </div>
  );
}

function PointsVisual({ mini }: { mini: Copy["mini"] }) {
  return (
    <div className="mt-5">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-lg font-extrabold tabular-nums text-ink">
        <StarIcon width={18} height={18} className="text-amber-500" />
        {mini.balance}
      </p>
      <div className="mt-3 flex items-center justify-between text-sm font-semibold text-emerald-900">
        <span>{mini.reward}</span>
        <span>{mini.rewardLeft}</span>
      </div>
      <div className="mt-1.5 h-2.5 rounded-full bg-white/70">
        <span className="block h-full w-[85%] rounded-full bg-emerald-600" />
      </div>
    </div>
  );
}

const CARD_STYLE: Record<string, string> = {
  voice: "bg-[#fff1ec]",
  topics: "bg-sky-100",
  weekly: "bg-white",
  pin: "bg-violet-100",
  story: "bg-amber-50 border-2 border-dashed border-amber-300",
  points: "bg-[#d6f5e6]",
};

function SmallCard({ item, copy }: { item: Item; copy: Copy }) {
  const mini = copy.mini;
  return (
    <article className={`mk-reveal flex flex-col rounded-3xl p-6 ${CARD_STYLE[item.visual]}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-extrabold leading-snug text-ink">{item.title}</h3>
        {item.soon ? (
          <span className="shrink-0 rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-white">
            {copy.soon}
          </span>
        ) : null}
      </div>
      <p className="mt-1 leading-6 text-ink-soft">{item.text}</p>
      <div className="mt-auto">
        {item.visual === "voice" ? <VoiceVisual mini={mini} /> : null}
        {item.visual === "topics" ? <TopicsVisual mini={mini} /> : null}
        {item.visual === "weekly" ? <WeeklyVisual mini={mini} /> : null}
        {item.visual === "pin" ? <PinVisual mini={mini} /> : null}
        {item.visual === "story" ? <StoryVisual /> : null}
        {item.visual === "points" ? <PointsVisual mini={mini} /> : null}
      </div>
    </article>
  );
}

export default function FeaturesGrid({ locale }: { locale: Locale }) {
  const copy = CONTENT[locale].features;
  const [lead, ...rest] = copy.items;

  return (
    <section id="features" className="scroll-mt-20 bg-[#e9fbf2]">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral-deep">{copy.eyebrow}</p>
        <h2 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-ink md:text-5xl">
          {copy.title}
        </h2>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <article className="mk-reveal flex flex-col rounded-3xl bg-ink p-8 text-white md:row-span-2">
            <h3 className="font-display text-3xl leading-tight">{lead.title}</h3>
            <p className="mt-3 text-lg leading-8 text-white/80">{lead.text}</p>
            <div className="mt-auto">
              <AdaptiveVisual mini={copy.mini} />
            </div>
          </article>

          {rest.map((item) => (
            <SmallCard key={item.title} item={item} copy={copy} />
          ))}

          <Link
            href="/register"
            className="mk-reveal group flex flex-col justify-between rounded-3xl bg-coral p-6 text-ink transition-transform hover:-translate-y-1"
          >
            <p className="font-display text-2xl leading-tight">{copy.tryCard.title}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-base font-extrabold">
              {copy.tryCard.cta}
              <ArrowRightIcon className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
