import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { BlogCard } from "@/components/blog/BlogCard";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { Layout } from "@/components/layout/Layout";
import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { getBlogCategory } from "@/lib/blog/categories";
import { listBlogs } from "@/lib/blog/queries";
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
  const { locale, slug } = await params;
  const category = getBlogCategory(slug);
  if (!category) return {};
  return buildLocalizedMetadata({
    locale,
    title: `${category.name} Articles`,
    description: category.description,
    path: `/blog/category/${category.slug}`,
    absoluteTitle: true,
  });
}

export default async function BlogCategoryPage({ params, searchParams = {} }: PageProps) {
  const resolved = await params;
  const locale = await resolveLocaleParam({ locale: resolved.locale });
  if (locale !== "en") notFound();
  setRequestLocale(locale);

  const category = getBlogCategory(resolved.slug);
  if (!category) notFound();

  const page = Number(getParam(searchParams.page) ?? "1");
  const result = await listBlogs({ page, category: category.name });

  return (
    <Layout>
      <section className="bg-muted/30 py-10 md:py-14">
        <div className="container max-w-4xl">
          <p className="text-sm font-semibold text-primary">Blog category</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            {category.name}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            {category.description}
          </p>
        </div>
      </section>
      <section className="py-8 md:py-10">
        <div className="container space-y-8">
          {result.blogs.length ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {result.blogs.map((blog) => (
                  <BlogCard key={blog.id} blog={blog} />
                ))}
              </div>
              <BlogPagination page={result.page} totalPages={result.totalPages} />
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <h2 className="text-lg font-semibold">No articles in this category yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">Published posts will appear here.</p>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
