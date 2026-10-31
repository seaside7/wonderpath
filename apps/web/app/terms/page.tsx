import type { Metadata } from "next";
import LegalPage from "@/components/legal/legal-page";
import { TERMS } from "@/components/legal/legal-content";

interface PageProps {
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const locale = (await searchParams).lang === "en" ? "en" : "id";
  return { title: `${TERMS[locale].title} | WonderPath` };
}

export default async function Page({ searchParams }: PageProps) {
  const locale = (await searchParams).lang === "en" ? "en" : "id";
  return <LegalPage doc={TERMS[locale]} locale={locale} />;
}
