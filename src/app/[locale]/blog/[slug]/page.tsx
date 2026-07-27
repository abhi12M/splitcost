import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { BlogArticle } from "@/components/blog/BlogArticle";
import { Layout } from "@/components/layout/Layout";
import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import {
  getAdjacentBlogs,
  getBlogBySlug,
  getRelatedBlogs,
} from "@/lib/blog/queries";
import { resolveBlogStructuredData } from "@/lib/blog/structured-data";
import { DEFAULT_OG_IMAGE, getSiteUrl, SITE_NAME } from "@/lib/seo";
import {
  buildLocalizedMetadata,
  getLocalizedCanonicalUrl,
} from "@/lib/seo-i18n";

export const revalidate = 60;

type PageProps = {
  params:
    | { locale: AppLocale; slug: string }
    | Promise<{ locale: AppLocale; slug: string }>;
};

async function resolveParams(params: PageProps["params"]) {
  return params instanceof Promise ? await params : params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await resolveParams(params);

  if (locale !== "en") {
    return buildLocalizedMetadata({
      locale,
      title: "Blog",
      description: "SplitCost blog",
      path: `/blog/${slug}`,
      noIndex: true,
    });
  }

  const post = await getBlogBySlug(slug);
  if (!post) {
    return buildLocalizedMetadata({
      locale,
      title: "Article not found",
      description: "This blog post could not be found.",
      path: `/blog/${slug}`,
      noIndex: true,
    });
  }

  const metadata = buildLocalizedMetadata({
    locale,
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    noIndex: post.nofollow,
    absoluteTitle: true,
  });

  const image = post.cover_image || DEFAULT_OG_IMAGE;
  const canonical = getLocalizedCanonicalUrl("en", `/blog/${post.slug}`);

  return {
    ...metadata,
    title: { absolute: `${post.title} | ${SITE_NAME}` },
    robots: post.nofollow
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : {
          index: true,
          follow: true,
        },
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      url: canonical,
      title: post.title,
      description: post.excerpt,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: [post.author],
      images: [
        {
          url: image.startsWith("http") ? image : `${getSiteUrl()}${image}`,
          width: 1200,
          height: 630,
          alt: post.cover_image_alt || post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [image.startsWith("http") ? image : `${getSiteUrl()}${image}`],
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { locale, slug } = await resolveParams(params);
  setRequestLocale(locale);

  if (locale !== "en") {
    notFound();
  }

  const post = await getBlogBySlug(slug);
  if (!post) notFound();

  const [{ previous, next }, related] = await Promise.all([
    getAdjacentBlogs(post),
    getRelatedBlogs(post),
  ]);

  const structuredData = resolveBlogStructuredData(post);

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      <BlogArticle
        post={post}
        previous={previous}
        next={next}
        related={related}
      />
    </Layout>
  );
}
