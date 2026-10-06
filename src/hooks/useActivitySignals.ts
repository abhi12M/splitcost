import { useMemo } from "react";
import type { GroupDashboardInterface } from "@/lib/storage";

/**
 * Derives, from the dashboard data a screen already keeps live (realtime
 * expense reloads and in-place group changes), when activity should reload
 * and which expenses can still be opened from the feed.
 */
export function useActivitySignals(dashboard: GroupDashboardInterface | null | undefined) {
  return useMemo(() => {
    const expenses = dashboard?.expenses ?? [];
    const group = dashboard?.group;
    const refreshKey = [
      group?.revision ?? "",
      group?.name ?? "",
      group?.members.map((m) => `${m.id}:${m.name}`).join(",") ?? "",
      expenses.map((e) => `${e.id}:${e.updatedAt ?? ""}`).join(","),
    ].join("|");
    return { refreshKey, existingExpenseIds: new Set(expenses.map((e) => e.id)) as ReadonlySet<string> };
  }, [dashboard]);
}
