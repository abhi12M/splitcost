import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import CreateGroupPage from "@/views/AddGroup";

export const metadata: Metadata = buildMetadata({
  title: "Create group",
  description: "Start a new expense group, invite members with a shareable link, and track shared bills with flexible splits and multiple payer support.",
  path: "/create-group",
});

export default function Page() {
  return <CreateGroupPage />;
}


