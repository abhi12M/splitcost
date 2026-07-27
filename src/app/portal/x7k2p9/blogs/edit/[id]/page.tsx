import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { BlogForm } from "@/components/admin/blog/BlogForm";
import { getBlogById } from "@/lib/blog/queries";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
};

async function resolveId(params: PageProps["params"]) {
  const resolved = params instanceof Promise ? await params : params;
  return resolved.id;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = await resolveId(params);
  return buildMetadata({
    title: "Edit Blog",
    description: "Edit a SplitCost blog post.",
    path: `${ADMIN_BASE_PATH}/blogs/edit/${id}`,
    noIndex: true,
  });
}

export default async function Page({ params }: PageProps) {
  const id = await resolveId(params);
  const post = await getBlogById(id);
  if (!post) notFound();

  return (
    <AdminGate>
      <AdminShell
        title="Edit blog"
        description="Update content, SEO fields, nofollow, and structured data."
      >
        <BlogForm mode="edit" initial={post} />
      </AdminShell>
    </AdminGate>
  );
}
