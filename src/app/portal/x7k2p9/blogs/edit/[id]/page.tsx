import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { BlogForm } from "@/components/admin/blog/BlogForm";
import { getBlogById } from "@/lib/blog/queries";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

type PageProps = {
  params: { id: string };
};

export const metadata: Metadata = buildMetadata({
  title: "Edit Blog",
  description: "Edit a SplitCost blog post.",
  path: `${ADMIN_BASE_PATH}/blogs/edit`,
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function EditBlogPage({ params }: PageProps) {
  const blog = await getBlogById(params.id);
  if (!blog) notFound();

  return (
    <AdminGate>
      <AdminShell>
        <BlogForm blog={blog} />
      </AdminShell>
    </AdminGate>
  );
}
