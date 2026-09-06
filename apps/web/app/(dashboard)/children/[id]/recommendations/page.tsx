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
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Learning Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            See what Atlas recommends and how mastery is progressing.
          </p>
        </div>
      </div>
      <RecommendationDashboard childId={id} />
    </main>
  );
}