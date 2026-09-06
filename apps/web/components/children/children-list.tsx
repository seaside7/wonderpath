"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChildProfile,
  deleteChild,
  listChildren,
} from "@/lib/api";

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
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">My Children</h1>
        <Link
          href="/children/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          Add Child
        </Link>
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {children.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="text-zinc-600">No children yet.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Add your first child to start a learning journey.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <li
              key={child.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">
                    {child.fullName}
                    {child.nickname ? (
                      <span className="ml-2 text-sm font-normal text-zinc-500">
                        &ldquo;{child.nickname}&rdquo;
                      </span>
                    ) : null}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600">{child.grade}</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {child.curricula.join(" + ")}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <Link
                  href={`/children/${child.id}/recommendations`}
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  Start Learning
                </Link>
                <Link
                  href={`/children/${child.id}/edit`}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(child)}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}