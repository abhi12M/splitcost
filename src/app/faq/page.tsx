import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import FAQPage from "@/pages/FAQ";

export const metadata: Metadata = buildMetadata({
  title: "FAQ",
  description: "Read answers to common questions about Splitcost and expense sharing.",
  path: "/faq",
});

export default function Page() {
  return <FAQPage />;
}


