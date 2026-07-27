import type { Metadata } from "next";

import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminGate } from "@/components/admin/AdminGate";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Admin Dashboard",
  description: "Administrative dashboard for SplitCost groups and blogs.",
  path: ADMIN_BASE_PATH,
  noIndex: true,
});

export default function Page() {
  return (
    <AdminGate>
      <AdminDashboard />
    </AdminGate>
  );
}
