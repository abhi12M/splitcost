import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calculator,
  CalendarDays,
  Compass,
  Home,
  Landmark,
  Lightbulb,
  Plane,
  SearchCheck,
  Sparkles,
  Tag,
  Users,
  WalletCards,
} from "lucide-react";

import { BlogCard } from "@/components/blog/BlogCard";
import { FeaturedGuides } from "@/components/blog/FeaturedGuides";
import { BlogFilters } from "@/components/blog/BlogFilters";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { Layout } from "@/components/layout/Layout";
import { Link } from "@/i18n/navigation";
import { localeDefinitions } from "@/i18n/config";
import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { listBlogCategories } from "@/lib/blog/category-queries";
import {
  getPublishedBlogCategoryCounts,
  listBlogs,
  listFeaturedBlogs,
} from "@/lib/blog/queries";
import { serializeStructuredDataForHtml } from "@/lib/blog/schema";
import type { BlogSort } from "@/lib/blog/types";
import { getWebPageId, getWebsiteId } from "@/lib/schema-identity";
import { getCanonicalBlogUrl } from "@/lib/seo";
import { buildLocalizedMetadata, getLocalizedCanonicalUrl } from "@/lib/seo-i18n";

type PageProps = {
  params: { locale: AppLocale } | Promise<{ locale: AppLocale }>;
  searchParams?: Record<string, string | string[] | undefined>;
};

export const dynamic = "force-dynamic";

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const topicIcons = [Users, Plane, Home, WalletCards, Landmark, CalendarDays, BarChart3];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  // The blog is English-only and other locales are 404s, so list no
  // translations, matching the article pages.
  if (locale !== "en") notFound();

  const metadata = buildLocalizedMetadata({
    locale,
    title: "Guides to Splitting Shared Expenses | SplitCost",
    description: "Practical guides to splitting bills fairly, sharing trip and household costs, handling multiple payers, and settling up with friends and roommates.",
    path: "/blog",
    absoluteTitle: true,
  });
  const canonicalUrl = getLocalizedCanonicalUrl("en", "/blog");

  return {
    ...metadata,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        [localeDefinitions.en.hreflang]: canonicalUrl,
        "x-default": canonicalUrl,
      },
    },
    openGraph: { ...metadata.openGraph, alternateLocale: [] },
  };
}

