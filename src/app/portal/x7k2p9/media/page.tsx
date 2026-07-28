import type { Metadata } from "next";

import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { MediaAdmin } from "@/components/admin/media/MediaAdmin";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Media",
  description: "Manage SplitCost admin media.",
  path: `${ADMIN_BASE_PATH}/media`,
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default function MediaAdminPage() {
  return (
    <AdminGate>
      <AdminShell>
        <MediaAdmin />
      </AdminShell>
    </AdminGate>
  );
}
