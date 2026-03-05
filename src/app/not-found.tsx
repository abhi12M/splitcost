import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import NotFound from "@/pages/NotFound";

export const metadata: Metadata = buildMetadata({
  title: "Page not found",
  description: "The page you are looking for does not exist on Splitcost.",
  path: "/404",
  noIndex: true,
});

export default function NotFoundPage() {
  return <NotFound />;
}


