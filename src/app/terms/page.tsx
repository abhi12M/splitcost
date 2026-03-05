import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import TermsPage from "@/pages/Terms";

export const metadata: Metadata = buildMetadata({
  title: "Terms and conditions",
  description: "Review Splitcost terms and conditions for using the platform.",
  path: "/terms",
});

export default function Page() {
  return <TermsPage />;
}


