import type { Metadata } from "next";
import PinSetupForm from "@/components/child-mode/pin-setup-form";

export const metadata: Metadata = {
  title: "Parent Settings | WonderPath",
};

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-lg">
      <PinSetupForm />
    </main>
  );
}
