"use client";

import { useEffect, useRef } from "react";

import { supabase } from "@/integrations/supabase/client";
import { getRealtimeOriginSessionId } from "@/lib/realtime/originSession";
import {
  GROUP_CHANGES_EVENT,
  GROUP_DELETED_EVENT,
  groupChangesChannel,
  type GroupChanges,
  type GroupDeleted,
} from "@/lib/realtime/groupChanges";
import {
  EXPENSE_CHANGED_EVENT,
  expenseChangesChannel,
  singleExpenseChannel,
  type ExpenseBroadcast,
  type ReceiptChange,
} from "@/lib/realtime/expenseChanges";

type Options = {
  groupId: string;
  onExpenseChange: (event: "INSERT" | "UPDATE" | "DELETE", expenseId: string, revision?: number) => void;
  /**
   * The channel reconnected (e.g. the phone slept). Broadcasts sent while it
   * was down are lost, so the screen should reload.
   */
  onReconnect?: () => void;
};

/**
 * One broadcast subscription per mounted group screen. Expense events
 * are hints: callers reload their canonical API payload before updating UI.
 * Group deletion arrives through useGroupChanges instead.
 */
export function useGroupRealtime({ groupId, onExpenseChange, onReconnect }: Options) {
  const onExpenseChangeRef = useRef(onExpenseChange);
  onExpenseChangeRef.current = onExpenseChange;
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    if (!groupId) return;
    const ownSessionId = getRealtimeOriginSessionId();
    let subscribedOnce = false;

    const channel = supabase
      .channel(expenseChangesChannel(groupId))
      .on("broadcast", { event: EXPENSE_CHANGED_EVENT }, ({ payload }) => {
        const data = payload as ExpenseBroadcast;
        if (data.originSessionId === ownSessionId) return;
        onExpenseChangeRef.current(data.event, data.expenseId, data.revision);
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        if (subscribedOnce) onReconnectRef.current?.();
        subscribedOnce = true;
      });

    return () => void supabase.removeChannel(channel);
  }, [groupId]);
}

/**
 * Listens for changes to a single expense via broadcast. `receipt` is set when
 * the change was only to the expense's receipt.
 */
export function useExpenseRealtime(
  expenseId: string,
  onChange: (event: "UPDATE" | "DELETE", revision?: number, receipt?: ReceiptChange) => void
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!expenseId) return;
    const ownSessionId = getRealtimeOriginSessionId();
    const channel = supabase
      .channel(singleExpenseChannel(expenseId))
      .on("broadcast", { event: EXPENSE_CHANGED_EVENT }, ({ payload }) => {
        const data = payload as ExpenseBroadcast;
        if (data.event === "INSERT") return;
        if (data.event === "UPDATE" && data.originSessionId === ownSessionId) return;
        onChangeRef.current(data.event, data.revision, data.receipt);
      })
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
