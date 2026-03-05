import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import HomePage from "@/pages/Index";

export const metadata: Metadata = buildMetadata({
  title: "Split expenses with friends",
  description:
    "Create groups, add expenses, and settle balances in seconds with Splitcost.",
  path: "/",
});

export default function Page() {
  return <HomePage />;
}
