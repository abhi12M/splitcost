import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { BlogCard } from "@/components/blog/BlogCard";
import { BlogFilters } from "@/components/blog/BlogFilters";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { Layout } from "@/components/layout/Layout";
import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { listBlogs } from "@/lib/blog/queries";
import type { BlogSort } from "@/lib/blog/types";
import { buildLocalizedMetadata } from "@/lib/seo-i18n";

export const revalidate = 60;

type PageProps = {
  params: { locale: AppLocale } | Promise<{ locale: AppLocale }>;
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  if (locale !== "en") {
    return buildLocalizedMetadata({
      locale,
      title: "Blog",
      description: "SplitCost blog",
      path: "/blog",
      noIndex: true,
    });
  }

  return buildLocalizedMetadata({
    locale,
    title: "Blog | Expense splitting tips & personal finance guides",
    description:
      "Read SplitCost guides on expense splitting, travel budgeting, roommates, couples, and group finance.",
    path: "/blog",
  });
}

export default async function Page({ params, searchParams }: PageProps) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);

  if (locale !== "en") {
    notFound();
  }

  const resolvedSearch =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const page = Math.max(1, Number(firstValue(resolvedSearch.page) || 1));
  const search = firstValue(resolvedSearch.q);
  const category = firstValue(resolvedSearch.category);
  const sort = (firstValue(resolvedSearch.sort) === "popular"
    ? "popular"
    : "latest") as BlogSort;

  const result = await listBlogs({
    page,
    search,
    category: category || undefined,
    sort,
    status: "published",
  });

  return (
    <Layout>
      <section className="relative overflow-hidden border-b border-border bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_45%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.35))]">
        <div className="container py-12 md:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            SplitCost Blog
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Guides for shared expenses and smarter group budgets
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Practical articles on splitting costs, travel budgeting, roommates,
            couples, and personal finance.
          </p>
        </div>
      </section>

      <section className="container space-y-8 py-10 md:py-14">
        <BlogFilters search={search} category={category || "all"} sort={sort} />

        {result.items.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <p className="text-muted-foreground">
              No published articles match your filters yet.
            </p>
          </div>
        )}

        <BlogPagination
          page={result.page}
          totalPages={result.totalPages}
          searchParams={{
            q: search || undefined,
            category: category || undefined,
            sort: sort === "popular" ? "popular" : undefined,
          }}
        />
      </section>
    </Layout>
  );
}
