// Browser calls to the activity API.
import type { ActivityCursor, ActivityEvent, ActivityFilter, ActivityPage } from "./types";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Activity request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export function fetchGroupActivity(
  groupId: string,
  { filter, limit, cursor }: { filter: ActivityFilter; limit: number; cursor?: ActivityCursor | null }
): Promise<ActivityPage> {
  const params = new URLSearchParams({ filter, limit: String(limit) });
  if (cursor) {
    params.set("cursorAt", cursor.createdAt);
    params.set("cursorId", cursor.id);
  }
  return getJson<ActivityPage>(`/api/groups/${groupId}/activity?${params}`);
}

export async function fetchExpenseActivity(expenseId: string): Promise<ActivityEvent[]> {
  const { events } = await getJson<{ events: ActivityEvent[] }>(`/api/expenses/${expenseId}/activity`);
  return events;
}
