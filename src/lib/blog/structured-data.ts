import type { BlogFaq, BlogPost } from "@/lib/blog/types";
import { getBlogCategoryTitle } from "@/lib/blog/categories";
import { getSiteUrl, SITE_NAME } from "@/lib/seo";
import { getLocalizedCanonicalUrl } from "@/lib/seo-i18n";

export type BlogStructuredDataInput = {
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: string | null;
  coverImageAlt?: string | null;
  author: string;
  authorAvatar?: string | null;
  category: string;
  publishedAt?: string | null;
  updatedAt?: string | null;
  faqs?: BlogFaq[] | null;
};

function absoluteUrl(pathOrUrl: string | null | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  return `${getSiteUrl()}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function buildBlogPostingSchema(input: BlogStructuredDataInput) {
  const url = getLocalizedCanonicalUrl("en", `/blog/${input.slug}`);
  const image = absoluteUrl(input.coverImage);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: input.title,
    description: input.excerpt,
    url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    inLanguage: "en",
    datePublished: input.publishedAt ?? undefined,
    dateModified: input.updatedAt ?? input.publishedAt ?? undefined,
    author: {
      "@type": "Person",
      name: input.author,
      ...(input.authorAvatar
        ? { image: absoluteUrl(input.authorAvatar) }
        : {}),
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: getSiteUrl(),
      logo: {
        "@type": "ImageObject",
        url: `${getSiteUrl()}/android-chrome-512x512.png`,
      },
    },
    articleSection: getBlogCategoryTitle(input.category),
    ...(image
      ? {
          image: {
            "@type": "ImageObject",
            url: image,
            ...(input.coverImageAlt ? { caption: input.coverImageAlt } : {}),
          },
        }
      : {}),
  };
}

export function buildBlogBreadcrumbSchema(input: {
  title: string;
  slug: string;
  category: string;
}) {
  const blogUrl = getLocalizedCanonicalUrl("en", "/blog");
  const categoryUrl = getLocalizedCanonicalUrl(
    "en",
    `/blog/category/${input.category}`
  );
  const postUrl = getLocalizedCanonicalUrl("en", `/blog/${input.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: getLocalizedCanonicalUrl("en", "/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: blogUrl,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: getBlogCategoryTitle(input.category),
        item: categoryUrl,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: input.title,
        item: postUrl,
      },
    ],
  };
}

export function buildBlogFaqSchema(faqs: BlogFaq[], slug: string) {
  if (!faqs.length) return null;
  const pageUrl = getLocalizedCanonicalUrl("en", `/blog/${slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    url: pageUrl,
    inLanguage: "en",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildAutoStructuredData(input: BlogStructuredDataInput) {
  const graph: Record<string, unknown>[] = [
    buildBlogPostingSchema(input),
    buildBlogBreadcrumbSchema({
      title: input.title,
      slug: input.slug,
      category: input.category,
    }),
  ];

  const faqSchema = buildBlogFaqSchema(input.faqs ?? [], input.slug);
  if (faqSchema) graph.push(faqSchema);

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function resolveBlogStructuredData(
  post: Pick<
    BlogPost,
    | "title"
    | "slug"
    | "excerpt"
    | "cover_image"
    | "cover_image_alt"
    | "author"
    | "author_avatar"
    | "category"
    | "published_at"
    | "updated_at"
    | "faqs"
    | "structured_data"
  >
) {
  if (post.structured_data && typeof post.structured_data === "object") {
    return post.structured_data;
  }

  return buildAutoStructuredData({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    coverImage: post.cover_image,
    coverImageAlt: post.cover_image_alt,
    author: post.author,
    authorAvatar: post.author_avatar,
    category: post.category,
    publishedAt: post.published_at,
    updatedAt: post.updated_at,
    faqs: post.faqs,
  });
}
