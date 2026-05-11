import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { buildMetadata } from "@/lib/seo";

const AddExpensePage = dynamic(() => import("@/views/AddExpense"));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  const { groupId } = await params;

  return buildMetadata({
    title: "Add expense",
    description: "Add a new shared expense for this group.",
    path: `/group/${groupId}/add-expense`,
    noIndex: true,
  });
}

export default async function AddExpenseRoute({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <AddExpensePage groupId={groupId} />;
}
