import type { Metadata } from "next";
import StoryReader from "@/components/books/story-reader";

export const metadata: Metadata = {
  title: "Story | WonderPath",
};

interface StoryPageProps {
  params: Promise<{ childId: string; bookId: string }>;
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { childId, bookId } = await params;
  return (
    <main className="flex flex-1 flex-col">
      <StoryReader childId={childId} bookId={bookId} />
    </main>
  );
}
