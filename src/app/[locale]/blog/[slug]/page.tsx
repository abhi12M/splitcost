import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { BlogDetailView } from "@/components/blog/BlogDetailView";
import { resolveLocaleParam } from "@/i18n/params";
import { localeDefinitions } from "@/i18n/config";
import type { AppLocale } from "@/i18n/routing";
import {
  getBlogBySlug,
  getPublishedBlogRedirectSlug,
  getRelatedBlogs,
} from "@/lib/blog/queries";
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
  const { locale: localeParam, slug } = await params;
  const locale = await resolveLocaleParam({ locale: localeParam });

  // Articles are only available in English. Missing articles and other
  // locales get the not-found page's noindex metadata and a real 404 status,
  // rather than the layout's defaults.
  if (locale !== "en") notFound();

  const blog = await getBlogBySlug(slug);
  if (!blog) {
    const redirectSlug = await getPublishedBlogRedirectSlug(slug);
    if (redirectSlug) {
      permanentRedirect(`/en/blog/${encodeURIComponent(redirectSlug)}`);
    }
    notFound();
  }

  const canonicalUrl = getCanonicalUrl(`/${locale}/blog/${blog.slug}`);
  const image = blog.cover_image || DEFAULT_OG_IMAGE;

  return {
    title: { absolute: blog.title },
    description: blog.excerpt,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        [localeDefinitions.en.hreflang]: canonicalUrl,
        "x-default": canonicalUrl,
      },
    },
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
  if (!blog) {
    const redirectSlug = await getPublishedBlogRedirectSlug(resolved.slug);
    if (redirectSlug) {
      permanentRedirect(`/en/blog/${encodeURIComponent(redirectSlug)}`);
    }
    notFound();
  }

  const relatedBlogs = await getRelatedBlogs(blog, 4);

  return <BlogDetailView blog={blog} relatedBlogs={relatedBlogs} />;
}
