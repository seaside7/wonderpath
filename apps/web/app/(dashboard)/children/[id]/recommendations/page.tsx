import type { Metadata } from "next";
import RecommendationDashboard from "@/components/recommendations/recommendation-dashboard";

export const metadata: Metadata = {
  title: "Recommendations | WonderPath",
};

interface RecommendationPageProps {
  params: Promise<{ id: string }>;
}

export default async function RecommendationPage({
  params,
}: RecommendationPageProps) {
  const { id } = await params;
  return (
    <main>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-ink">Learning Dashboard</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          See what Atlas recommends and how mastery is progressing.
        </p>
      </div>
      <RecommendationDashboard childId={id} />
    </main>
  );
}