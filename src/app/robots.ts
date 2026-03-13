import type { MetadataRoute } from "next";

import { ADMIN_PARENT_PATH } from "@/lib/constants";
import { getCanonicalUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [ADMIN_PARENT_PATH, `${ADMIN_PARENT_PATH}/`, "/group/", "/group/*"],
      },
    ],
    sitemap: getCanonicalUrl("/sitemap.xml"),
    host: getCanonicalUrl("/"),
  };
}
