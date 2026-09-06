import type { Json } from "@/integrations/supabase/types";
import { DEFAULT_OG_IMAGE, getCanonicalUrl, getSiteUrl } from "@/lib/seo";
import {
  getBlogPostingId,
  getBreadcrumbId,
  getImageObjectId,
  getOrganizationId,
  getWebPageId,
  getWebsiteId,
} from "@/lib/schema-identity";
import { buildBlogAuthorStructuredData } from "./author-schema";
import { extractBlogContentHeading } from "./content-heading";
import { parseBlogFaq } from "./faq";
import type { Blog } from "./types";
import { stripHtml } from "./utils";

type BlogSchemaInput = Pick<
  Blog,
  "title" | "slug" | "excerpt" | "content" | "cover_image" | "cover_alt" | "category" | "author" | "published_at" | "reading_time"
> & {
  updated_at?: string | null;
};

function absoluteImageUrl(value: string) {
  return new URL(value, `${getSiteUrl()}/`).toString();
}

export function buildBlogStructuredData(blog: BlogSchemaInput): Json {
  const canonicalUrl = getCanonicalUrl(`/en/blog/${blog.slug}`);
  const blogIndexUrl = getCanonicalUrl("/en/blog");
  const imageUrl = absoluteImageUrl(blog.cover_image || DEFAULT_OG_IMAGE);
  const imageId = blog.cover_image ? getImageObjectId(imageUrl) : undefined;
  const breadcrumbId = getBreadcrumbId(canonicalUrl);
  const author = buildBlogAuthorStructuredData(blog.author);
  const { content: articleContent } = extractBlogContentHeading(blog.content);
  const text = stripHtml(articleContent);
  const faq = parseBlogFaq(articleContent);
  const breadcrumbItems: Json[] = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: getCanonicalUrl("/en"),
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Blog",
      item: blogIndexUrl,
    },
  ];

  breadcrumbItems.push({
    "@type": "ListItem",
    position: breadcrumbItems.length + 1,
    name: blog.title,
    item: canonicalUrl,
  });

  const graph: Json[] = [
    {
      "@type": "BlogPosting",
      "@id": getBlogPostingId(canonicalUrl),
      headline: blog.title,
      description: blog.excerpt,
      image: imageId ? { "@id": imageId } : imageUrl,
      thumbnailUrl: imageUrl,
      datePublished: blog.published_at ?? undefined,
      dateModified: blog.updated_at ?? blog.published_at ?? undefined,
      ...(author ? { author } : {}),
      publisher: { "@id": getOrganizationId() },
      mainEntityOfPage: { "@id": getWebPageId(canonicalUrl) },
      wordCount: text ? text.split(/\s+/).filter(Boolean).length : undefined,
      timeRequired: blog.reading_time ? `PT${blog.reading_time}M` : undefined,
      articleBody: text || undefined,
    },
    ...(imageId
      ? [
          {
            "@type": "ImageObject",
            "@id": imageId,
            url: imageUrl,
            contentUrl: imageUrl,
            caption: blog.cover_alt || blog.title,
            representativeOfPage: true,
          },
        ]
      : []),
    {
      "@type": "WebPage",
      "@id": getWebPageId(canonicalUrl),
      url: canonicalUrl,
      isPartOf: { "@id": getWebsiteId() },
      breadcrumb: { "@id": breadcrumbId },
    },
    {
      "@type": "BreadcrumbList",
      "@id": breadcrumbId,
      itemListElement: breadcrumbItems,
    },
  ];

  if (faq?.items.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${canonicalUrl}#faq`,
      url: canonicalUrl,
      mainEntity: faq.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: stripHtml(item.answer),
        },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function buildPublicBlogStructuredData(blog: Blog): Json | null {
  return blog.no_index ? null : buildBlogStructuredData(blog);
}

export function formatStructuredData(schema: Json | null | undefined) {
  return schema ? JSON.stringify(schema, null, 2) : "";
}

/** Serialize JSON-LD for an inline HTML script without changing its data. */
export function serializeStructuredDataForHtml(schema: Json) {
  return JSON.stringify(schema)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
