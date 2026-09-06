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
      <h1 className="text-2xl font-semibold text-zinc-900">
        Start Learning
      </h1>
      <p className="mb-6 mt-1 text-sm text-zinc-600">
        Choose what to study today.
      </p>
      <SessionSetup childId={id} />
    </main>
  );
}