import type { Metadata } from "next";
import ChildForm from "@/components/children/child-form";

export const metadata: Metadata = {
  title: "Add Child | WonderPath",
};

export default function NewChildPage() {
  return (
    <main className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold text-zinc-900">Add a Child</h1>
      <p className="mb-6 mt-1 text-sm text-zinc-600">
        Tell WonderPath about your child to personalize learning.
      </p>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <ChildForm />
      </div>
    </main>
  );
}