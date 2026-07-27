import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { BlogAdminList } from "@/components/admin/blog/BlogAdminList";
import { Button } from "@/components/ui/button";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Admin Blogs",
  description: "Manage SplitCost blog posts.",
  path: `${ADMIN_BASE_PATH}/blogs`,
  noIndex: true,
});

export default function Page() {
  return (
    <AdminGate>
      <AdminShell
        title="Blogs"
        description="Create, edit, and publish SEO-friendly articles."
        actions={
          <Button asChild>
            <Link href={`${ADMIN_BASE_PATH}/blogs/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New blog
            </Link>
          </Button>
        }
      >
        <BlogAdminList />
      </AdminShell>
    </AdminGate>
  );
}
