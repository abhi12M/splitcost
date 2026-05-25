import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import GroupsPage from "@/views/Groups";

export const metadata: Metadata = buildMetadata({
  title: "My Groups",
  description:
    "Open your recent expense groups and keep tracking shared bills with friends, roommates, and travel groups.",
  path: "/groups",
  noIndex: true,
});

export default function Page() {
  return <GroupsPage />;
}
