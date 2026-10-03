import type { Metadata } from "next";
import Link from "next/link";
import ChildrenList from "@/components/children/children-list";

export const metadata: Metadata = {
  title: "Manage Profiles | WonderPath",
};

interface ManagePageProps {
  searchParams: Promise<{ setupPin?: string }>;
}

export default async function ManagePage({ searchParams }: ManagePageProps) {
  const params = await searchParams;
  const showPinBanner = params.setupPin === "1";

  return (
    <div>
      {showPinBanner ? (
        <div className="mb-6 border-l-2 border-waypoint bg-card px-6 py-5">
          <p className="font-display text-xl text-ink">
            Set a PIN to lock the parent area
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Right now anyone holding this device can reach profile settings.
            A 4-digit PIN keeps little hands in the kid area.
          </p>
          <Link
            href="/dashboard/settings"
            className="btn-tactile btn-primary mt-4 inline-block rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Set up a PIN
          </Link>
        </div>
      ) : null}
      <ChildrenList />
    </div>
  );
}
