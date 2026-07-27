import type { MetadataRoute } from "next";

import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import { getPublishedBlogSlugs } from "@/lib/blog/queries";
import {
  buildLocaleSitemapEntries,
  getLocalizedCanonicalUrl,
} from "@/lib/seo-i18n";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = buildLocaleSitemapEntries();

  let blogEntries: MetadataRoute.Sitemap = [
    {
      url: getLocalizedCanonicalUrl("en", "/blog"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...BLOG_CATEGORIES.map((category) => ({
      url: getLocalizedCanonicalUrl("en", `/blog/category/${category.slug}`),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  try {
    const posts = await getPublishedBlogSlugs();
    blogEntries = [
      ...blogEntries,
      ...posts
        .filter((post) => !post.nofollow)
        .map((post) => ({
          url: getLocalizedCanonicalUrl("en", `/blog/${post.slug}`),
          lastModified: new Date(post.updated_at),
          changeFrequency: "weekly" as const,
          priority: 0.75,
        })),
    ];
  } catch (error) {
    console.error("sitemap blog entries error:", error);
  }

  return [...staticEntries, ...blogEntries];
}
