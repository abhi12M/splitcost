import AddExpensePage from "@/pages/AddExpense";

export default async function AddExpenseRoute({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <AddExpensePage groupId={groupId} />;
}
