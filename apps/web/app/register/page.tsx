import type { Metadata } from "next";
import RegisterForm from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create an account | WonderPath",
};

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-fog px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-8">
        <h1 className="font-display mb-1 text-3xl text-ink">
          Create an account
        </h1>
        <p className="mb-6 text-sm text-ink-soft">
          Start guiding your child&apos;s learning journey.
        </p>
        <RegisterForm />
      </div>
    </main>
  );
}
