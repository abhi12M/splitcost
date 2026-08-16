import type { Json } from "@/integrations/supabase/types";
import { DEFAULT_OG_IMAGE, SITE_NAME, getCanonicalUrl, getSiteUrl } from "@/lib/seo";
import { parseBlogFaq } from "./faq";
import type { BlogInput } from "./types";
import { stripHtml } from "./utils";

type BlogSchemaInput = Pick<
  BlogInput,
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
  const imageId = `${canonicalUrl}#primaryimage`;
  const breadcrumbId = `${canonicalUrl}#breadcrumb`;
  const text = stripHtml(blog.content);
  const faq = parseBlogFaq(blog.content);
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

  if (blog.category) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: breadcrumbItems.length + 1,
      name: blog.category,
      item: `${blogIndexUrl}?category=${encodeURIComponent(blog.category)}`,
    });
  }

  breadcrumbItems.push({
    "@type": "ListItem",
    position: breadcrumbItems.length + 1,
    name: blog.title,
    item: canonicalUrl,
  });

  const graph: Json[] = [
    {
      "@type": "BlogPosting",
      "@id": `${canonicalUrl}#blog-posting`,
      headline: blog.title,
      description: blog.excerpt,
      image: { "@id": imageId },
      thumbnailUrl: imageUrl,
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
      breadcrumb: { "@id": breadcrumbId },
      wordCount: text ? text.split(/\s+/).filter(Boolean).length : undefined,
      timeRequired: blog.reading_time ? `PT${blog.reading_time}M` : undefined,
      articleBody: text || undefined,
    },
    {
      "@type": "ImageObject",
      "@id": imageId,
      url: imageUrl,
      contentUrl: imageUrl,
      caption: blog.cover_alt || blog.title,
      representativeOfPage: true,
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

export function formatStructuredData(schema: Json | null | undefined) {
  return schema ? JSON.stringify(schema, null, 2) : "";
}
