import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import HomePage from "@/views/Index";

export const metadata: Metadata = buildMetadata({
  title:
    "Split Expenses & Track Shared Bills With Friends, Roommates, and Trips",
  description:
    "SplitCost is a free group expense tracker for friends, roommates, couples, and travel groups. Split bills equally, by percent, or with custom shares, support multiple payers per expense, edit group details, see balances in real time, and settle up in the fewest payments — no sign-up required.",
  path: "/",
  keywords: [
    "split expenses",
    "expense splitter",
    "group expense tracker",
    "trip expense tracker",
    "roommate expense tracker",
    "bill split calculator",
    "shared expense app",
    "settle up app",
    "split bills with friends",
    "travel expense app",
    "multiple payers expense tracker",
    "shared expense app no signup",
    "edit group expenses",
    "split rent and utilities",
    "vacation expense tracker",
    "free splitwise alternative",
    "shared bills calculator",
  ],
});

export default function Page() {
  return <HomePage />;
}
