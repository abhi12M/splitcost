import type { MetadataRoute } from "next";

import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import { getPublishedBlogPaths } from "@/lib/blog/queries";
import { buildLocaleSitemapEntries } from "@/lib/seo-i18n";
import { getCanonicalUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogPaths = await getPublishedBlogPaths();
  const now = new Date();

  return [
    ...buildLocaleSitemapEntries(),
    {
      url: getCanonicalUrl("/en/blog"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...BLOG_CATEGORIES.map((category) => ({
      url: getCanonicalUrl(`/en/blog/category/${category.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    })),
    ...blogPaths.map((blog) => ({
      url: getCanonicalUrl(`/en/blog/${blog.slug}`),
      lastModified: new Date(blog.updated_at ?? blog.published_at ?? now),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
