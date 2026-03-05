import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import ContactPage from "@/pages/Contact";

export const metadata: Metadata = buildMetadata({
  title: "Contact",
  description: "Contact Splitcost for support, feedback, or partnership inquiries.",
  path: "/contact",
});

export default function Page() {
  return <ContactPage />;
}


