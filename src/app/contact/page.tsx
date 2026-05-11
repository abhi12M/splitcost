import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import ContactPage from "@/views/Contact";

export const metadata: Metadata = buildMetadata({
  title: "Contact Splitcost Support",
  description:
    "Contact Splitcost for expense tracker support, product feedback, bug reports, or partnership inquiries.",
  path: "/contact",
});

export default function Page() {
  return <ContactPage />;
}


