import type { MetadataRoute } from "next";

import { buildLocaleSitemapEntries } from "@/lib/seo-i18n";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildLocaleSitemapEntries();
}
