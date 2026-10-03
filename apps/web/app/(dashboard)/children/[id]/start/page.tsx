import type { Metadata } from "next";
import SessionSetup from "@/components/sessions/session-setup";

export const metadata: Metadata = {
  title: "Start Learning | WonderPath",
};

interface StartLearningPageProps {
  params: Promise<{ id: string }>;
}

export default async function StartLearningPage({
  params,
}: StartLearningPageProps) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-lg">
      <h1 className="font-display text-4xl text-ink">Start learning</h1>
      <p className="mb-6 mt-2 text-sm text-ink-soft">
        Choose what to study today.
      </p>
      <SessionSetup childId={id} />
    </main>
  );
}
