import EditExpensePage from "@/pages/EditExpense";

export default async function EditExpenseRoute({
  params,
}: {
  params: Promise<{ groupId: string; expenseId: string }>;
}) {
  const { groupId, expenseId } = await params;

  return <EditExpensePage groupId={groupId} expenseId={expenseId} />;
}
