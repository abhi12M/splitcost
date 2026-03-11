import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import HomePage from "@/pages/Index";

export const metadata: Metadata = buildMetadata({
  title: "Split Expenses With Friends, Roommates, and Travel Groups",
  description:
    "Splitcost helps you split expenses, track shared bills, and settle balances for friends, roommates, trips, and group plans without sign-up.",
  path: "/",
});

export default function Page() {
  return <HomePage />;
}
