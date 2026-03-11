import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import TermsPage from "@/pages/Terms";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description:
    "Review the Splitcost terms of service for using the expense tracker and shared group features.",
  path: "/terms",
});

export default function Page() {
  return <TermsPage />;
}


