import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { buildMetadata } from "@/lib/seo";

const GroupResponsesPage = dynamic(() => import("@/pages/GroupDetails"));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  const { groupId } = await params;

  return buildMetadata({
    title: "Group expenses",
    description: "Track balances, expenses, and settlements for this expense group.",
    path: `/group/${groupId}`,
    noIndex: true,
  });
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <GroupResponsesPage groupId={groupId} />;
}
