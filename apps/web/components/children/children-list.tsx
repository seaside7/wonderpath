"use client";

import Link from "next/link";
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
    return <p className="text-sm text-ink-soft">Loading…</p>;
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-ink">My Children</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Choose a child to set up today&apos;s learning.
          </p>
        </div>
        <Link
          href="/children/new"
          className="btn-tactile btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          Add your child
        </Link>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-coral/10 px-3.5 py-2.5 text-sm text-coral-deep">
          {error}
        </p>
      ) : null}

      {children.length === 0 ? (
        <div className="mt-8 border-l-2 border-waypoint bg-card px-6 py-10">
          <p className="font-display text-2xl text-ink">
            No children yet — add your first child to get started
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            It takes about a minute, and you can add more children later.
          </p>
          <Link
            href="/children/new"
            className="btn-tactile btn-primary mt-6 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold"
          >
            Add your child
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {children.map((child) => (
            <li
              key={child.id}
              className="border-l-2 border-waypoint bg-card px-6 py-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl text-ink">
                    {child.fullName}
                    {child.nickname ? (
                      <span className="ml-2 align-middle font-body text-sm font-normal text-ink-soft">
                        &ldquo;{child.nickname}&rdquo;
                      </span>
                    ) : null}
                  </h2>
                  <p className="mt-1 text-sm text-ink-soft">
                    {child.grade} · {child.curricula.join(" + ")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    href={`/children/${child.id}/start`}
                    className="btn-tactile btn-primary rounded-lg px-4 py-2 text-sm font-semibold"
                  >
                    Start Learning
                  </Link>
                  <Link
                    href={`/children/${child.id}/recommendations`}
                    className="btn-tactile rounded-lg border border-line bg-card px-4 py-2 text-sm font-medium text-ink"
                  >
                    View Progress
                  </Link>
                  <Link
                    href={`/children/${child.id}/edit`}
                    className="btn-tactile rounded-lg border border-line bg-card px-4 py-2 text-sm font-medium text-ink"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(child)}
                    className="btn-tactile rounded-lg px-3 py-2 text-sm font-medium text-coral-deep"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
