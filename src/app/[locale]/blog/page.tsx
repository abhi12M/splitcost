import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { BlogCard } from "@/components/blog/BlogCard";
import { BlogFilters } from "@/components/blog/BlogFilters";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { Layout } from "@/components/layout/Layout";
import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import { listBlogs } from "@/lib/blog/queries";
import type { BlogSort } from "@/lib/blog/types";
import { buildLocalizedMetadata } from "@/lib/seo-i18n";
import { notFound } from "next/navigation";

type PageProps = {
  params: { locale: AppLocale } | Promise<{ locale: AppLocale }>;
  searchParams?: Record<string, string | string[] | undefined>;
};

export const dynamic = "force-dynamic";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  return buildLocalizedMetadata({
    locale,
    title: "SplitCost Blog",
    description:
      "Guides on expense splitting, travel budgeting, personal finance, roommates, couples, and group expenses.",
    path: "/blog",
    absoluteTitle: true,
  });
}

export default async function BlogIndexPage({ params, searchParams = {} }: PageProps) {
  const locale = await resolveLocaleParam(params);
  if (locale !== "en") notFound();
  setRequestLocale(locale);

  const page = Number(getParam(searchParams.page) ?? "1");
  const query = getParam(searchParams.q) ?? "";
  const category = getParam(searchParams.category);
  const sort = (getParam(searchParams.sort) === "popular" ? "popular" : "latest") as BlogSort;
  const result = await listBlogs({ page, search: query, category, sort });

  return (
    <Layout>
      <section className="bg-muted/30 py-10 md:py-14">
        <div className="container max-w-5xl">
          <p className="text-sm font-semibold text-primary">SplitCost Blog</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Better ways to split, budget, and settle up
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            Practical guides for shared expenses, trips, roommates, couples, events, and personal finance.
          </p>
        </div>
      </section>
      <section className="py-8 md:py-10">
        <div className="container space-y-8">
          <BlogFilters />
          <div className="flex flex-wrap gap-2">
            {BLOG_CATEGORIES.map((item) => (
              <a
                key={item.slug}
                href={`/en/blog?category=${encodeURIComponent(item.name)}`}
                className="rounded-full border px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
              >
                {item.name}
              </a>
            ))}
          </div>
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
                searchParams={{ q: query, category, sort }}
              />
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <h2 className="text-lg font-semibold">No articles found</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a different search term or category.
              </p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
