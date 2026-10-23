// Persistence for activity events: the only code that touches `activity_events`.
import "server-only";

import type { Json } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  ACTIVITY_FILTER_KINDS,
  type ActivityCursor,
  type ActivityEvent,
  type ActivityFilter,
  type ActivityPage,
  type NewActivityEvent,
} from "../types";

type ActivityRow = {
  id: string;
  group_id: string;
  expense_id: string | null;
  kind: string;
  data: Json;
  actor_name: string | null;
  created_at: string;
};

const COLUMNS = "id, group_id, expense_id, kind, data, actor_name, created_at";

function toEvent(row: ActivityRow): ActivityEvent {
  return {
    id: row.id,
    groupId: row.group_id,
    expenseId: row.expense_id,
    kind: row.kind,
    data: row.data,
    actorName: row.actor_name,
    createdAt: row.created_at,
  } as ActivityEvent;
}

/**
 * Stores events after the change they describe has been saved. Activity is a
 * record of the change, not part of it: a failure here is logged and never
 * fails or undoes the user's save.
 */
export async function recordActivity(events: NewActivityEvent[]): Promise<void> {
  if (!events.length) return;
  const { error } = await supabaseAdmin.from("activity_events").insert(
    events.map((event) => ({
      group_id: event.groupId,
      expense_id: event.expenseId ?? null,
      kind: event.kind,
      data: event.data as unknown as Json,
      origin_session_id: event.originSessionId ?? null,
      // Left out (not null) when absent, so the column default applies.
      ...(event.createdAt ? { created_at: event.createdAt } : {}),
    }))
  );
  if (error) console.error("recordActivity error:", error, events.map((e) => e.kind));
}

export async function listGroupActivity(
  groupId: string,
  { filter, cursor, limit }: { filter: ActivityFilter; cursor: ActivityCursor | null; limit: number }
): Promise<ActivityPage> {
  let query = supabaseAdmin
    .from("activity_events")
    .select(COLUMNS)
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    // One extra row tells whether there is another page.
    .limit(limit + 1);

  if (filter !== "all") query = query.in("kind", ACTIVITY_FILTER_KINDS[filter]);
  if (cursor) {
    // Keyset paging: strictly older than the last row shown (ties broken by id).
    query = query.or(
      `created_at.lt."${cursor.createdAt}",and(created_at.eq."${cursor.createdAt}",id.lt.${cursor.id})`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as ActivityRow[];
  const events = rows.slice(0, limit).map(toEvent);
  const last = events[events.length - 1];
  return {
    events,
    nextCursor: rows.length > limit && last ? { createdAt: last.createdAt, id: last.id } : null,
  };
}

/** One expense's history, newest first. */
export async function listExpenseActivity(expenseId: string, limit = 100): Promise<ActivityEvent[]> {
  const { data, error } = await supabaseAdmin
    .from("activity_events")
    .select(COLUMNS)
    .eq("expense_id", expenseId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as ActivityRow[]).map(toEvent);
}
