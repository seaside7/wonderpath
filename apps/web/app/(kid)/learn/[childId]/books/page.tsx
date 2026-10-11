import type { Metadata } from "next";
import StoryShelf from "@/components/books/story-shelf";

export const metadata: Metadata = {
  title: "Story Trail | WonderPath",
};

interface StoryTrailPageProps {
  params: Promise<{ childId: string }>;
}

export default async function StoryTrailPage({ params }: StoryTrailPageProps) {
  const { childId } = await params;
  return (
    <main className="flex flex-1 flex-col">
      <StoryShelf childId={childId} />
    </main>
  );
}
