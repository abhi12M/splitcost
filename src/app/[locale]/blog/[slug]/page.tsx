import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { BlogViewTracker } from "@/components/blog/BlogViewTracker";
import { BlogArticle } from "@/components/blog/BlogArticle";
import { BlogArticleHeader } from "@/components/blog/BlogArticleHeader";
import { BlogCta } from "@/components/blog/BlogCta";
import { BlogReadingProgress } from "@/components/blog/BlogReadingProgress";
import { BlogScrollToTop } from "@/components/blog/BlogScrollToTop";
import { RelatedBlogs } from "@/components/blog/RelatedBlogs";
import { Layout } from "@/components/layout/Layout";
import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { getBlogBySlug, getRelatedBlogs } from "@/lib/blog/queries";
import { buildBlogStructuredData } from "@/lib/blog/schema";
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  getCanonicalUrl,
} from "@/lib/seo";

type PageProps = {
  params: { locale: AppLocale; slug: string } | Promise<{ locale: AppLocale; slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) return {};

  const canonicalUrl = getCanonicalUrl(`/${locale}/blog/${blog.slug}`);
  const image = blog.cover_image || DEFAULT_OG_IMAGE;

  return {
    title: { absolute: `${blog.title} | ${SITE_NAME}` },
    description: blog.excerpt,
    alternates: { canonical: canonicalUrl },
    robots: blog.no_index
      ? {
          index: false,
          follow: true,
          googleBot: {
            index: false,
            follow: true,
          },
        }
      : undefined,
    openGraph: {
      title: blog.title,
      description: blog.excerpt,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type: "article",
      publishedTime: blog.published_at ?? undefined,
      authors: [blog.author],
      images: [{ url: image, width: 1200, height: 630, alt: blog.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: blog.title,
      description: blog.excerpt,
      images: [image],
    },
  };
}

export default async function BlogDetailPage({ params }: PageProps) {
  const resolved = await params;
  const locale = await resolveLocaleParam({ locale: resolved.locale });
  if (locale !== "en") notFound();
  setRequestLocale(locale);

  const blog = await getBlogBySlug(resolved.slug);
  if (!blog) notFound();

  const relatedBlogs = await getRelatedBlogs(blog, 4);

  const jsonLd = blog.schema_json ?? buildBlogStructuredData(blog);
  return (
    <Layout>
      <BlogViewTracker blogId={blog.id} />
      <BlogReadingProgress />
      <BlogScrollToTop />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article data-blog-article className="blog-detail-page bg-background text-foreground">
        <BlogArticleHeader blog={blog} />
        <section className="pb-8 pt-10 md:pb-10 md:pt-14">
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
