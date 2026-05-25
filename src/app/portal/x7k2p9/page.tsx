import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { AdminGate } from "@/components/admin/AdminGate";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

const HomePage = dynamic(() => import("@/views/Index"));

export const metadata: Metadata = buildMetadata({
  title: "Admin",
  description: "Administrative dashboard for SplitCost groups.",
  path: ADMIN_BASE_PATH,
  noIndex: true,
});

export default function Page() {
  return (
    <AdminGate>
      <HomePage adminMode />
    </AdminGate>
  );
}
