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
} from "@/lib/storage";
import { clearCachedExpense, readCachedExpense } from "@/lib/expenseCache";

// Stable query keys so callers can invalidate from anywhere without typos.
export const queryKeys = {
  group: (groupId: string) => ["group", groupId] as const,
  groupDashboard: (groupId: string) => ["group-dashboard", groupId] as const,
  expense: (expenseId: string) => ["expense", expenseId] as const,
  groupSummaries: (groupIds: string[]) =>
    ["group-summaries", [...groupIds].sort().join("|")] as const,
};

// Mirrors the sessionStorage cache TTL/freshness window. Within this window
// React Query will treat the data as fresh and skip refetching, which means
// navigating view -> edit (or vice versa) doesn't fire a duplicate network
// request just to re-render the same data we loaded a moment ago.
const EXPENSE_STALE_TIME = 30_000;

export async function fetchGroupDashboard(
  groupId: string
): Promise<GroupDashboardInterface | null> {
  return loadGroupDetails(groupId);
}

// Returns the group for `groupId`, hydrating from the dashboard query's
// cache when possible. The dashboard endpoint (`GET /api/groups/:id/dashboard`)
// already returns the group inline, so a navigation from the dashboard to
// the Add Expense / Edit Group pages can render instantly with no extra
// network request. We still fall back to `GET /api/groups/:id` for direct
// URLs / hard reloads where the dashboard cache is empty.
const GROUP_STALE_TIME = 30_000;

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

// Convenience helper: invalidate every query that depends on a group's
// dashboard data. Mutations (add / update / delete expense, settle up, etc.)
// should call this after a successful save so the dashboard refreshes in the
// background without forcing the user to wait on a re-fetch.
export function invalidateGroupDashboard(
  queryClient: QueryClient,
  groupId: string
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.groupDashboard(groupId),
  });
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
