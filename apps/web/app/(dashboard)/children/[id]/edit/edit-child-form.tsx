"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, ChildProfile, getChild } from "@/lib/api";
import ChildForm from "@/components/children/child-form";

export default function EditChildForm({ childId }: { childId: string }) {
  const router = useRouter();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getChild(childId)
      .then((result) => {
        if (cancelled) return;
        setChild(result);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setFailed(true);
        if (cause instanceof ApiError && cause.status === 404) {
          router.replace("/dashboard");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [childId, router]);

  if (failed) {
    return (
      <main className="mx-auto max-w-lg">
        <p className="text-sm text-ink-soft">Could not load this child.</p>
      </main>
    );
  }

  if (!child) {
    return (
      <main className="mx-auto max-w-lg">
        <p className="text-sm text-ink-soft">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg">
      <h1 className="font-display text-4xl text-ink">Edit {child.fullName}</h1>
      <p className="mb-6 mt-2 text-sm text-ink-soft">
        Update your child&apos;s profile.
      </p>
      <div className="border-l-2 border-waypoint bg-card px-6 py-6">
        <ChildForm child={child} />
      </div>
    </main>
  );
}
