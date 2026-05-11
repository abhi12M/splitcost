import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import PrivacyPage from "@/views/Privacy";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "Learn how Splitcost handles expense data, analytics, storage, and privacy choices.",
  path: "/privacy",
});

export default function Page() {
  return <PrivacyPage />;
}


