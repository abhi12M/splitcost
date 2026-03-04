import GroupResponsesPage from "@/pages/GroupDetails";

export default async function Page({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <GroupResponsesPage groupId={groupId} isAdminView />;
}
