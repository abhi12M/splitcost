import GroupResponsesPage from "@/pages/GroupDetails";

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  return <GroupResponsesPage groupId={groupId} />;
}
