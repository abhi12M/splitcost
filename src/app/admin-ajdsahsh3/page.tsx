import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { buildMetadata } from "@/lib/seo";

const HomePage = dynamic(() => import("@/pages/Index"));

export const metadata: Metadata = buildMetadata({
  title: "Admin",
  description: "Administrative dashboard for Splitcost groups.",
  path: "/admin-ajdsahsh3",
  noIndex: true,
});

export default function Page() {
  return <HomePage adminMode />;
}
