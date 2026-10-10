import type { Metadata } from "next";
import MarketingHome from "@/components/marketing/marketing-home";
import { CONTENT } from "@/components/marketing/content";

const t = CONTENT.id.meta;

export const metadata: Metadata = {
  title: t.title,
  description: t.description,
  alternates: {
    canonical: "/",
    languages: { id: "/", en: "/en", "x-default": "/" },
  },
  openGraph: {
    title: t.title,
    description: t.description,
    url: "/",
    siteName: "WonderPath",
    locale: "id_ID",
    alternateLocale: ["en_US"],
    images: [{ url: "/mascot/atlas-base-reference.png", width: 1536, height: 1024 }],
    type: "website",
  },
};

export default function Home() {
  return <MarketingHome locale="id" />;
}
