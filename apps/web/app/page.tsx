import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
          WonderPath
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-zinc-600">
          A guided learning companion for your child. Atlas turns practice
          into confident progress with personalized questions, exam prep,
          and encouragement along the way.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            Create an account
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-400"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}