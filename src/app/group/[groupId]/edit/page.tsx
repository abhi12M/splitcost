import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { buildMetadata } from "@/lib/seo";

const EditGroupPage = dynamic(() => import("@/views/EditGroup"));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  const { groupId } = await params;

  return buildMetadata({
    title: "Edit group",
    description: "Edit the name, currency, and members for this group.",
    path: `/group/${groupId}/edit`,
    noIndex: true,
  });
}

export default async function EditGroupRoute({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  return <EditGroupPage groupId={groupId} />;
}
