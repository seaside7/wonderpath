import type { Metadata } from "next";
import RegisterForm from "@/components/auth/register-form";
import { AUTH_COPY, authLocale } from "@/components/auth/auth-copy";

interface RegisterPageProps {
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ searchParams }: RegisterPageProps): Promise<Metadata> {
  const t = AUTH_COPY[authLocale((await searchParams).lang)];
  return { title: `${t.registerTitle} | WonderPath` };
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const locale = authLocale((await searchParams).lang);
  const t = AUTH_COPY[locale];
  return (
    <main lang={locale} className="flex flex-1 items-center justify-center bg-fog px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-8">
        <h1 className="font-display mb-1 text-3xl text-ink">{t.registerTitle}</h1>
        <p className="mb-6 text-sm text-ink-soft">{t.registerSub}</p>
        <RegisterForm locale={locale} />
      </div>
    </main>
  );
}
