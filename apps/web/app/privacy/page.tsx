import type { Metadata } from "next";
import LegalPage from "@/components/legal/legal-page";
import { PRIVACY } from "@/components/legal/legal-content";

interface PageProps {
  searchParams: Promise<{ lang?: string }>;
}

// Draft: not linked from the site and not indexed until the founder approves it.
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const locale = (await searchParams).lang === "en" ? "en" : "id";
  return { title: `${PRIVACY[locale].title} | WonderPath`, robots: { index: false, follow: false } };
}

export default async function Page({ searchParams }: PageProps) {
  const locale = (await searchParams).lang === "en" ? "en" : "id";
  return <LegalPage doc={PRIVACY[locale]} locale={locale} />;
}
