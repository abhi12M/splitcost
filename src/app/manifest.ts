import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fdfbf7",
    theme_color: "#2ea786",
    orientation: "portrait",
    id: getSiteUrl(),
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/favicon.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
    ],
  };
}