export default async function BlogIndexPage({ params, searchParams = {} }: PageProps) {
  const locale = await resolveLocaleParam(params);
  if (locale !== "en") notFound();
  setRequestLocale(locale);

  const page = Number(getParam(searchParams.page) ?? "1");
  const query = getParam(searchParams.q) ?? "";
  const category = getParam(searchParams.category);
  const sort = (getParam(searchParams.sort) === "popular" ? "popular" : "latest") as BlogSort;
  const [result, featuredGuides, categories] = await Promise.all([
    listBlogs({ page, pageSize: 8, search: query, category, sort }),
    listFeaturedBlogs(),
    listBlogCategories(),
  ]);
  const categoryCounts = await getPublishedBlogCategoryCounts(
    categories.map((item) => item.name)
  );
  const categoriesWithPosts = categories.filter((item) => (categoryCounts[item.name] ?? 0) > 0);

  const pageUrl = getLocalizedCanonicalUrl("en", "/blog");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": getWebPageId(pageUrl),
    name: "Guides to splitting shared expenses",
    url: pageUrl,
    inLanguage: "en",
    isPartOf: { "@id": getWebsiteId() },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: result.blogs.map((blog, index) => ({
        "@type": "ListItem",
        position: (result.page - 1) * result.pageSize + index + 1,
        url: getCanonicalBlogUrl(blog.slug),
        name: blog.title,
      })),
    },
  };

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredDataForHtml(jsonLd) }}
      />
      <div className="bg-background">
        <section className="container pb-5 pt-7 md:pb-8 md:pt-10">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/" aria-label="Home" className="transition-colors hover:text-primary"><Home className="h-3.5 w-3.5" /></Link>
            <span>/</span>
            <span className="font-medium text-foreground">Guides</span>
          </nav>

          <div className={featuredGuides.length ? "grid gap-6 lg:grid-cols-[0.78fr_1.52fr] lg:items-stretch" : "max-w-2xl"}>
            <div className="flex flex-col justify-center py-2">
              <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                <Sparkles className="h-3 w-3" /> SplitCost guides
              </span>
              <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">Guides to splitting shared expenses</h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground md:text-base">
                Practical, human guides to help you split fairly, plan confidently, and keep money from getting awkward.
              </p>
              <div className="mt-6 max-w-md"><BlogFilters categories={categoriesWithPosts} showSort={false} /></div>
            </div>

            {featuredGuides.length ? <FeaturedGuides guides={featuredGuides} /> : null}
          </div>
        </section>

        <section className="container py-5">
          <h2 className="mb-3 text-sm font-bold text-foreground">Explore by topic</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Link href="/blog" className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${!category ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50"}`}>
              <Compass className="h-4 w-4" /> All topics
            </Link>
            {categoriesWithPosts.map((item, index) => {
              const Icon = topicIcons[index % topicIcons.length];
              const active = category === item.name;
              return (
                <Link key={item.slug} href={`/blog?category=${encodeURIComponent(item.name)}`} className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50 hover:text-primary"}`}>
                  <Icon className="h-4 w-4" /> {item.name}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="container pb-14 pt-4">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_285px]">
            <div>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">{query ? `Results for “${query}”` : category || "Latest guides"}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Clear answers for real-life money moments.</p>
                </div>
                <div><BlogFilters categories={categoriesWithPosts} showSearch={false} /></div>
              </div>

              {result.blogs.length ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {result.blogs.map((blog) => <BlogCard key={blog.id} blog={blog} />)}
                  </div>
                  <div className="mt-8"><BlogPagination page={result.page} totalPages={result.totalPages} searchParams={{ q: query, category, sort }} /></div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed bg-card p-12 text-center">
                  <SearchCheck className="mx-auto h-9 w-9 text-primary/50" />
                  <h2 className="mt-3 font-bold">No guides found</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Try a different keyword or browse all topics.</p>
                </div>
              )}
            </div>

            <aside className="h-fit rounded-2xl border border-border/60 bg-muted/40 p-5 lg:sticky lg:top-28">
              {categoriesWithPosts.length ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-bold"><BarChart3 className="h-4 w-4 text-primary" /> Trending topics</div>
                  <div className="mt-4 space-y-1">
                    {categoriesWithPosts.slice(0, 5).map((item) => (
                      <Link key={item.slug} href={`/blog?category=${encodeURIComponent(item.name)}`} className="flex items-center justify-between rounded-lg px-2 py-2 text-xs transition hover:bg-card hover:text-primary">
                        <span className="flex items-center gap-2"><Tag className="h-3.5 w-3.5 text-primary/70" />{item.name}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold tabular-nums text-primary">{categoryCounts[item.name]}</span>
                      </Link>
                    ))}
                  </div>
                  <div className="my-5 h-px bg-border" />
                </>
              ) : null}
              <div className="flex items-center gap-2 text-sm font-bold"><Lightbulb className="h-4 w-4 text-primary" /> Helpful tools</div>
              <div className="mt-4 space-y-2">
                <ToolLink href="/create-group" icon={Calculator} title="Group expense splitter" text="Split a bill and settle fairly" />
                <ToolLink href="/groups" icon={Users} title="Your groups" text="See balances at a glance" />
                <ToolLink href="/compare" icon={BookOpen} title="Compare split apps" text="Find the right tool for you" />
              </div>
              <Link href="/create-group" className="mt-4 flex h-10 items-center justify-center rounded-lg border border-primary/40 bg-card text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground">Start splitting free</Link>
            </aside>
          </div>
        </section>
      </div>
    </Layout>
  );
}

function ToolLink({ href, icon: Icon, title, text }: { href: string; icon: typeof Calculator; title: string; text: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition hover:border-primary/40">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1"><span className="block text-xs font-bold">{title}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{text}</span></span>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
