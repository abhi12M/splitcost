import type { MetadataRoute } from "next";

import { getCanonicalUrl } from "@/lib/seo";

const BUILD_DATE = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const now = BUILD_DATE;

  return [
    {
      url: getCanonicalUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: getCanonicalUrl("/contact"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: getCanonicalUrl("/create-group"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: getCanonicalUrl("/privacy"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: getCanonicalUrl("/terms"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
