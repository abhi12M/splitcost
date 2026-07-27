import type { Metadata } from "next";

import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { GroupsListSection } from "@/components/groups/GroupsListSection";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Admin Groups",
  description: "Manage all SplitCost groups.",
  path: `${ADMIN_BASE_PATH}/groups`,
  noIndex: true,
});

export default function Page() {
  return (
    <AdminGate>
      <AdminShell
        title="Groups"
        description="Browse and manage every group in the system."
      >
        <GroupsListSection adminMode />
      </AdminShell>
    </AdminGate>
  );
}
