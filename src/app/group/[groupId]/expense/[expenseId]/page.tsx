import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { buildMetadata } from "@/lib/seo";

const ExpenseDetailsPage = dynamic(() => import("@/pages/ExpenseDetails"));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string; expenseId: string }>;
}): Promise<Metadata> {
  const { groupId, expenseId } = await params;

  return buildMetadata({
    title: "Expense details",
    description: "View an expense and its split details.",
    path: `/group/${groupId}/expense/${expenseId}`,
    noIndex: true,
  });
}

export default async function ExpenseDetailsRoute({
  params,
}: {
  params: Promise<{ groupId: string; expenseId: string }>;
}) {
  const { groupId, expenseId } = await params;

  return <ExpenseDetailsPage groupId={groupId} expenseId={expenseId} />;
}
