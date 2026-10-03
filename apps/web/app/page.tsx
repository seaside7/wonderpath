import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 bg-fog">
      <div className="mx-auto w-full max-w-5xl px-6 py-20">
        <h1 className="font-display max-w-xl text-5xl leading-tight text-ink">
          Every child deserves a learning journey as unique as they are.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-ink-soft">
          WonderPath follows your child&apos;s progress topic by topic, so
          practice goes where it helps most. You stay in charge — Atlas
          keeps track of the details.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href="/register"
            className="btn-tactile btn-primary rounded-xl px-6 py-3 text-sm font-semibold"
          >
            Create an account
          </Link>
          <Link
            href="/login"
            className="btn-tactile rounded-xl border border-line bg-card px-6 py-3 text-sm font-semibold text-ink"
          >
            Sign in
          </Link>
        </div>
        <div className="mt-14 flex items-center gap-3 text-ink-soft">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full bg-waypoint"
          />
          <span
            aria-hidden="true"
            className="inline-block h-px w-16 bg-ink/20"
          />
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full bg-trail"
          />
          <p className="ml-2 text-sm">
            Start with your first child — it takes a minute.
          </p>
        </div>
      </div>
    </main>
  );
}
