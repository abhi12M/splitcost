import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo";
import CreateGroupPage from "@/pages/AddGroup";

export const metadata: Metadata = buildMetadata({
  title: "Create group",
  description: "Start a new expense group and invite members with a shareable link.",
  path: "/create-group",
});

export default function Page() {
  return <CreateGroupPage />;
}


