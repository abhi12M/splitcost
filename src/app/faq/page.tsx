import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import FAQPage from "@/pages/FAQ";

export const metadata: Metadata = buildMetadata({
  title: "Expense Splitting FAQ",
  description:
    "Read common questions about Splitcost, including how to split expenses, track group bills, share links, and settle balances.",
  path: "/faq",
});

export default function Page() {
  return <FAQPage />;
}


