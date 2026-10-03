import type { Metadata } from "next";
import ChildForm from "@/components/children/child-form";

export const metadata: Metadata = {
  title: "Add Child | WonderPath",
};

export default function NewChildPage() {
  return (
    <main className="mx-auto max-w-lg">
      <h1 className="font-display text-4xl text-ink">Add your child</h1>
      <p className="mb-6 mt-2 text-sm text-ink-soft">
        Tell WonderPath who you&apos;re setting up learning for.
      </p>
      <div className="border-l-2 border-waypoint bg-card px-6 py-6">
        <ChildForm />
      </div>
    </main>
  );
}
