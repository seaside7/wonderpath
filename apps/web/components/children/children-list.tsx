"use client";

import Image from "next/image";
import Link from "next/link";
import ChildSummaryCard from "./child-summary-card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChildProfile, deleteChild, listChildren } from "@/lib/api";

export default function ChildrenList() {
  const router = useRouter();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    listChildren()
      .then((result) => {
        if (cancelled) return;
        setChildren(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not load your children. Please try again.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(child: ChildProfile) {
    const confirmed = window.confirm(
      `Delete ${child.fullName}'s profile? This cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await deleteChild(child.id);
      setChildren((current) =>
        current.filter((entry) => entry.id !== child.id),
      );
      router.refresh();
    } catch {
      setError(`Could not delete ${child.fullName}. Please try again.`);
    }
  }

  if (loading) {
    return (
      <div aria-busy="true" className="grid animate-pulse gap-5 lg:grid-cols-2">
        <span className="sr-only">Loading your family…</span>
        {[0, 1].map((index) => (
          <div key={index} className="h-80 rounded-3xl bg-card" />
        ))}
      </div>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-ink">Your family</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {children.length > 0
              ? "How everyone is doing this week, at a glance."
              : "Add a child to start their learning path."}
          </p>
        </div>
        <Link
          href="/children/new"
          className="btn-tactile btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          + Add a child
        </Link>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
          {error}
        </p>
      ) : null}

      {children.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-6 rounded-3xl bg-card px-6 py-10 text-center shadow-[0_8px_28px_rgba(46,42,92,0.09)] sm:flex-row sm:text-left">
          <Image
            src="/mascot/atlas-mouth-toothy-grin.png"
            alt="Atlas, the WonderPath learning guide"
            width={180}
            height={120}
            className="h-auto w-44 shrink-0"
            unoptimized
          />
          <div>
            <p className="font-display text-2xl text-ink">
              Atlas is ready to meet your child
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              It takes about a minute, and you can add more children later.
            </p>
            <Link
              href="/children/new"
              className="btn-tactile btn-primary mt-5 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold"
            >
              Add your child
            </Link>
          </div>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 lg:grid-cols-2">
          {children.map((child) => (
            <ChildSummaryCard
              key={child.id}
              child={child}
              onDelete={(target) => void handleDelete(target)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
