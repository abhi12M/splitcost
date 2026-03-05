import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import PrivacyPage from "@/pages/Privacy";

export const metadata: Metadata = buildMetadata({
  title: "Privacy policy",
  description:
    "Learn how Splitcost handles your data, privacy choices, and analytics usage.",
  path: "/privacy",
});

export default function Page() {
  return <PrivacyPage />;
}


