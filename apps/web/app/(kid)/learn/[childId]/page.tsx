import type { Metadata } from "next";
import KidTodayCard from "@/components/kid/kid-today-card";

export const metadata: Metadata = {
  title: "Today | WonderPath",
};

interface KidTodayPageProps {
  params: Promise<{ childId: string }>;
}

export default async function KidTodayPage({ params }: KidTodayPageProps) {
  const { childId } = await params;
  return (
    <main>
      <KidTodayCard childId={childId} />
    </main>
  );
}
