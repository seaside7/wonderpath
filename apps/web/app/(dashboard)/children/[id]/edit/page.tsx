import type { Metadata } from "next";
import EditChildForm from "./edit-child-form";

export const metadata: Metadata = {
  title: "Edit Child | WonderPath",
};

interface EditChildPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditChildPage({ params }: EditChildPageProps) {
  const { id } = await params;
  return <EditChildForm childId={id} />;
}