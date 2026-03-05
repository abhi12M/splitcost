import type { MetadataRoute } from "next";

import { getCanonicalUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/faq", "/contact", "/privacy", "/terms"],
        disallow: ["/admin-ajdsahsh3", "/group/", "/create-group"],
      },
    ],
    sitemap: getCanonicalUrl("/sitemap.xml"),
    host: getCanonicalUrl("/"),
  };
}
