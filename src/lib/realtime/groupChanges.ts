// Shared by the group update API (sender) and open group screens (receivers).
// The broadcast carries the full change, so receivers apply it to the data
// they already hold instead of refetching the group.

import type { GroupDashboardInterface, GroupResponse, UserInterface } from "@/lib/storage";

export type GroupChangeMember = { id: string; name: string };
export type GroupMemberRename = { id: string; from: string; to: string };
export type GroupValueChange = { from: string; to: string };

export type GroupChanges = {
  added: GroupChangeMember[];
  removed: GroupChangeMember[];
  renamed: GroupMemberRename[];
  /** Group-level fields that changed; omitted when unchanged. */
  name?: GroupValueChange;
  currency?: GroupValueChange;
  /** The group's revision after this change; editors save against it. */
  revision?: number;
  /** Tab that made the change, so it can ignore its own broadcast. */
  originSessionId: string | null;
};

export const GROUP_CHANGES_EVENT = "group-changed";

/** Sent on the same channel when the group is deleted. */
export const GROUP_DELETED_EVENT = "group-deleted";
export type GroupDeleted = {
  /** Tab that deleted the group, so it can ignore its own broadcast. */
  originSessionId: string | null;
};

export function groupChangesChannel(groupId: string) {
  return `group-changes:${groupId}`;
}

export function applyMemberChanges(members: UserInterface[], changes: GroupChanges): UserInterface[] {
  const removedIds = new Set(changes.removed.map((member) => member.id));
  const renames = new Map(changes.renamed.map((rename) => [rename.id, rename.to]));
  const next = members
    .filter((member) => !removedIds.has(member.id))
    .map((member) => (renames.has(member.id) ? { ...member, name: renames.get(member.id)! } : member));
  for (const member of changes.added) {
    if (!next.some((existing) => existing.id === member.id)) next.push(member);
  }
  return next;
}

export function applyGroupChangesToGroup(group: GroupResponse, changes: GroupChanges): GroupResponse {
  return {
    ...group,
    name: changes.name?.to ?? group.name,
    currency: changes.currency?.to ?? group.currency,
    // Max, so replaying an older change never moves the revision backwards.
    revision:
      changes.revision === undefined || group.revision === undefined
        ? (changes.revision ?? group.revision)
        : Math.max(changes.revision, group.revision),
    members: applyMemberChanges(group.members, changes),
  };
}

/**
 * Applies a change to a loaded dashboard. Removed members are never on an
 * expense (the API refuses to remove them), so only renames reach expenses.
 */
export function applyGroupChangesToDashboard(
  dashboard: GroupDashboardInterface,
  changes: GroupChanges
): GroupDashboardInterface {
  const renames = new Map(changes.renamed.map((rename) => [rename.id, rename.to]));
  const renameUser = <T extends UserInterface>(user: T): T =>
    renames.has(user.id) ? { ...user, name: renames.get(user.id)! } : user;

  return {
    ...dashboard,
    group: applyGroupChangesToGroup(dashboard.group, changes),
    expenses: renames.size
      ? dashboard.expenses.map((expense) => ({
          ...expense,
          paidBy: expense.paidBy ? renameUser(expense.paidBy) : expense.paidBy,
          payers: expense.payers?.map((payer) => ({ ...payer, user: renameUser(payer.user) })),
          participants: expense.participants.map((participant) => ({
            ...participant,
            user: renameUser(participant.user),
          })),
        }))
      : dashboard.expenses,
  };
}
