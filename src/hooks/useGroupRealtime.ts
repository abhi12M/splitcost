"use client";

import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { getRealtimeOriginSessionId } from "@/lib/realtime/originSession";
import {
  GROUP_CHANGES_EVENT,
  GROUP_DELETED_EVENT,
  groupChangesChannel,
  type GroupChanges,
  type GroupDeleted,
} from "@/lib/realtime/groupChanges";

type ExpenseRow = { id?: string; origin_session_id?: string | null; revision?: number };

type Options = {
  groupId: string;
  onExpenseChange: (event: "INSERT" | "UPDATE" | "DELETE", expenseId: string) => void;
  onGroupDeleted: () => void;
};

/**
 * One narrowly-filtered subscription per mounted group screen. Expense events
 * are hints: callers reload their canonical API payload before updating UI.
 * Member and group edits arrive through useGroupChanges instead.
 */
export function useGroupRealtime({ groupId, onExpenseChange, onGroupDeleted }: Options) {
  const onExpenseChangeRef = useRef(onExpenseChange);
  const onGroupDeletedRef = useRef(onGroupDeleted);
  onExpenseChangeRef.current = onExpenseChange;
  onGroupDeletedRef.current = onGroupDeleted;

  useEffect(() => {
    if (!groupId) return;
    const ownSessionId = getRealtimeOriginSessionId();

    const channel = supabase
      .channel(`group-realtime:${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `group_id=eq.${groupId}` },
        (payload: RealtimePostgresChangesPayload<ExpenseRow>) => {
          const next = payload.new as ExpenseRow;
          const previous = payload.old as ExpenseRow;
          const row = (next.id ? next : previous) as ExpenseRow;
          if (!row.id || row.origin_session_id === ownSessionId) return;
          onExpenseChangeRef.current(payload.eventType, row.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "groups", filter: `id=eq.${groupId}` },
        () => onGroupDeletedRef.current()
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [groupId]);
}

/** `revision` is the expense's revision after an UPDATE, when the event carries it. */
export function useExpenseRealtime(
  expenseId: string,
  onChange: (event: "UPDATE" | "DELETE", revision?: number) => void
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!expenseId) return;
    const ownSessionId = getRealtimeOriginSessionId();
    const channel = supabase
      .channel(`expense-realtime:${expenseId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `id=eq.${expenseId}` },
        (payload: RealtimePostgresChangesPayload<ExpenseRow>) => {
          if (payload.eventType === "INSERT") return;
          const next = payload.new as ExpenseRow;
          const previous = payload.old as ExpenseRow;
          const row = (next.id ? next : previous) as ExpenseRow;
          if (payload.eventType === "UPDATE" && row.origin_session_id === ownSessionId) return;
          onChangeRef.current(
            payload.eventType as "UPDATE" | "DELETE",
            typeof next.revision === "number" ? next.revision : undefined
          );
        }
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [expenseId]);
}

/**
 * Receives the change broadcast by the group update API (member additions,
 * removals, renames, and group name or currency), so a screen can apply it
 * without refetching the group. `onDeleted` fires when the group is deleted
 * in another session. The tab that made the change ignores it.
 */
export function useGroupChanges(
  groupId: string,
  onChange: (changes: GroupChanges) => void,
  onDeleted?: () => void
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onDeletedRef = useRef(onDeleted);
  onDeletedRef.current = onDeleted;

  useEffect(() => {
    if (!groupId) return;
    const ownSessionId = getRealtimeOriginSessionId();

    const channel = supabase
      .channel(groupChangesChannel(groupId))
      .on("broadcast", { event: GROUP_DELETED_EVENT }, ({ payload }) => {
        const deleted = payload as GroupDeleted;
        if (deleted.originSessionId && deleted.originSessionId === ownSessionId) return;
        onDeletedRef.current?.();
      })
      .on("broadcast", { event: GROUP_CHANGES_EVENT }, ({ payload }) => {
        const changes = payload as GroupChanges;
        if (changes.originSessionId && changes.originSessionId === ownSessionId) return;
        onChangeRef.current({
          added: changes.added ?? [],
          removed: changes.removed ?? [],
          renamed: changes.renamed ?? [],
          name: changes.name,
          currency: changes.currency,
          revision: changes.revision,
          originSessionId: changes.originSessionId ?? null,
        });
      })
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [groupId]);
}
