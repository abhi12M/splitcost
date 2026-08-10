import type { Metadata } from "next";

import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { BlogCategoryAdmin } from "@/components/admin/blog/BlogCategoryAdmin";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Blog Categories",
  description: "Manage SplitCost blog categories.",
  path: `${ADMIN_BASE_PATH}/categories`,
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default function BlogCategoriesAdminPage() {
  return (
    <AdminGate>
      <AdminShell>
        <BlogCategoryAdmin />
      </AdminShell>
    </AdminGate>
  );
}
