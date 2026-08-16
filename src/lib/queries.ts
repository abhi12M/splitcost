import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import {
  editExpense,
  getGroup,
  loadGroupDetails,
  type EditExpenseInterface,
  type GroupDashboardInterface,
  type GroupResponse,
  type UserInterface,
} from "@/lib/storage";
import { clearCachedExpense, readCachedExpense } from "@/lib/expenseCache";
import { DATA_STALE_TIME_MS } from "@/lib/queryConfig";

// Stable query keys so callers can invalidate from anywhere without typos.
export const queryKeys = {
  group: (groupId: string) => ["group", groupId] as const,
  groupDashboard: (groupId: string) => ["group-dashboard", groupId] as const,
  expense: (expenseId: string) => ["expense", expenseId] as const,
};

// Mirrors the sessionStorage cache TTL/freshness window. Within this window
// React Query will treat the data as fresh and skip refetching, which means
// navigating view -> edit (or vice versa) doesn't fire a duplicate network
// request just to re-render the same data we loaded a moment ago.
const EXPENSE_STALE_TIME = DATA_STALE_TIME_MS;

export async function fetchGroupDashboard(
  groupId: string
): Promise<GroupDashboardInterface | null> {
  return loadGroupDetails(groupId);
}

export function useGroupDashboardQuery(groupId: string) {
  return useQuery<GroupDashboardInterface | null>({
    queryKey: queryKeys.groupDashboard(groupId),
    queryFn: () => fetchGroupDashboard(groupId),
    enabled: Boolean(groupId),
    staleTime: GROUP_STALE_TIME,
  });
}

// Returns the group for `groupId`, hydrating from the dashboard query's
// cache when possible. The dashboard endpoint (`GET /api/groups/:id/dashboard`)
// already returns the group inline, so a navigation from the dashboard to
// the Add Expense / Edit Group pages can render instantly with no extra
// network request. We still fall back to `GET /api/groups/:id` for direct
// URLs / hard reloads where the dashboard cache is empty.
const GROUP_STALE_TIME = DATA_STALE_TIME_MS;

export function useGroupQuery(groupId: string) {
  const queryClient = useQueryClient();
  return useQuery<GroupResponse | null>({
    queryKey: queryKeys.group(groupId),
    queryFn: () => getGroup(groupId),
    enabled: Boolean(groupId),
    staleTime: GROUP_STALE_TIME,
    initialData: () => {
      const dashboard = queryClient.getQueryData<GroupDashboardInterface | null>(
        queryKeys.groupDashboard(groupId)
      );
      return dashboard?.group ?? undefined;
    },
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(queryKeys.groupDashboard(groupId))?.dataUpdatedAt,
  });
}

export function useExpenseQuery(expenseId: string) {
  return useQuery<EditExpenseInterface | null>({
    queryKey: queryKeys.expense(expenseId),
    queryFn: () => editExpense(expenseId),
    enabled: Boolean(expenseId),
    staleTime: EXPENSE_STALE_TIME,
    // Hydrate from sessionStorage on the very first mount of the tab so a
    // hard reload between view and edit also avoids a network round-trip
    // when the data is still fresh. We pass the original `cachedAt` so
    // React Query knows exactly how stale it is.
    initialData: () => readCachedExpense(expenseId)?.payload ?? undefined,
    initialDataUpdatedAt: () => readCachedExpense(expenseId)?.cachedAt,
  });
}

function patchUserName(
  user: UserInterface | null,
  nameById: Map<string, string>
): UserInterface | null {
  if (!user) return user;
  const name = nameById.get(user.id);
  return name ? { ...user, name } : user;
}

/** Merge an updated group into the dashboard cache (member names in expenses). */
function patchDashboardWithGroup(
  current: GroupDashboardInterface | null | undefined,
  group: GroupResponse
): GroupDashboardInterface | null | undefined {
  if (!current) return current;

  const nameById = new Map(group.members.map((member) => [member.id, member.name]));

  return {
    group,
    expenses: current.expenses.map((expense) => ({
      ...expense,
      paidBy: patchUserName(expense.paidBy, nameById),
      payers: expense.payers?.map((payer) => ({
        ...payer,
        user: patchUserName(payer.user, nameById)!,
      })),
      participants: expense.participants.map((participant) => ({
        ...participant,
        user: patchUserName(participant.user, nameById)!,
      })),
    })),
  };
}

/** Truthy placeholder until dashboard refetch returns the real storage path. */
const DASHBOARD_ATTACHMENT_PRESENT = "attached";

/** Update attachment indicator for one expense in the dashboard list cache. */
export function patchExpenseAttachmentInDashboard(
  queryClient: QueryClient,
  groupId: string,
  expenseId: string,
  hasAttachment: boolean
) {
  const path = hasAttachment ? DASHBOARD_ATTACHMENT_PRESENT : null;

  queryClient.setQueryData<GroupDashboardInterface | null>(
    queryKeys.groupDashboard(groupId),
    (current) => {
      if (!current) return current;

      return {
        ...current,
        expenses: current.expenses.map((expense) =>
          expense.id === expenseId
            ? {
                ...expense,
                attachmentDataUrl: path,
                attachment_data_url: path,
              }
            : expense
        ),
      };
    }
  );
}

/** Immediately sync group + dashboard caches after a group metadata/member mutation. */
export function applyGroupResponseToCache(
  queryClient: QueryClient,
  groupId: string,
  group: GroupResponse
) {
  queryClient.setQueryData(queryKeys.group(groupId), group);
  queryClient.setQueryData<GroupDashboardInterface | null>(
    queryKeys.groupDashboard(groupId),
    (current) => patchDashboardWithGroup(current, group)
  );
}

// Convenience helper: invalidate every query that depends on a group's
// dashboard or member list. Mutations (add / update / delete expense, settle up,
// edit group, etc.) should call this after a successful save.
export async function invalidateGroupDashboard(
  queryClient: QueryClient,
  groupId: string
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.groupDashboard(groupId) }),
  ]);
}

/** Invalidate and refetch group data so the next screen shows fresh members. */
export async function refreshGroupData(
  queryClient: QueryClient,
  groupId: string
) {
  await invalidateGroupDashboard(queryClient, groupId);
  await queryClient.refetchQueries({ queryKey: queryKeys.groupDashboard(groupId) });
}

export function invalidateExpense(
  queryClient: QueryClient,
  expenseId: string
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.expense(expenseId),
  });
}

// After a successful delete, the resource no longer exists. Do NOT
// `invalidate` (that would refetch `GET /api/expenses/:id` and surface a
// 404 in the network panel). Remove the entry from memory + sessionStorage
// instead.
export function evictExpense(
  queryClient: QueryClient,
  expenseId: string
) {
  queryClient.removeQueries({ queryKey: queryKeys.expense(expenseId) });
  clearCachedExpense(expenseId);
}
