import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { BlogDetailView } from "@/components/blog/BlogDetailView";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import { getBlogById, getRelatedBlogs } from "@/lib/blog/queries";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
};

export const metadata: Metadata = buildMetadata({
  title: "Blog Preview",
  description: "Preview a SplitCost blog post.",
  path: `${ADMIN_BASE_PATH}/blogs/preview`,
  noIndex: true,
});

export const dynamic = "force-dynamic";

/**
 * Admin-only preview of the saved draft. It renders the same page as the
 * public article route, so what the author sees here is what readers get
 * once it is published.
 */
export default async function BlogPreviewPage({ params }: PageProps) {
  // The draft is read on the server, so the session is checked here rather
  // than by the client-side AdminGate, which would still ship the content.
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value ?? null;
  if (!verifyAdminSessionToken(token)) redirect(ADMIN_BASE_PATH);

  const { id } = await params;
  const blog = await getBlogById(id);
  if (!blog) notFound();

  const relatedBlogs = await getRelatedBlogs(blog, 4);

  return <BlogDetailView blog={blog} relatedBlogs={relatedBlogs} draftPreview />;
}
