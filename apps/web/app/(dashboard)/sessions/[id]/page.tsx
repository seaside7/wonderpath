import type { Metadata } from "next";
import SessionQuestionFlow from "@/components/sessions/session-question-flow";

export const metadata: Metadata = {
  title: "Learning Session | WonderPath",
};

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params;
  return (
    <main>
      <h1 className="text-2xl font-semibold text-zinc-900">Learning Session</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Answer the questions to build your skill.
      </p>
      <div className="mt-6">
        <SessionQuestionFlow sessionId={id} />
      </div>
    </main>
  );
}