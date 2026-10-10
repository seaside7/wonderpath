import type { Metadata } from "next";
import MarketingHome from "@/components/marketing/marketing-home";
import { CONTENT } from "@/components/marketing/content";

const t = CONTENT.en.meta;

export const metadata: Metadata = {
  title: t.title,
  description: t.description,
  alternates: {
    canonical: "/en",
    languages: { id: "/", en: "/en", "x-default": "/" },
  },
  openGraph: {
    title: t.title,
    description: t.description,
    url: "/en",
    siteName: "WonderPath",
    locale: "en_US",
    alternateLocale: ["id_ID"],
    images: [{ url: "/mascot/atlas-base-reference.png", width: 1536, height: 1024 }],
    type: "website",
  },
};

export default function HomeEn() {
  return <MarketingHome locale="en" />;
}
