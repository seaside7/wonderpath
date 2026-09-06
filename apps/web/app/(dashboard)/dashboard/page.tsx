import type { Metadata } from "next";
import ChildrenList from "@/components/children/children-list";

export const metadata: Metadata = {
  title: "My Children | WonderPath",
};

export default function DashboardPage() {
  return <ChildrenList />;
}