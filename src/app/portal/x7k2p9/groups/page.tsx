import type { Metadata } from "next";

import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { GroupsListSection } from "@/components/groups/GroupsListSection";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Groups",
  description: "Manage SplitCost groups.",
  path: `${ADMIN_BASE_PATH}/groups`,
  noIndex: true,
});

export default function GroupsAdminPage() {
  return (
    <AdminGate>
      <AdminShell>
        <GroupsListSection adminMode />
      </AdminShell>
    </AdminGate>
  );
}
