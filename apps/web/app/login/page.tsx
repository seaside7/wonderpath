import type { Metadata } from "next";
import LoginForm from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in | WonderPath",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-fog px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-8">
        <h1 className="font-display mb-1 text-3xl text-ink">Welcome back</h1>
        <p className="mb-6 text-sm text-ink-soft">
          Pick up right where you left off.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
