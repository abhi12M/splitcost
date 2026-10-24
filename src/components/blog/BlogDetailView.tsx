import { BlogArticle } from "@/components/blog/BlogArticle";
import { BlogArticleHeader } from "@/components/blog/BlogArticleHeader";
import { BlogCta } from "@/components/blog/BlogCta";
import { BlogReadingProgress } from "@/components/blog/BlogReadingProgress";
import { BlogScrollToTop } from "@/components/blog/BlogScrollToTop";
import { BlogViewTracker } from "@/components/blog/BlogViewTracker";
import { RelatedBlogs } from "@/components/blog/RelatedBlogs";
import { Layout } from "@/components/layout/Layout";
import {
  buildPublicBlogStructuredData,
  serializeStructuredDataForHtml,
} from "@/lib/blog/schema";
import type { Blog } from "@/lib/blog/types";

type BlogDetailViewProps = {
  blog: Blog;
  relatedBlogs: Blog[];
  /** Admin preview: marks the page as a draft preview and skips view counting and structured data. */
  draftPreview?: boolean;
};

/**
 * The full article page shared by the public blog route and the admin
 * preview, so a change here shows up in both.
 */
export function BlogDetailView({ blog, relatedBlogs, draftPreview = false }: BlogDetailViewProps) {
  const jsonLd = draftPreview ? null : buildPublicBlogStructuredData(blog);

  return (
    <Layout>
      {draftPreview ? null : <BlogViewTracker blogId={blog.id} />}
      <BlogReadingProgress />
      <BlogScrollToTop />
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeStructuredDataForHtml(jsonLd) }}
        />
      ) : null}
      <article data-blog-article className="blog-detail-page bg-background text-foreground">
        <BlogArticleHeader blog={blog} showBreadcrumb draftPreview={draftPreview} />
        <section className="pb-8 md:pb-10">
          <div className="container max-w-[1180px]">
            <BlogArticle blog={blog} />
          </div>
        </section>
      </article>
      <BlogCta />
      <RelatedBlogs blogs={relatedBlogs} />
    </Layout>
  );
}
