import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { AdminGate } from "@/components/admin/AdminGate";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

const GroupResponsesPage = dynamic(() => import("@/pages/GroupDetails"));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  const { groupId } = await params;

  return buildMetadata({
    title: "Admin group",
    description: "Administrative group details page.",
    path: `${ADMIN_BASE_PATH}/group/${groupId}`,
    noIndex: true,
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  return (
    <AdminGate>
      <GroupResponsesPage groupId={groupId} isAdminView />
    </AdminGate>
  );
}
