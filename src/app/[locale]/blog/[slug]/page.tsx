import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { BlogArticle } from "@/components/blog/BlogArticle";
import { BlogCard } from "@/components/blog/BlogCard";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { getBlogBySlug, getRelatedBlogs, incrementBlogViews } from "@/lib/blog/queries";
import { buildBlogStructuredData } from "@/lib/blog/schema";
import { formatBlogDate } from "@/lib/blog/utils";
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

  const relatedBlogs = await getRelatedBlogs(blog);
  void incrementBlogViews(blog.id, blog.views);

  const jsonLd = blog.schema_json ?? buildBlogStructuredData(blog);

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article>
        <section className="py-8 md:py-12">
          <div className="container max-w-4xl">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge>{blog.category}</Badge>
                <span>{formatBlogDate(blog.published_at)}</span>
                <span>{blog.reading_time} min read</span>
                <span>By {blog.author}</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                {blog.title}
              </h1>
              <p className="text-lg leading-8 text-muted-foreground">{blog.excerpt}</p>
            </div>
          </div>
        </section>
        <section className="pb-10">
          <div className="container">
            <div className="relative mx-auto aspect-[16/8] max-w-5xl overflow-hidden rounded-lg bg-muted">
              {blog.cover_image ? (
                <img
                  src={blog.cover_image}
                  alt={blog.cover_alt || blog.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-primary-muted text-primary">
                  SplitCost Blog
                </div>
              )}
            </div>
          </div>
        </section>
        <section className="pb-12">
          <div className="container max-w-6xl">
            <BlogArticle blog={blog} />
          </div>
        </section>
      </article>
      {relatedBlogs.length ? (
        <section className="border-t bg-muted/30 py-10">
          <div className="container space-y-6">
            <h2 className="text-2xl font-bold">Related blogs</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relatedBlogs.map((item) => (
                <BlogCard key={item.id} blog={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </Layout>
  );
}
