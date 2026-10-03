import type { Metadata } from "next";
import ProfilePicker from "@/components/child-mode/profile-picker";

export const metadata: Metadata = {
  title: "Who's Learning? | WonderPath",
};

export default function DashboardPage() {
  return <ProfilePicker />;
}
