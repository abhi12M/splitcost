import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { BlogCard } from "@/components/blog/BlogCard";
import { BlogFilters } from "@/components/blog/BlogFilters";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { Layout } from "@/components/layout/Layout";
import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { listBlogCategories, getBlogCategoryBySlug } from "@/lib/blog/category-queries";
import { listBlogs } from "@/lib/blog/queries";
import type { BlogSort } from "@/lib/blog/types";
import { buildLocalizedMetadata } from "@/lib/seo-i18n";

type PageProps = {
  params: { locale: AppLocale; slug: string } | Promise<{ locale: AppLocale; slug: string }>;
  searchParams?: Record<string, string | string[] | undefined>;
};

export const dynamic = "force-dynamic";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const locale = await resolveLocaleParam({ locale: resolved.locale });
  const category = await getBlogCategoryBySlug(resolved.slug);
  if (!category) {
    return buildLocalizedMetadata({
      locale,
      title: "Category not found",
      description: "The requested blog category could not be found.",
      path: `/blog/category/${resolved.slug}`,
      noIndex: true,
    });
  }

  return buildLocalizedMetadata({
    locale,
    title: category.name,
    description: category.description || `Articles about ${category.name}.`,
    path: `/blog/category/${category.slug}`,
  });
}

export default async function BlogCategoryPage({ params, searchParams = {} }: PageProps) {
  const resolved = await params;
  const locale = await resolveLocaleParam({ locale: resolved.locale });
  if (locale !== "en") notFound();
  setRequestLocale(locale);

  const category = await getBlogCategoryBySlug(resolved.slug);
  if (!category) notFound();

  const page = Number(getParam(searchParams.page) ?? "1");
  const query = getParam(searchParams.q) ?? "";
  const sort = (getParam(searchParams.sort) === "popular" ? "popular" : "latest") as BlogSort;
  const result = await listBlogs({ page, search: query, category: category.name, sort });
  const categories = await listBlogCategories();

  return (
    <Layout>
      <section className="bg-muted/30 py-10 md:py-14">
        <div className="container max-w-5xl">
          <p className="text-sm font-semibold text-primary">SplitCost Blog</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            {category.name}
          </h1>
          {category.description ? (
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              {category.description}
            </p>
          ) : null}
        </div>
      </section>
      <section className="py-8 md:py-10">
        <div className="container space-y-8">
          <BlogFilters categories={categories} showCategory={false} />
          {result.blogs.length ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {result.blogs.map((blog) => (
                  <BlogCard key={blog.id} blog={blog} />
                ))}
              </div>
              <BlogPagination
                page={result.page}
                totalPages={result.totalPages}
                searchParams={{ q: query, sort }}
              />
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <h2 className="text-lg font-semibold">No articles found</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a different search term or browse another category.
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
