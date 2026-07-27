import type { Metadata } from "next";

import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { BlogForm } from "@/components/admin/blog/BlogForm";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Create Blog",
  description: "Create a new SplitCost blog post.",
  path: `${ADMIN_BASE_PATH}/blogs/new`,
  noIndex: true,
});

export default function Page() {
  return (
    <AdminGate>
      <AdminShell
        title="Create blog"
        description="Draft or publish a new article. Slug and structured data are generated automatically."
      >
        <BlogForm mode="create" />
      </AdminShell>
    </AdminGate>
  );
}
