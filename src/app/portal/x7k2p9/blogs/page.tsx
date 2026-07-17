import type { Metadata } from "next";

import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { BlogAdminList } from "@/components/admin/blog/BlogAdminList";
import { listAllBlogs } from "@/lib/blog/queries";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Blogs",
  description: "Manage SplitCost blog posts.",
  path: `${ADMIN_BASE_PATH}/blogs`,
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function BlogsAdminPage() {
  const blogs = await listAllBlogs();

  return (
    <AdminGate>
      <AdminShell>
        <BlogAdminList blogs={blogs} />
      </AdminShell>
    </AdminGate>
  );
}
