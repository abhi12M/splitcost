import type { Json } from "@/integrations/supabase/types";
import { DEFAULT_OG_IMAGE, SITE_NAME, getCanonicalUrl, getSiteUrl } from "@/lib/seo";
import type { Blog, BlogInput } from "./types";
import { stripHtml } from "./utils";

type BlogSchemaInput = Pick<
  BlogInput,
  "title" | "slug" | "excerpt" | "content" | "cover_image" | "author" | "published_at" | "reading_time"
> & {
  updated_at?: string | null;
};

export function buildBlogStructuredData(blog: BlogSchemaInput): Json {
  const canonicalUrl = getCanonicalUrl(`/en/blog/${blog.slug}`);
  const image = blog.cover_image || `${getSiteUrl()}${DEFAULT_OG_IMAGE}`;
  const text = stripHtml(blog.content);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${canonicalUrl}#blog-posting`,
    headline: blog.title,
    description: blog.excerpt,
    image: [image],
    datePublished: blog.published_at ?? undefined,
    dateModified: blog.updated_at ?? blog.published_at ?? undefined,
    author: {
      "@type": "Person",
      name: blog.author,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${getSiteUrl()}/android-chrome-512x512.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    wordCount: text ? text.split(/\s+/).filter(Boolean).length : undefined,
    timeRequired: blog.reading_time ? `PT${blog.reading_time}M` : undefined,
    articleBody: text || undefined,
  };
}

export function formatStructuredData(schema: Json | null | undefined) {
  return schema ? JSON.stringify(schema, null, 2) : "";
}
