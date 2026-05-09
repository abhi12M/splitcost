import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { buildMetadata } from "@/lib/seo";

const EditExpensePage = dynamic(() => import("@/views/EditExpense"));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string; expenseId: string }>;
}): Promise<Metadata> {
  const { groupId, expenseId } = await params;

  return buildMetadata({
    title: "Edit expense",
    description: "Edit an existing expense in this group.",
    path: `/group/${groupId}/edit-expense/${expenseId}`,
    noIndex: true,
  });
}

export default async function EditExpenseRoute({
  params,
}: {
  params: Promise<{ groupId: string; expenseId: string }>;
}) {
  const { groupId, expenseId } = await params;

  return <EditExpensePage groupId={groupId} expenseId={expenseId} />;
}
