import type { Metadata } from "next";
import KidQuestionFlow from "@/components/kid/kid-question-flow";

export const metadata: Metadata = {
  title: "Practice | WonderPath",
};

interface KidSessionPageProps {
  params: Promise<{ childId: string; sessionId: string }>;
}

export default async function KidSessionPage({
  params,
}: KidSessionPageProps) {
  const { childId, sessionId } = await params;
  return (
    <main>
      <KidQuestionFlow childId={childId} sessionId={sessionId} />
    </main>
  );
}
