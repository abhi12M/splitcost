import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { BlogCard } from "@/components/blog/BlogCard";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { Layout } from "@/components/layout/Layout";
import { Link } from "@/i18n/navigation";
import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { getBlogCategory } from "@/lib/blog/categories";
import { listBlogs } from "@/lib/blog/queries";
import { buildLocalizedMetadata } from "@/lib/seo-i18n";

export const revalidate = 60;

type PageProps = {
  params:
    | { locale: AppLocale; slug: string }
    | Promise<{ locale: AppLocale; slug: string }>;
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

async function resolveParams(params: PageProps["params"]) {
  return params instanceof Promise ? await params : params;
}

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await resolveParams(params);
  const category = getBlogCategory(slug);

  if (locale !== "en" || !category) {
    return buildLocalizedMetadata({
      locale,
      title: "Blog category",
      description: "SplitCost blog category",
      path: `/blog/category/${slug}`,
      noIndex: true,
    });
  }

  return buildLocalizedMetadata({
    locale,
    title: `${category.title} articles | SplitCost Blog`,
    description: category.description,
    path: `/blog/category/${category.slug}`,
  });
}

export default async function Page({ params, searchParams }: PageProps) {
  const { locale, slug } = await resolveParams(params);
  setRequestLocale(locale);

  if (locale !== "en") notFound();

  const category = getBlogCategory(slug);
  if (!category) notFound();

  const resolvedSearch =
    searchParams instanceof Promise ? await searchParams : searchParams ?? {};
  const page = Math.max(1, Number(firstValue(resolvedSearch.page) || 1));

  const result = await listBlogs({
    page,
    category: category.slug,
    status: "published",
    sort: "latest",
  });

  return (
    <Layout>
      <section className="border-b border-border bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.4))]">
        <div className="container py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:text-foreground">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href="/blog" className="hover:text-foreground">
                  Blog
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="text-foreground" aria-current="page">
                {category.title}
              </li>
            </ol>
          </nav>
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            {category.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            {category.description}
          </p>
        </div>
      </section>

      <section className="container space-y-8 py-10 md:py-14">
        {result.items.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <p className="text-muted-foreground">
              No published articles in this category yet.
            </p>
          </div>
        )}

        <BlogPagination page={result.page} totalPages={result.totalPages} />
      </section>
    </Layout>
  );
}
