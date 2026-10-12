import type { Metadata } from "next";
import LoginForm from "@/components/auth/login-form";
import { AUTH_COPY, authLocale } from "@/components/auth/auth-copy";

interface LoginPageProps {
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ searchParams }: LoginPageProps): Promise<Metadata> {
  const t = AUTH_COPY[authLocale((await searchParams).lang)];
  return { title: `${t.signIn} | WonderPath` };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const locale = authLocale((await searchParams).lang);
  const t = AUTH_COPY[locale];
  return (
    <main lang={locale} className="flex flex-1 items-center justify-center bg-fog px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-8">
        <h1 className="font-display mb-1 text-3xl text-ink">{t.loginTitle}</h1>
        <p className="mb-6 text-sm text-ink-soft">{t.loginSub}</p>
        <LoginForm locale={locale} />
      </div>
    </main>
  );
}
