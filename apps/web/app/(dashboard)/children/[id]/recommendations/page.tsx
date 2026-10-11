import type { Metadata } from "next";
import Link from "next/link";
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
      <Link
        href="/children"
        className="btn-tactile mb-5 inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-bold text-ink shadow-[0_2px_0_rgba(46,42,92,0.12)] ring-1 ring-line"
      >
        <span aria-hidden="true">←</span> Back to your family
      </Link>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-ink">Learning Dashboard</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          A weekly snapshot of practice, progress, and what to work on next.
        </p>
      </div>
      <RecommendationDashboard childId={id} />
    </main>
  );
}