import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CalendarDays, ChevronRight, Clock3 } from "lucide-react";

import { BlogViewTracker } from "@/components/blog/BlogViewTracker";
import { BlogArticle } from "@/components/blog/BlogArticle";
import { BlogCta } from "@/components/blog/BlogCta";
import { BlogReadingProgress } from "@/components/blog/BlogReadingProgress";
import { BlogScrollToTop } from "@/components/blog/BlogScrollToTop";
import { RelatedBlogs } from "@/components/blog/RelatedBlogs";
import { Layout } from "@/components/layout/Layout";
import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { getBlogBySlug, getRelatedBlogs } from "@/lib/blog/queries";
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
        <section className="blog-hero relative overflow-hidden border-b border-border bg-background">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_14%_0%,hsl(var(--primary)/.09),transparent_62%)]" />
          <div className="container relative py-5 md:py-8 lg:py-9">
            <div className="grid overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-[0_24px_70px_rgba(15,23,42,0.10)] lg:min-h-[500px] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
              <div className="relative z-10 flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-11 lg:px-12 lg:py-14 xl:px-14">
                <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Link href="/" className="transition-colors hover:text-primary hover:underline">Home</Link>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <Link href="/blog" className="transition-colors hover:text-primary hover:underline">Blog</Link>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <Link
                    href={`/blog?category=${encodeURIComponent(blog.category)}`}
                    className="truncate transition-colors hover:text-primary hover:underline"
                  >
                    {blog.category}
                  </Link>
                </nav>
                <div className="mb-5 flex items-center gap-3">
                  <span className="h-px w-7 bg-primary" aria-hidden="true" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                    {blog.category}
                  </span>
                </div>
                <h1 className="max-w-[610px] font-serif text-[2.5rem] leading-[1.04] tracking-[-0.04em] text-foreground sm:text-5xl lg:text-[3.25rem] xl:text-[3.6rem]">
                  {blog.title}
                </h1>
                <p className="mt-6 max-w-[560px] text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">{blog.excerpt}</p>
                <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 pt-5 text-xs font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Updated {formatBlogDate(blog.published_at)}</span>
                  <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/60 sm:block" />
                  <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {blog.reading_time} min read</span>
                </div>
              </div>
              <div className="relative min-h-[290px] overflow-hidden bg-muted sm:min-h-[380px] lg:min-h-full">
                {blog.cover_image ? (
                  <img
                    src={blog.cover_image}
                    alt={blog.cover_alt || blog.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-[1.015]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_30%,hsl(var(--primary)/.25),transparent_32%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))]" />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/15 via-transparent to-transparent lg:bg-gradient-to-r lg:from-card/20 lg:via-transparent lg:to-transparent" />
                <div className="absolute bottom-5 left-5 rounded-full border border-white/30 bg-black/35 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-sm backdrop-blur-md sm:bottom-6 sm:left-6">
                  {blog.category} guide
                </div>
              </div>
            </div>
          </div>
        </section>
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
