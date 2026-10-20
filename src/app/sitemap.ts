import type { MetadataRoute } from "next";

import { getPublishedBlogPaths } from "@/lib/blog/queries";
import { buildLocaleSitemapEntries } from "@/lib/seo-i18n";
import { getCanonicalUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogPaths = await getPublishedBlogPaths();
  const blogDates = blogPaths.map((blog) => {
    const value = blog.updated_at ?? blog.published_at;
    return value ? new Date(value) : undefined;
  });
  // The blog index changes when any post does.
  const newestBlogDate = blogDates.reduce<Date | undefined>(
    (newest, date) => (date && (!newest || date > newest) ? date : newest),
    undefined
  );

  return [
    ...buildLocaleSitemapEntries(),
    {
      url: getCanonicalUrl("/en/blog"),
      lastModified: newestBlogDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...blogPaths.map((blog, index) => ({
      url: getCanonicalUrl(`/en/blog/${blog.slug}`),
      lastModified: blogDates[index],
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
