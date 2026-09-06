import type { Metadata } from "next";
import RegisterForm from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create an account | WonderPath",
};

export default function RegisterPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
          Create an account
        </h1>
        <p className="mb-6 text-sm text-zinc-600">
          Start guiding your child&apos;s learning journey.
        </p>
        <RegisterForm />
      </div>
    </main>
  );
}