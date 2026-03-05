import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { buildMetadata } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase/server";

const GroupResponsesPage = dynamic(() => import("@/pages/GroupDetails"));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  const { groupId } = await params;

  const fallback = buildMetadata({
    title: "Group expenses",
    description: "Track balances, expenses, and settlements for this expense group.",
    path: `/group/${groupId}`,
    noIndex: true,
  });

  const { data, error } = await supabaseAdmin
    .from("groups")
    .select("name,currency")
    .eq("id", groupId)
    .maybeSingle();

  if (error || !data?.name) {
    return fallback;
  }

  return buildMetadata({
    title: `${data.name} | Group expenses`,
    description: `View ${data.name} expenses, balances, and settlements in ${data.currency}.`,
    path: `/group/${groupId}`,
    noIndex: true,
  });
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <GroupResponsesPage groupId={groupId} />;
}
