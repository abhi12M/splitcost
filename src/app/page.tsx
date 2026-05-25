import type { Metadata } from "next";

import { buildFaqPageJsonLd } from "@/lib/faq";
import { buildMetadata } from "@/lib/seo";
import HomePage from "@/views/Index";

export const metadata: Metadata = buildMetadata({
  title:
    "Split Expenses App for Bill Sharing & Group Expense Tracking",
  description:
    "SplitCost is a smart split expenses app to track shared bills, manage group payments, split travel costs, and organise roommate or couple expenses easily.",
  path: "/",
});

export default function Page() {
  const faqJsonLd = buildFaqPageJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HomePage />
    </>
  );
}
