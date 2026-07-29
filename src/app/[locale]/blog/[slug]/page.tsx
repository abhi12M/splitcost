import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CalendarDays, ChevronRight, Clock3 } from "lucide-react";

import { BlogArticle } from "@/components/blog/BlogArticle";
import { BlogReadingProgress } from "@/components/blog/BlogReadingProgress";
import { BlogCard } from "@/components/blog/BlogCard";
import { Layout } from "@/components/layout/Layout";
import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { getBlogBySlug, getRelatedBlogs, incrementBlogViews } from "@/lib/blog/queries";
import { buildBlogStructuredData } from "@/lib/blog/schema";
import { getBlogCategoryByName } from "@/lib/blog/categories";
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
  const category = getBlogCategoryByName(blog.category);

  return (
    <Layout>
      <BlogReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article data-blog-article className="blog-detail-page bg-background text-foreground">
        <section className="blog-hero relative border-b border-border bg-muted/40">
          <div className="container relative min-h-[515px] py-6 md:py-10 lg:py-7">
            <div className="blog-hero-image absolute inset-0 hidden overflow-hidden lg:block">
              {blog.cover_image ? (
                <img src={blog.cover_image} alt={blog.cover_alt || blog.title} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(circle_at_75%_30%,hsl(var(--primary)/.2),transparent_32%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))]" />
              )}
            </div>
            <div className="relative z-10 flex min-h-[467px] max-w-[650px] flex-col justify-center rounded-2xl bg-white px-6 py-8 shadow-[0_18px_50px_rgba(45,37,25,0.08)] sm:px-10 lg:px-12">
              <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <Link href="/" className="transition-colors hover:text-primary hover:underline">Home</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link href="/blog" className="transition-colors hover:text-primary hover:underline">Blog</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                {category ? (
                  <Link href={`/blog/category/${category.slug}`} className="truncate transition-colors hover:text-primary hover:underline">
                    {blog.category}
                  </Link>
                ) : (
                  <span className="truncate" aria-current="page">{blog.category}</span>
                )}
              </nav>
              <span className="mb-5 w-fit rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                {blog.category}
              </span>
              <h1 className="font-serif text-[2.35rem] leading-[1.08] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-[3.45rem]">
                {blog.title}
              </h1>
              <p className="mt-5 max-w-[535px] text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-6">{blog.excerpt}</p>
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Updated {formatBlogDate(blog.published_at)}</span>
                <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/60 sm:block" />
                <span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {blog.reading_time} min read</span>
              </div>
            </div>
            <div className="relative z-10 mt-5 aspect-[16/9] overflow-hidden rounded-xl bg-muted lg:hidden">
              {blog.cover_image ? <img src={blog.cover_image} alt={blog.cover_alt || blog.title} className="h-full w-full object-cover" /> : null}
            </div>
          </div>
        </section>
        <section className="pb-16 pt-8 md:pt-12">
          <div className="container max-w-[1180px]">
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
